// Database type definitions for Supabase
// This file provides type safety for database operations

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			attendees: {
				Row: {
					id: string;
					first_name: string;
					last_name: string;
					contact_number: string;
					email: string | null;
					birthday: string | null;
					school_name: string;
					barangay: string;
					city: string;
					social_media_name: string | null;
					gender: string;
					is_dgroup_member: boolean;
					dgroup_leader_name: string | null;
					is_first_timer: boolean;
					facilitator_id: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					first_name: string;
					last_name: string;
					contact_number: string;
					email?: string | null;
					birthday?: string | null;
					school_name: string;
					barangay: string;
					city: string;
					social_media_name?: string | null;
					gender: string;
					is_dgroup_member: boolean;
					dgroup_leader_name?: string | null;
					is_first_timer?: boolean;
					facilitator_id?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					first_name?: string;
					last_name?: string;
					contact_number?: string;
					email?: string | null;
					birthday?: string | null;
					school_name?: string;
					barangay?: string;
					city?: string;
					social_media_name?: string | null;
					gender?: string;
					is_dgroup_member?: boolean;
					dgroup_leader_name?: string | null;
					is_first_timer?: boolean;
					facilitator_id?: string | null;
					created_at?: string;
				};
			};
			attendance_log: {
				Row: {
					id: string;
					attendee_id: string;
					service_date: string;
					check_in_time: string;
				};
				Insert: {
					id?: string;
					attendee_id: string;
					service_date?: string;
					check_in_time?: string;
				};
				Update: {
					id?: string;
					attendee_id?: string;
					service_date?: string;
					check_in_time?: string;
				};
			};
			facilitators: {
				Row: {
					id: string;
					first_name: string;
					last_name: string;
					gender: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					first_name: string;
					last_name: string;
					gender: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					first_name?: string;
					last_name?: string;
					gender?: string;
					created_at?: string;
				};
			};
		};
	};
}

