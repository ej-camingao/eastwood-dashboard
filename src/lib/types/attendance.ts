// Type definitions for attendance system

export interface Attendee {
	id: string;
	first_name: string;
	last_name: string;
	contact_number: string;
	email: string | null;
	birthday: string | null; // ISO date string
	school_name: string;
	barangay: string;
	city: string;
	social_media_name: string | null;
	is_first_timer: boolean;
	created_at: string; // ISO timestamp
}

export interface AttendeeRegistrationData {
	first_name: string;
	last_name: string;
	contact_number: string;
	email?: string;
	birthday?: string; // ISO date string (YYYY-MM-DD)
	school_name: string;
	barangay: string;
	city: string;
	social_media_name?: string;
}

export interface AttendanceLog {
	id: string;
	attendee_id: string;
	service_date: string; // ISO date string
	check_in_time: string; // ISO timestamp
}

export interface SearchResult {
	id: string;
	first_name: string;
	last_name: string;
	contact_number: string;
	full_name: string; // Computed: first_name + ' ' + last_name
}

export interface ServiceResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

