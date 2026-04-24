import { supabase } from '$lib/supabase';
import type {
	Attendee,
	AttendeeRegistrationData,
	B1GAttendee,
	B1GRegistrationData,
	Ministry,
	ServiceResponse,
	SearchResult,
	CheckedInAttendee,
	Facilitator,
	FacilitatorWithAttendees
} from '$lib/types/attendance';
import type { Database } from '$lib/types/database.types';
import { validateB1GRegistrationForm, validateRegistrationForm } from '$lib/utils/validation';

type AttendanceLogRow = Database['public']['Tables']['attendance_log']['Row'];

/** PostgREST v12 inference often yields `{}` for chained selects; narrow at boundaries. */
function asAttendee(data: unknown): Attendee {
	return data as Attendee;
}

function asB1GAttendee(data: unknown): B1GAttendee {
	return data as B1GAttendee;
}

function asFacilitator(data: unknown): Facilitator {
	return data as Facilitator;
}

function asAttendanceLogRow(data: unknown): AttendanceLogRow {
	return data as AttendanceLogRow;
}

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
		const { data: insertedAttendeeRaw, error: attendeeError } = await supabase
			.from('attendees')
			.insert({
				first_name: data.first_name.trim(),
				last_name: data.last_name.trim(),
				contact_number: data.has_mobile_number && data.contact_number.trim() ? data.contact_number.trim() : null,
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
				is_first_timer: true,
				heard_about_elevate: data.heard_about_elevate || null
			})
			.select('*')
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

		if (!insertedAttendeeRaw) {
			return {
				success: false,
				error: 'Failed to create attendee record.'
			};
		}

		const attendee = asAttendee(insertedAttendeeRaw);

		// Create attendance log entry for today
		const today = new Date().toISOString().split('T')[0];
		const { data: newLogRaw, error: attendanceError } = await supabase.from('attendance_log').insert({
			attendee_id: attendee.id,
			service_date: today
		})
			.select('*')
			.single();

		if (attendanceError) {
			console.error('Failed to create attendance log:', attendanceError);
			return {
				success: false,
				error: `Attendee registered but check-in failed: ${attendanceError.message || 'Unknown error'}`
			};
		}

		const newLog = newLogRaw ? asAttendanceLogRow(newLogRaw) : null;

		// Check if attendance_log already has a facilitator_id (manual intervention)
		// If not, auto-assign facilitator
		if (!newLog?.facilitator_id) {
			await assignFacilitatorToAttendee(attendee.id, attendee.gender as 'Male' | 'Female');
			// Fetch updated attendee data
			const { data: updatedAttendeeRaw } = await supabase
				.from('attendees')
				.select('*')
				.eq('id', attendee.id)
				.single();
			if (updatedAttendeeRaw) {
				return {
					success: true,
					data: asAttendee(updatedAttendeeRaw)
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
 * Register a new B1G Eastwood attendee and immediately check them in for today's service.
 * Writes to `b1g_attendees` and `attendance_log` with ministry='b1g'.
 */
export async function registerNewB1GAttendeeAndCheckIn(
	data: B1GRegistrationData
): Promise<ServiceResponse<B1GAttendee>> {
	try {
		const validation = validateB1GRegistrationForm(data);
		if (!validation.isValid) {
			return {
				success: false,
				error: validation.error || 'Please fill in all required fields.'
			};
		}

		// Compose stored birthdate as YYYY-MM-01 (day is synthetic).
		const birthdate = `${data.birth_year}-${data.birth_month}-01`;

		const { data: insertedRaw, error: insertError } = await supabase
			.from('b1g_attendees')
			.insert({
				first_name: data.first_name.trim(),
				last_name: data.last_name.trim(),
				birthdate,
				contact_number: data.contact_number.trim(),
				social_media_name: data.social_media_name?.trim() || null
			})
			.select('*')
			.single();

		if (insertError) {
			console.error('Supabase error (b1g_attendees insert):', insertError);
			if (insertError.code === '42501' || insertError.message?.includes('permission denied')) {
				return {
					success: false,
					error: 'Permission denied. Please check your Supabase Row Level Security policies.'
				};
			}
			if (insertError.code === '42P01' || insertError.message?.includes('does not exist')) {
				return {
					success: false,
					error: 'Database tables not found. Please run the SQL schema in your Supabase SQL Editor.'
				};
			}
			return {
				success: false,
				error: insertError.message || 'Failed to register B1G attendee.'
			};
		}

		if (!insertedRaw) {
			return { success: false, error: 'Failed to create B1G attendee record.' };
		}

		const attendee = asB1GAttendee(insertedRaw);

		// Create attendance log entry for today, ministry='b1g'.
		const today = new Date().toISOString().split('T')[0];
		const { error: attendanceError } = await supabase.from('attendance_log').insert({
			b1g_attendee_id: attendee.id,
			ministry: 'b1g',
			service_date: today
		});

		if (attendanceError) {
			console.error('Failed to create B1G attendance log:', attendanceError);
			if (attendanceError.code === '23505') {
				return {
					success: false,
					error: 'This attendee is already checked in for today\'s service.'
				};
			}
			return {
				success: false,
				error: `Attendee registered but check-in failed: ${attendanceError.message || 'Unknown error'}`
			};
		}

		return { success: true, data: attendee };
	} catch (error) {
		console.error('Error in registerNewB1GAttendeeAndCheckIn:', error);
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
 * Search for attendees by name or contact number (case-insensitive).
 * Queries both Elevate (`attendees`) and B1G (`b1g_attendees`) tables and merges results
 * with a `ministry` discriminator.
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
		const orFilter = `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%`;

		const [elevateResp, b1gResp] = await Promise.all([
			supabase
				.from('attendees')
				.select('id, first_name, last_name, contact_number')
				.or(orFilter)
				.limit(10)
				.order('first_name', { ascending: true }),
			supabase
				.from('b1g_attendees')
				.select('id, first_name, last_name, contact_number')
				.or(orFilter)
				.limit(10)
				.order('first_name', { ascending: true })
		]);

		if (elevateResp.error) {
			return { success: false, error: elevateResp.error.message || 'Failed to search attendees.' };
		}
		if (b1gResp.error) {
			return { success: false, error: b1gResp.error.message || 'Failed to search B1G attendees.' };
		}

		const elevateResults: SearchResult[] =
			elevateResp.data?.map((attendee) => ({
				id: attendee.id,
				first_name: attendee.first_name,
				last_name: attendee.last_name,
				contact_number: attendee.contact_number,
				full_name: `${attendee.first_name} ${attendee.last_name}`,
				ministry: 'elevate' as Ministry
			})) || [];

		const b1gResults: SearchResult[] =
			b1gResp.data?.map((attendee) => ({
				id: attendee.id,
				first_name: attendee.first_name,
				last_name: attendee.last_name,
				contact_number: attendee.contact_number,
				full_name: `${attendee.first_name} ${attendee.last_name}`,
				ministry: 'b1g' as Ministry
			})) || [];

		const merged = [...elevateResults, ...b1gResults].sort((a, b) =>
			a.first_name.localeCompare(b.first_name)
		);

		return {
			success: true,
			data: merged
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
export async function checkInAttendee(
	attendeeId: string,
	ministry: Ministry = 'elevate'
): Promise<ServiceResponse<Attendee | B1GAttendee>> {
	try {
		if (!attendeeId) {
			return {
				success: false,
				error: 'Invalid attendee ID.'
			};
		}

		const today = new Date().toISOString().split('T')[0];
		const personColumn = ministry === 'elevate' ? 'attendee_id' : 'b1g_attendee_id';

		// Check if already checked in today for this ministry
		const { data: existingCheckIn, error: checkError } = await supabase
			.from('attendance_log')
			.select('id')
			.eq(personColumn, attendeeId)
			.eq('service_date', today)
			.maybeSingle();

		if (checkError && checkError.code !== 'PGRST116') {
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

		// Create attendance log entry with the appropriate FK column + ministry
		const insertPayload =
			ministry === 'elevate'
				? { attendee_id: attendeeId, ministry: 'elevate' as const, service_date: today }
				: { b1g_attendee_id: attendeeId, ministry: 'b1g' as const, service_date: today };

		const { data: newLogRaw, error: attendanceError } = await supabase
			.from('attendance_log')
			.insert(insertPayload)
			.select('*')
			.single();

		if (attendanceError) {
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

		if (ministry === 'b1g') {
			// No facilitator auto-assignment for B1G.
			const { data: b1gRaw } = await supabase
				.from('b1g_attendees')
				.select('*')
				.eq('id', attendeeId)
				.single();
			return { success: true, data: b1gRaw ? asB1GAttendee(b1gRaw) : undefined };
		}

		const newLog = newLogRaw ? asAttendanceLogRow(newLogRaw) : null;

		const { data: attendeeRaw, error: attendeeError } = await supabase
			.from('attendees')
			.select('*')
			.eq('id', attendeeId)
			.single();

		if (attendeeError || !attendeeRaw) {
			return {
				success: true,
				error: 'Checked in successfully, but could not retrieve attendee information.'
			};
		}

		const attendee = asAttendee(attendeeRaw);

		if (!newLog?.facilitator_id) {
			await assignFacilitatorToAttendee(attendeeId, attendee.gender as 'Male' | 'Female');
			const { data: updatedAttendeeRaw } = await supabase
				.from('attendees')
				.select('*')
				.eq('id', attendeeId)
				.single();
			if (updatedAttendeeRaw) {
				return { success: true, data: asAttendee(updatedAttendeeRaw) };
			}
		}

		return { success: true, data: attendee };
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

		// Fetch attendance logs for today joined to both Elevate and B1G person tables.
		const { data, error } = await supabase
			.from('attendance_log')
			.select(
				`
				id,
				attendee_id,
				b1g_attendee_id,
				ministry,
				check_in_time,
				attendees:attendee_id (
					id,
					first_name,
					last_name,
					contact_number,
					is_first_timer
				),
				b1g_attendees:b1g_attendee_id (
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

		const checkedInAttendees: CheckedInAttendee[] =
			data
				?.map((log: any): CheckedInAttendee | null => {
					const ministry: Ministry = log.ministry === 'b1g' ? 'b1g' : 'elevate';
					const person = ministry === 'b1g' ? log.b1g_attendees : log.attendees;
					if (!person) return null;
					return {
						attendance_log_id: log.id,
						attendee_id: person.id,
						first_name: person.first_name,
						last_name: person.last_name,
						contact_number: person.contact_number,
						full_name: `${person.first_name} ${person.last_name}`,
						check_in_time: log.check_in_time,
						is_first_timer: ministry === 'elevate' ? Boolean(person.is_first_timer) : false,
						ministry
					};
				})
				.filter((x): x is CheckedInAttendee => x !== null) || [];

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
 * Returns true only if is_facilitating is true
 */
export async function isFacilitator(attendeeId: string): Promise<boolean> {
	try {
		const { data, error } = await supabase
			.from('facilitators')
			.select('id, is_facilitating')
			.eq('id', attendeeId)
			.single();

		const row = data as { is_facilitating: boolean } | null;
		return !error && row !== null && row.is_facilitating === true;
	} catch (error) {
		console.error('Error in isFacilitator:', error);
		return false;
	}
}

/**
 * Get facilitators who have checked in today
 * Only returns facilitators where is_facilitating is true
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
		// attendee_id can be null for B1G rows; filter nulls and dedupe
		const checkedInAttendeeIds = [
			...new Set(
				attendanceLogs
					.map((log) => log.attendee_id)
					.filter((id): id is string => id !== null)
			)
		];

		// Get all facilitators whose IDs are in the checked-in attendee list
		// Filter by is_facilitating = true
		const { data: facilitators, error: facilitatorsError } = await supabase
			.from('facilitators')
			.select('*')
			.in('id', checkedInAttendeeIds)
			.eq('is_facilitating', true)
			.order('first_name', { ascending: true });

		if (facilitatorsError) {
			return {
				success: false,
				error: facilitatorsError.message || 'Failed to fetch facilitators.'
			};
		}

		return {
			success: true,
			data: (facilitators || []).map((row) => asFacilitator(row))
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
 * Only returns facilitators where is_facilitating is true
 */
export async function getFacilitators(): Promise<ServiceResponse<Facilitator[]>> {
	try {
		const { data, error } = await supabase
			.from('facilitators')
			.select('*')
			.eq('is_facilitating', true)
			.order('first_name', { ascending: true });

		if (error) {
			return {
				success: false,
				error: error.message || 'Failed to fetch facilitators.'
			};
		}

		return {
			success: true,
			data: (data || []).map((row) => asFacilitator(row))
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
 * Only returns facilitators where is_facilitating is true
 */
export async function getFacilitatorsByGender(
	gender: 'Male' | 'Female'
): Promise<ServiceResponse<Facilitator[]>> {
	try {
		const { data, error } = await supabase
			.from('facilitators')
			.select('*')
			.eq('gender', gender)
			.eq('is_facilitating', true)
			.order('first_name', { ascending: true });

		if (error) {
			return {
				success: false,
				error: error.message || 'Failed to fetch facilitators.'
			};
		}

		return {
			success: true,
			data: (data || []).map((row) => asFacilitator(row))
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

		const facilitatorRecord = asFacilitator(facilitator);

		// Get all facilitator IDs to filter them out from attendees
		// Only include facilitators who are actively facilitating
		const { data: allFacilitators, error: facilitatorIdsError } = await supabase
			.from('facilitators')
			.select('id')
			.eq('is_facilitating', true);
		
		const facilitatorIds = new Set<string>();
		if (!facilitatorIdsError && allFacilitators) {
			allFacilitators.forEach((f) => facilitatorIds.add(f.id));
		}

		// Get checked-in attendees for today assigned to this facilitator (using attendance_log.facilitator_id)
		const { data: attendanceLogs, error: attendanceError } = await supabase
			.from('attendance_log')
			.select(
				`
				id,
				attendee_id,
				check_in_time,
				facilitator_id,
				attendees:attendee_id (
					id,
					first_name,
					last_name,
					contact_number,
					is_first_timer
				)
			`
			)
			.eq('service_date', today)
			.eq('facilitator_id', facilitatorId)
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
						check_in_time: log.check_in_time,
						is_first_timer: attendee.is_first_timer,
						ministry: 'elevate' as Ministry
					};
				}) || [];

		return {
			success: true,
			data: {
				...facilitatorRecord,
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
		// Only include facilitators who are actively facilitating
		const { data: allFacilitators, error: facilitatorIdsError } = await supabase
			.from('facilitators')
			.select('id')
			.eq('is_facilitating', true);
		
		const facilitatorIds = new Set<string>();
		if (!facilitatorIdsError && allFacilitators) {
			allFacilitators.forEach((f) => facilitatorIds.add(f.id));
		}

		// Get all checked-in attendees for today with their facilitator assignments (using attendance_log.facilitator_id)
		const { data: attendanceLogs, error: attendanceError } = await supabase
			.from('attendance_log')
			.select(
				`
				id,
				attendee_id,
				check_in_time,
				facilitator_id,
				attendees:attendee_id (
					id,
					first_name,
					last_name,
					contact_number,
					is_first_timer
				)
			`
			)
			.eq('service_date', today)
			.not('facilitator_id', 'is', null)
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
			const facilitatorId = log.facilitator_id;
			// Skip if attendee is null, facilitator_id is null, or if this attendee is a facilitator
			if (attendee && facilitatorId && !facilitatorIds.has(attendee.id)) {
				if (!attendeesByFacilitator.has(facilitatorId)) {
					attendeesByFacilitator.set(facilitatorId, []);
				}
				attendeesByFacilitator.get(facilitatorId)?.push({
					attendance_log_id: log.id,
					attendee_id: attendee.id,
					first_name: attendee.first_name,
					last_name: attendee.last_name,
					contact_number: attendee.contact_number,
					full_name: `${attendee.first_name} ${attendee.last_name}`,
					check_in_time: log.check_in_time,
					is_first_timer: attendee.is_first_timer,
					ministry: 'elevate' as Ministry
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

		// Update attendance_log.facilitator_id for today's service (manual intervention)
		// This only affects the current service and does not override default_facilitator_id
		const today = new Date().toISOString().split('T')[0];
		const { error: updateError } = await supabase
			.from('attendance_log')
			.update({ facilitator_id: newFacilitatorId })
			.eq('attendee_id', attendeeId)
			.eq('service_date', today);

		if (updateError) {
			return {
				success: false,
				error: updateError.message || 'Failed to transfer attendee.'
			};
		}

		// Also update attendees.facilitator_id for backward compatibility
		const { error: attendeeUpdateError } = await supabase
			.from('attendees')
			.update({ facilitator_id: newFacilitatorId })
			.eq('id', attendeeId);

		if (attendeeUpdateError) {
			// Log but don't fail - attendance_log update succeeded
			console.warn('Failed to update attendees.facilitator_id:', attendeeUpdateError);
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
 * Priority: 1) Existing assignment in attendance_log (manual intervention), 2) default_facilitator_id, 3) load balancing
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

		const today = new Date().toISOString().split('T')[0];

		// Check if attendance_log for today already has a facilitator_id (manual intervention)
		const { data: existingLog, error: logError } = await supabase
			.from('attendance_log')
			.select('facilitator_id')
			.eq('attendee_id', attendeeId)
			.eq('service_date', today)
			.single();

		if (!logError && existingLog?.facilitator_id) {
			// Manual intervention already set - respect it
			return {
				success: true,
				data: existingLog.facilitator_id
			};
		}

		// Get attendee to check for default_facilitator_id
		const { data: attendee, error: attendeeError } = await supabase
			.from('attendees')
			.select('default_facilitator_id')
			.eq('id', attendeeId)
			.single();

		if (!attendeeError && attendee?.default_facilitator_id) {
			// Check if default facilitator is checked in today and gender matches
			const { data: defaultFacilitator, error: facilitatorError } = await supabase
				.from('facilitators')
				.select('gender')
				.eq('id', attendee.default_facilitator_id)
				.single();

			if (!facilitatorError && defaultFacilitator) {
				// Check if gender matches
				if (defaultFacilitator.gender === gender) {
					// Check if default facilitator is checked in today
					const { data: facilitatorCheckIn } = await supabase
						.from('attendance_log')
						.select('id')
						.eq('attendee_id', attendee.default_facilitator_id)
						.eq('service_date', today)
						.single();

					if (facilitatorCheckIn) {
						// Default facilitator is available - assign them
						const selectedFacilitatorId = attendee.default_facilitator_id;
						
						// Update both attendance_log and attendees tables
						const { error: logUpdateError } = await supabase
							.from('attendance_log')
							.update({ facilitator_id: selectedFacilitatorId })
							.eq('attendee_id', attendeeId)
							.eq('service_date', today);

						if (logUpdateError) {
							return {
								success: false,
								error: logUpdateError.message || 'Failed to assign default facilitator.'
							};
						}

						// Also update attendees.facilitator_id for backward compatibility
						const { error: attendeeUpdateError } = await supabase
							.from('attendees')
							.update({ facilitator_id: selectedFacilitatorId })
							.eq('id', attendeeId);

						if (attendeeUpdateError) {
							console.warn('Failed to update attendees.facilitator_id:', attendeeUpdateError);
						}

						return {
							success: true,
							data: selectedFacilitatorId
						};
					}
				}
			}
		}

		// Fall back to load balancing
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
		// Only include facilitators who are actively facilitating
		const { data: allFacilitators, error: facilitatorIdsError } = await supabase
			.from('facilitators')
			.select('id')
			.eq('is_facilitating', true);
		
		const facilitatorIds = new Set<string>();
		if (!facilitatorIdsError && allFacilitators) {
			allFacilitators.forEach((f) => facilitatorIds.add(f.id));
		}

		// Get count of assigned attendees for each facilitator (only checked in today, using attendance_log.facilitator_id)
		const { data: attendanceLogs, error: attendanceError } = await supabase
			.from('attendance_log')
			.select('facilitator_id, attendee_id')
			.eq('service_date', today)
			.not('facilitator_id', 'is', null);

		// Count attendees per facilitator (excluding facilitator attendees)
		const facilitatorCounts = new Map<string, number>();
		facilitators.forEach((f) => facilitatorCounts.set(f.id, 0));
		attendanceLogs?.forEach((log: any) => {
			const facilitatorId = log.facilitator_id;
			const attendeeIdFromLog = log.attendee_id;
			// Only count if facilitatorId exists, is in our list, and attendee is not a facilitator
			if (facilitatorId && facilitatorCounts.has(facilitatorId) && !facilitatorIds.has(attendeeIdFromLog)) {
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

		// Update both attendance_log and attendees tables
		const { error: logUpdateError } = await supabase
			.from('attendance_log')
			.update({ facilitator_id: selectedFacilitatorId })
			.eq('attendee_id', attendeeId)
			.eq('service_date', today);

		if (logUpdateError) {
			return {
				success: false,
				error: logUpdateError.message || 'Failed to assign facilitator.'
			};
		}

		// Also update attendees.facilitator_id for backward compatibility
		const { error: attendeeUpdateError } = await supabase
			.from('attendees')
			.update({ facilitator_id: selectedFacilitatorId })
			.eq('id', attendeeId);

		if (attendeeUpdateError) {
			console.warn('Failed to update attendees.facilitator_id:', attendeeUpdateError);
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

/**
 * Auto-assign a facilitator to a B1G attendee based on gender (load balancing).
 * Simpler than the Elevate variant: no default_facilitator_id and no attendees-table update.
 * Only considers facilitators who are checked in today and match the attendee's gender.
 * Counts both attendee_id and b1g_attendee_id rows so fair-share spans both ministries.
 */
export async function assignFacilitatorToB1GAttendee(
	b1gAttendeeId: string,
	gender: 'Male' | 'Female'
): Promise<ServiceResponse<string | null>> {
	try {
		const today = new Date().toISOString().split('T')[0];

		const facilitatorsResponse = await getCheckedInFacilitatorsByGender(gender);
		if (!facilitatorsResponse.success || !facilitatorsResponse.data) {
			return { success: true, data: null };
		}

		const facilitators = facilitatorsResponse.data;
		if (facilitators.length === 0) {
			return { success: true, data: null };
		}

		const { data: attendanceLogs, error: attendanceError } = await supabase
			.from('attendance_log')
			.select('facilitator_id, attendee_id, b1g_attendee_id')
			.eq('service_date', today)
			.not('facilitator_id', 'is', null);

		if (attendanceError) {
			return {
				success: false,
				error: attendanceError.message || 'Failed to load attendance counts.'
			};
		}

		const facilitatorCounts = new Map<string, number>();
		facilitators.forEach((f) => facilitatorCounts.set(f.id, 0));
		attendanceLogs?.forEach((log: { facilitator_id: string | null }) => {
			const facilitatorId = log.facilitator_id;
			if (facilitatorId && facilitatorCounts.has(facilitatorId)) {
				facilitatorCounts.set(facilitatorId, (facilitatorCounts.get(facilitatorId) || 0) + 1);
			}
		});

		let selectedFacilitatorId = facilitators[0].id;
		let minCount = facilitatorCounts.get(selectedFacilitatorId) ?? 0;
		facilitatorCounts.forEach((count, facilitatorId) => {
			if (count < minCount) {
				minCount = count;
				selectedFacilitatorId = facilitatorId;
			}
		});

		const { error: logUpdateError } = await supabase
			.from('attendance_log')
			.update({ facilitator_id: selectedFacilitatorId })
			.eq('b1g_attendee_id', b1gAttendeeId)
			.eq('service_date', today);

		if (logUpdateError) {
			return {
				success: false,
				error: logUpdateError.message || 'Failed to assign facilitator.'
			};
		}

		return { success: true, data: selectedFacilitatorId };
	} catch (error) {
		console.error('Error in assignFacilitatorToB1GAttendee:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred.'
		};
	}
}

