import { supabase } from '$lib/supabase';
import type {
	Attendee,
	AttendeeRegistrationData,
	ServiceResponse,
	SearchResult,
	CheckedInAttendee,
	Facilitator,
	FacilitatorWithAttendees
} from '$lib/types/attendance';
import { validateRegistrationForm } from '$lib/utils/validation';

/**
 * Register a new attendee and immediately check them in for today's service
 */
export async function registerNewAttendeeAndCheckIn(
	data: AttendeeRegistrationData
): Promise<ServiceResponse<Attendee>> {
	try {
		// Validate using shared validation utility
		const validation = validateRegistrationForm(data);
		if (!validation.isValid) {
			return {
				success: false,
				error: validation.error || 'Please fill in all required fields.'
			};
		}

		// Insert new attendee
		const { data: attendee, error: attendeeError } = await supabase
			.from('attendees')
			.insert({
				first_name: data.first_name.trim(),
				last_name: data.last_name.trim(),
				contact_number: data.contact_number.trim(),
				email: data.email?.trim() || null,
				birthday: data.birthday || null,
				school_name: data.school_name.trim(),
				barangay: data.barangay.trim(),
				city: data.city.trim(),
				social_media_name: data.social_media_name?.trim() || null,
				gender: data.gender,
				is_dgroup_member: data.is_dgroup_member,
				dgroup_leader_name: data.is_dgroup_member && data.dgroup_leader_name
					? data.dgroup_leader_name.trim()
					: null,
				is_first_timer: true
			})
			.select()
			.single();

		if (attendeeError) {
			console.error('Supabase error:', attendeeError);
			// Handle duplicate contact number
			if (attendeeError.code === '23505') {
				return {
					success: false,
					error: 'This contact number is already registered. Please use the returning user check-in instead.'
				};
			}
			// Handle RLS policy errors
			if (attendeeError.code === '42501' || attendeeError.message?.includes('permission denied')) {
				return {
					success: false,
					error: 'Permission denied. Please check your Supabase Row Level Security policies.'
				};
			}
			// Handle table not found
			if (attendeeError.code === '42P01' || attendeeError.message?.includes('does not exist')) {
				return {
					success: false,
					error: 'Database tables not found. Please run the SQL schema in your Supabase SQL Editor.'
				};
			}
			return {
				success: false,
				error: attendeeError.message || `Failed to register attendee. Error code: ${attendeeError.code || 'unknown'}`
			};
		}

		if (!attendee) {
			return {
				success: false,
				error: 'Failed to create attendee record.'
			};
		}

		// Create attendance log entry for today
		const today = new Date().toISOString().split('T')[0];
		const { error: attendanceError } = await supabase.from('attendance_log').insert({
			attendee_id: attendee.id,
			service_date: today
		});

		if (attendanceError) {
			console.error('Failed to create attendance log:', attendanceError);
			return {
				success: false,
				error: `Attendee registered but check-in failed: ${attendanceError.message || 'Unknown error'}`
			};
		}

		// Auto-assign facilitator if not already assigned
		if (!attendee.facilitator_id) {
			await assignFacilitatorToAttendee(attendee.id, attendee.gender as 'Male' | 'Female');
			// Fetch updated attendee data
			const { data: updatedAttendee } = await supabase
				.from('attendees')
				.select('*')
				.eq('id', attendee.id)
				.single();
			if (updatedAttendee) {
				return {
					success: true,
					data: updatedAttendee
				};
			}
		}

		return {
			success: true,
			data: attendee
		};
	} catch (error) {
		console.error('Error in registerNewAttendeeAndCheckIn:', error);
		// Handle network/fetch errors
		if (error instanceof TypeError && error.message.includes('fetch')) {
			return {
				success: false,
				error: 'Network error: Unable to connect to Supabase. Please check your internet connection and Supabase configuration.'
			};
		}
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

/**
 * Search for attendees by name or contact number (case-insensitive)
 */
export async function searchAttendees(searchString: string): Promise<ServiceResponse<SearchResult[]>> {
	try {
		if (!searchString || searchString.trim().length < 2) {
			return {
				success: true,
				data: []
			};
		}

		const searchTerm = searchString.trim();

		// Search across first_name, last_name, and contact_number using ILIKE
		// Supabase OR syntax: field.ilike.%term%,field2.ilike.%term%
		const { data, error } = await supabase
			.from('attendees')
			.select('id, first_name, last_name, contact_number')
			.or(
				`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%`
			)
			.limit(10)
			.order('first_name', { ascending: true });

		if (error) {
			return {
				success: false,
				error: error.message || 'Failed to search attendees.'
			};
		}

		// Transform data to include full_name
		const results: SearchResult[] =
			data?.map((attendee) => ({
				id: attendee.id,
				first_name: attendee.first_name,
				last_name: attendee.last_name,
				contact_number: attendee.contact_number,
				full_name: `${attendee.first_name} ${attendee.last_name}`
			})) || [];

		return {
			success: true,
			data: results
		};
	} catch (error) {
		console.error('Error in searchAttendees:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

/**
 * Check in an existing attendee for today's service
 */
export async function checkInAttendee(attendeeId: string): Promise<ServiceResponse<Attendee>> {
	try {
		if (!attendeeId) {
			return {
				success: false,
				error: 'Invalid attendee ID.'
			};
		}

		// Get today's date in YYYY-MM-DD format
		const today = new Date().toISOString().split('T')[0];

		// Check if already checked in today
		const { data: existingCheckIn, error: checkError } = await supabase
			.from('attendance_log')
			.select('id')
			.eq('attendee_id', attendeeId)
			.eq('service_date', today)
			.single();

		if (checkError && checkError.code !== 'PGRST116') {
			// PGRST116 is "not found" which is expected if not checked in
			return {
				success: false,
				error: checkError.message || 'Failed to check existing attendance.'
			};
		}

		if (existingCheckIn) {
			return {
				success: false,
				error: 'You are already checked in for today\'s service.'
			};
		}

		// Create attendance log entry
		const { error: attendanceError } = await supabase.from('attendance_log').insert({
			attendee_id: attendeeId,
			service_date: today
		});

		if (attendanceError) {
			// Handle duplicate check-in attempt (race condition)
			if (attendanceError.code === '23505') {
				return {
					success: false,
					error: 'You are already checked in for today\'s service.'
				};
			}
			return {
				success: false,
				error: attendanceError.message || 'Failed to check in.'
			};
		}

		// Fetch the attendee data to check if facilitator needs to be assigned
		const { data: attendee, error: attendeeError } = await supabase
			.from('attendees')
			.select('*')
			.eq('id', attendeeId)
			.single();

		if (attendeeError || !attendee) {
			// Check-in succeeded but couldn't fetch attendee data
			return {
				success: true,
				error: 'Checked in successfully, but could not retrieve attendee information.'
			};
		}

		// Auto-assign facilitator if not already assigned
		if (!attendee.facilitator_id) {
			await assignFacilitatorToAttendee(attendeeId, attendee.gender as 'Male' | 'Female');
			// Fetch updated attendee data
			const { data: updatedAttendee } = await supabase
				.from('attendees')
				.select('*')
				.eq('id', attendeeId)
				.single();
			if (updatedAttendee) {
				return {
					success: true,
					data: updatedAttendee
				};
			}
		}

		return {
			success: true,
			data: attendee
		};
	} catch (error) {
		console.error('Error in checkInAttendee:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

/**
 * Get all checked-in attendees for today's service
 */
export async function getCheckedInAttendeesToday(): Promise<ServiceResponse<CheckedInAttendee[]>> {
	try {
		const today = new Date().toISOString().split('T')[0];

		// Fetch attendance logs for today with attendee information
		const { data, error } = await supabase
			.from('attendance_log')
			.select(
				`
				id,
				attendee_id,
				check_in_time,
				attendees:attendee_id (
					id,
					first_name,
					last_name,
					contact_number
				)
			`
			)
			.eq('service_date', today)
			.order('check_in_time', { ascending: false });

		if (error) {
			console.error('Error fetching checked-in attendees:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch checked-in attendees.'
			};
		}

		// Transform the data to match CheckedInAttendee interface
		const checkedInAttendees: CheckedInAttendee[] =
			data?.map((log: any) => {
				const attendee = log.attendees;
				return {
					attendance_log_id: log.id,
					attendee_id: attendee.id,
					first_name: attendee.first_name,
					last_name: attendee.last_name,
					contact_number: attendee.contact_number,
					full_name: `${attendee.first_name} ${attendee.last_name}`,
					check_in_time: log.check_in_time
				};
			}) || [];

		return {
			success: true,
			data: checkedInAttendees
		};
	} catch (error) {
		console.error('Error in getCheckedInAttendeesToday:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

/**
 * Remove an attendee from today's attendance (undo check-in)
 */
export async function removeCheckIn(attendanceLogId: string): Promise<ServiceResponse<void>> {
	try {
		if (!attendanceLogId) {
			return {
				success: false,
				error: 'Invalid attendance log ID.'
			};
		}

		const { data, error } = await supabase
			.from('attendance_log')
			.delete()
			.eq('id', attendanceLogId)
			.select();

		if (error) {
			console.error('Error removing check-in:', error);
			// Handle RLS policy errors
			if (error.code === '42501' || error.message?.includes('permission denied')) {
				return {
					success: false,
					error: 'Permission denied. Please check your Supabase Row Level Security policies for DELETE operations.'
				};
			}
			return {
				success: false,
				error: error.message || 'Failed to remove check-in.'
			};
		}

		// Check if any rows were actually deleted
		if (!data || data.length === 0) {
			console.warn('No rows were deleted. This might be due to RLS policies.');
			return {
				success: false,
				error: 'No record was deleted. This might be due to missing DELETE permissions in your database policies.'
			};
		}

		return {
			success: true
		};
	} catch (error) {
		console.error('Error in removeCheckIn:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

/**
 * Check if an attendee is a facilitator (exists in facilitators table)
 */
export async function isFacilitator(attendeeId: string): Promise<boolean> {
	try {
		const { data, error } = await supabase
			.from('facilitators')
			.select('id')
			.eq('id', attendeeId)
			.single();

		return !error && data !== null;
	} catch (error) {
		console.error('Error in isFacilitator:', error);
		return false;
	}
}

/**
 * Get facilitators who have checked in today
 */
export async function getCheckedInFacilitators(): Promise<ServiceResponse<Facilitator[]>> {
	try {
		const today = new Date().toISOString().split('T')[0];

		// Get all checked-in attendee IDs for today
		const { data: attendanceLogs, error: attendanceError } = await supabase
			.from('attendance_log')
			.select('attendee_id')
			.eq('service_date', today);

		if (attendanceError) {
			return {
				success: false,
				error: attendanceError.message || 'Failed to fetch checked-in attendees.'
			};
		}

		if (!attendanceLogs || attendanceLogs.length === 0) {
			return {
				success: true,
				data: []
			};
		}

		// Extract unique attendee IDs
		const checkedInAttendeeIds = [...new Set(attendanceLogs.map((log) => log.attendee_id))];

		// Get all facilitators whose IDs are in the checked-in attendee list
		const { data: facilitators, error: facilitatorsError } = await supabase
			.from('facilitators')
			.select('*')
			.in('id', checkedInAttendeeIds)
			.order('first_name', { ascending: true });

		if (facilitatorsError) {
			return {
				success: false,
				error: facilitatorsError.message || 'Failed to fetch facilitators.'
			};
		}

		return {
			success: true,
			data: facilitators || []
		};
	} catch (error) {
		console.error('Error in getCheckedInFacilitators:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

/**
 * Get checked-in facilitators filtered by gender
 */
export async function getCheckedInFacilitatorsByGender(
	gender: 'Male' | 'Female'
): Promise<ServiceResponse<Facilitator[]>> {
	try {
		const checkedInResponse = await getCheckedInFacilitators();
		if (!checkedInResponse.success || !checkedInResponse.data) {
			return {
				success: false,
				error: checkedInResponse.error || 'Failed to fetch checked-in facilitators.'
			};
		}

		const facilitators = checkedInResponse.data.filter((f) => f.gender === gender);

		return {
			success: true,
			data: facilitators
		};
	} catch (error) {
		console.error('Error in getCheckedInFacilitatorsByGender:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

/**
 * Get all facilitators
 */
export async function getFacilitators(): Promise<ServiceResponse<Facilitator[]>> {
	try {
		const { data, error } = await supabase
			.from('facilitators')
			.select('*')
			.order('first_name', { ascending: true });

		if (error) {
			return {
				success: false,
				error: error.message || 'Failed to fetch facilitators.'
			};
		}

		return {
			success: true,
			data: data || []
		};
	} catch (error) {
		console.error('Error in getFacilitators:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

/**
 * Get facilitators filtered by gender
 */
export async function getFacilitatorsByGender(
	gender: 'Male' | 'Female'
): Promise<ServiceResponse<Facilitator[]>> {
	try {
		const { data, error } = await supabase
			.from('facilitators')
			.select('*')
			.eq('gender', gender)
			.order('first_name', { ascending: true });

		if (error) {
			return {
				success: false,
				error: error.message || 'Failed to fetch facilitators.'
			};
		}

		return {
			success: true,
			data: data || []
		};
	} catch (error) {
		console.error('Error in getFacilitatorsByGender:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

/**
 * Get a facilitator with their assigned attendees (checked in today)
 * Filters out facilitator attendees from the attendee list
 */
export async function getFacilitatorWithAttendees(
	facilitatorId: string
): Promise<ServiceResponse<FacilitatorWithAttendees>> {
	try {
		const today = new Date().toISOString().split('T')[0];

		// Get facilitator info
		const { data: facilitator, error: facilitatorError } = await supabase
			.from('facilitators')
			.select('*')
			.eq('id', facilitatorId)
			.single();

		if (facilitatorError || !facilitator) {
			return {
				success: false,
				error: facilitatorError?.message || 'Facilitator not found.'
			};
		}

		// Get all facilitator IDs to filter them out from attendees
		const { data: allFacilitators, error: facilitatorIdsError } = await supabase
			.from('facilitators')
			.select('id');
		
		const facilitatorIds = new Set<string>();
		if (!facilitatorIdsError && allFacilitators) {
			allFacilitators.forEach((f) => facilitatorIds.add(f.id));
		}

		// Get checked-in attendees for today assigned to this facilitator
		const { data: attendanceLogs, error: attendanceError } = await supabase
			.from('attendance_log')
			.select(
				`
				id,
				attendee_id,
				check_in_time,
				attendees:attendee_id (
					id,
					first_name,
					last_name,
					contact_number,
					facilitator_id
				)
			`
			)
			.eq('service_date', today)
			.eq('attendees.facilitator_id', facilitatorId)
			.order('check_in_time', { ascending: false });

		if (attendanceError) {
			return {
				success: false,
				error: attendanceError.message || 'Failed to fetch attendees.'
			};
		}

		// Transform the data, filtering out facilitator attendees
		const attendees: CheckedInAttendee[] =
			attendanceLogs
				?.filter((log: any) => {
					const attendee = log.attendees;
					// Exclude null attendees and attendees who are facilitators
					return attendee && !facilitatorIds.has(attendee.id);
				})
				.map((log: any) => {
					const attendee = log.attendees;
					return {
						attendance_log_id: log.id,
						attendee_id: attendee.id,
						first_name: attendee.first_name,
						last_name: attendee.last_name,
						contact_number: attendee.contact_number,
						full_name: `${attendee.first_name} ${attendee.last_name}`,
						check_in_time: log.check_in_time
					};
				}) || [];

		return {
			success: true,
			data: {
				...facilitator,
				attendees,
				attendee_count: attendees.length
			}
		};
	} catch (error) {
		console.error('Error in getFacilitatorWithAttendees:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

/**
 * Get all facilitators with their assigned attendees (checked in today)
 * Only returns facilitators who have checked in today
 * Filters out facilitator attendees from the attendee lists
 */
export async function getAllFacilitatorsWithAttendees(): Promise<
	ServiceResponse<FacilitatorWithAttendees[]>
> {
	try {
		// Only get facilitators who have checked in today
		const facilitatorsResponse = await getCheckedInFacilitators();
		if (!facilitatorsResponse.success || !facilitatorsResponse.data) {
			return {
				success: false,
				error: facilitatorsResponse.error || 'Failed to fetch facilitators.'
			};
		}

		const today = new Date().toISOString().split('T')[0];

		// Get all facilitator IDs to filter them out from attendees
		const { data: allFacilitators, error: facilitatorIdsError } = await supabase
			.from('facilitators')
			.select('id');
		
		const facilitatorIds = new Set<string>();
		if (!facilitatorIdsError && allFacilitators) {
			allFacilitators.forEach((f) => facilitatorIds.add(f.id));
		}

		// Get all checked-in attendees for today with their facilitator assignments
		const { data: attendanceLogs, error: attendanceError } = await supabase
			.from('attendance_log')
			.select(
				`
				id,
				attendee_id,
				check_in_time,
				attendees:attendee_id (
					id,
					first_name,
					last_name,
					contact_number,
					facilitator_id
				)
			`
			)
			.eq('service_date', today)
			.not('attendees.facilitator_id', 'is', null)
			.order('check_in_time', { ascending: false });

		if (attendanceError) {
			return {
				success: false,
				error: attendanceError.message || 'Failed to fetch attendees.'
			};
		}

		// Group attendees by facilitator_id, filtering out facilitator attendees
		const attendeesByFacilitator = new Map<string, CheckedInAttendee[]>();
		attendanceLogs?.forEach((log: any) => {
			const attendee = log.attendees;
			// Skip if attendee is null or if this attendee is a facilitator
			if (attendee && attendee.facilitator_id && !facilitatorIds.has(attendee.id)) {
				if (!attendeesByFacilitator.has(attendee.facilitator_id)) {
					attendeesByFacilitator.set(attendee.facilitator_id, []);
				}
				attendeesByFacilitator.get(attendee.facilitator_id)?.push({
					attendance_log_id: log.id,
					attendee_id: attendee.id,
					first_name: attendee.first_name,
					last_name: attendee.last_name,
					contact_number: attendee.contact_number,
					full_name: `${attendee.first_name} ${attendee.last_name}`,
					check_in_time: log.check_in_time
				});
			}
		});

		// Build result array - only include checked-in facilitators
		const result: FacilitatorWithAttendees[] = facilitatorsResponse.data.map((facilitator) => ({
			...facilitator,
			attendees: attendeesByFacilitator.get(facilitator.id) || [],
			attendee_count: attendeesByFacilitator.get(facilitator.id)?.length || 0
		}));

		return {
			success: true,
			data: result
		};
	} catch (error) {
		console.error('Error in getAllFacilitatorsWithAttendees:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

/**
 * Transfer an attendee to a different facilitator
 * Validates that the attendee is not a facilitator
 */
export async function transferAttendee(
	attendeeId: string,
	newFacilitatorId: string | null
): Promise<ServiceResponse<void>> {
	try {
		if (!attendeeId) {
			return {
				success: false,
				error: 'Invalid attendee ID.'
			};
		}

		// Validate that the attendee is not a facilitator
		const attendeeIsFacilitator = await isFacilitator(attendeeId);
		if (attendeeIsFacilitator) {
			return {
				success: false,
				error: 'Facilitators cannot be assigned to other facilitators.'
			};
		}

		// If newFacilitatorId is provided, validate gender match
		if (newFacilitatorId) {
			// Get attendee
			const { data: attendee, error: attendeeError } = await supabase
				.from('attendees')
				.select('gender')
				.eq('id', attendeeId)
				.single();

			if (attendeeError || !attendee) {
				return {
					success: false,
					error: 'Attendee not found.'
				};
			}

			// Get facilitator
			const { data: facilitator, error: facilitatorError } = await supabase
				.from('facilitators')
				.select('gender')
				.eq('id', newFacilitatorId)
				.single();

			if (facilitatorError || !facilitator) {
				return {
					success: false,
					error: 'Facilitator not found.'
				};
			}

			// Validate gender match
			if (attendee.gender !== facilitator.gender) {
				return {
					success: false,
					error: 'Cannot assign attendee to facilitator of different gender.'
				};
			}
		}

		// Update attendee's facilitator_id
		const { error: updateError } = await supabase
			.from('attendees')
			.update({ facilitator_id: newFacilitatorId })
			.eq('id', attendeeId);

		if (updateError) {
			return {
				success: false,
				error: updateError.message || 'Failed to transfer attendee.'
			};
		}

		return {
			success: true
		};
	} catch (error) {
		console.error('Error in transferAttendee:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

/**
 * Auto-assign a facilitator to an attendee based on gender (load balancing)
 * Skips assignment if attendee is a facilitator
 * Only uses facilitators who have checked in today
 */
export async function assignFacilitatorToAttendee(
	attendeeId: string,
	gender: 'Male' | 'Female'
): Promise<ServiceResponse<string | null>> {
	try {
		// Skip assignment if the attendee is a facilitator
		const attendeeIsFacilitator = await isFacilitator(attendeeId);
		if (attendeeIsFacilitator) {
			return {
				success: true,
				data: null // Facilitators don't get assigned to other facilitators
			};
		}

		// Get only checked-in facilitators for this gender
		const facilitatorsResponse = await getCheckedInFacilitatorsByGender(gender);
		if (!facilitatorsResponse.success || !facilitatorsResponse.data) {
			return {
				success: true,
				data: null // No checked-in facilitators available for this gender
			};
		}

		const facilitators = facilitatorsResponse.data;
		if (facilitators.length === 0) {
			return {
				success: true,
				data: null // No checked-in facilitators available for this gender
			};
		}

		// Get all facilitator IDs to filter them out when counting attendees
		const { data: allFacilitators, error: facilitatorIdsError } = await supabase
			.from('facilitators')
			.select('id');
		
		const facilitatorIds = new Set<string>();
		if (!facilitatorIdsError && allFacilitators) {
			allFacilitators.forEach((f) => facilitatorIds.add(f.id));
		}

		// Get count of assigned attendees for each facilitator (only checked in today, excluding facilitator attendees)
		const today = new Date().toISOString().split('T')[0];
		const { data: attendanceLogs, error: attendanceError } = await supabase
			.from('attendance_log')
			.select(
				`
				attendee_id,
				attendees:attendee_id (
					id,
					facilitator_id
				)
			`
			)
			.eq('service_date', today)
			.not('attendees.facilitator_id', 'is', null);

		// Count attendees per facilitator (excluding facilitator attendees)
		const facilitatorCounts = new Map<string, number>();
		facilitators.forEach((f) => facilitatorCounts.set(f.id, 0));
		attendanceLogs?.forEach((log: any) => {
			const attendee = log.attendees;
			const facilitatorId = attendee?.facilitator_id;
			// Only count if facilitatorId exists, is in our list, and attendee is not a facilitator
			if (facilitatorId && facilitatorCounts.has(facilitatorId) && !facilitatorIds.has(attendee.id)) {
				facilitatorCounts.set(facilitatorId, (facilitatorCounts.get(facilitatorId) || 0) + 1);
			}
		});

		// Find facilitator with fewest attendees
		let selectedFacilitatorId = facilitators[0].id;
		let minCount = facilitatorCounts.get(selectedFacilitatorId) || 0;

		facilitatorCounts.forEach((count, facilitatorId) => {
			if (count < minCount) {
				minCount = count;
				selectedFacilitatorId = facilitatorId;
			}
		});

		// Assign the selected facilitator
		const transferResponse = await transferAttendee(attendeeId, selectedFacilitatorId);
		if (!transferResponse.success) {
			return {
				success: false,
				error: transferResponse.error || 'Failed to assign facilitator.'
			};
		}

		return {
			success: true,
			data: selectedFacilitatorId
		};
	} catch (error) {
		console.error('Error in assignFacilitatorToAttendee:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

