import { supabase } from '$lib/supabase';
import type {
	Attendee,
	AttendeeRegistrationData,
	ServiceResponse,
	SearchResult,
	CheckedInAttendee
} from '$lib/types/attendance';

/**
 * Register a new attendee and immediately check them in for today's service
 */
export async function registerNewAttendeeAndCheckIn(
	data: AttendeeRegistrationData
): Promise<ServiceResponse<Attendee>> {
	try {
		// Validate required fields
		if (!data.first_name || !data.last_name || !data.contact_number || !data.school_name || !data.barangay || !data.city || !data.gender) {
			return {
				success: false,
				error: 'Please fill in all required fields.'
			};
		}

		// Validate contact number format (Philippine format: +639xxxxxxxxx)
		const contactRegex = /^\+639\d{9}$/;
		if (!contactRegex.test(data.contact_number)) {
			return {
				success: false,
				error: 'Contact number must be in format +639xxxxxxxxx (e.g., +639123456789)'
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

		// Fetch the attendee data to return
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

