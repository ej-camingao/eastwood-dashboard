// Type definitions for attendance system

export interface Attendee {
	id: string;
	first_name: string;
	last_name: string;
	contact_number: string | null;
	email: string | null;
	birthday: string | null; // ISO date string
	school_name: string;
	barangay: string;
	city: string;
	social_media_name: string | null;
	gender: 'Male' | 'Female';
	is_dgroup_member: boolean;
	dgroup_leader_name: string | null;
	is_first_timer: boolean;
	facilitator_id: string | null;
	default_facilitator_id: string | null;
	created_at: string; // ISO timestamp
}

export interface AttendeeRegistrationData {
	first_name: string;
	last_name: string;
	has_mobile_number: boolean;
	contact_number: string;
	email?: string;
	birthday?: string; // ISO date string (YYYY-MM-DD)
	school_name: string;
	barangay: string;
	city: string;
	social_media_name?: string;
	gender: 'Male' | 'Female';
	is_dgroup_member: boolean;
	dgroup_leader_name?: string;
}

export interface AttendanceLog {
	id: string;
	attendee_id: string;
	service_date: string; // ISO date string
	check_in_time: string; // ISO timestamp
	facilitator_id: string | null;
}

export interface SearchResult {
	id: string;
	first_name: string;
	last_name: string;
	contact_number: string | null;
	full_name: string; // Computed: first_name + ' ' + last_name
}

export interface CheckedInAttendee {
	attendance_log_id: string;
	attendee_id: string;
	first_name: string;
	last_name: string;
	contact_number: string | null;
	full_name: string; // Computed: first_name + ' ' + last_name
	check_in_time: string; // ISO timestamp
	is_first_timer: boolean;
}

export interface Facilitator {
	id: string;
	first_name: string;
	last_name: string;
	gender: 'Male' | 'Female';
	created_at: string; // ISO timestamp
}

export interface FacilitatorWithAttendees extends Facilitator {
	attendees: CheckedInAttendee[];
	attendee_count: number;
}

export interface ServiceResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

