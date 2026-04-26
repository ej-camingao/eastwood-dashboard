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
					contact_number: string | null;
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
					heard_about_elevate: string | null;
					facilitator_id: string | null;
					default_facilitator_id: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					first_name: string;
					last_name: string;
					contact_number: string | null;
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
					heard_about_elevate?: string | null;
					facilitator_id?: string | null;
					default_facilitator_id?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					first_name?: string;
					last_name?: string;
					contact_number?: string | null;
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
					heard_about_elevate?: string | null;
					facilitator_id?: string | null;
					default_facilitator_id?: string | null;
					created_at?: string;
				};
				Relationships: [];
			};
			attendance_log: {
				Row: {
					id: string;
					attendee_id: string | null;
					b1g_attendee_id: string | null;
					elv8_attendee_id: string | null;
					ministry: 'elevate' | 'b1g' | 'elv8';
					service_date: string;
					check_in_time: string;
					facilitator_id: string | null;
					first_name: string | null;
					last_name: string | null;
				};
				Insert: {
					id?: string;
					attendee_id?: string | null;
					b1g_attendee_id?: string | null;
					elv8_attendee_id?: string | null;
					ministry?: 'elevate' | 'b1g' | 'elv8';
					service_date?: string;
					check_in_time?: string;
					facilitator_id?: string | null;
					first_name?: string | null;
					last_name?: string | null;
				};
				Update: {
					id?: string;
					attendee_id?: string | null;
					b1g_attendee_id?: string | null;
					elv8_attendee_id?: string | null;
					ministry?: 'elevate' | 'b1g' | 'elv8';
					service_date?: string;
					check_in_time?: string;
					facilitator_id?: string | null;
					first_name?: string | null;
					last_name?: string | null;
				};
				Relationships: [];
			};
			b1g_attendees: {
				Row: {
					id: string;
					first_name: string;
					last_name: string;
					birthdate: string;
					contact_number: string;
					social_media_name: string | null;
					gender: 'Male' | 'Female' | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					first_name: string;
					last_name: string;
					birthdate: string;
					contact_number: string;
					social_media_name?: string | null;
					gender?: 'Male' | 'Female' | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					first_name?: string;
					last_name?: string;
					birthdate?: string;
					contact_number?: string;
					social_media_name?: string | null;
					gender?: 'Male' | 'Female' | null;
					created_at?: string;
				};
				Relationships: [];
			};
			elv8_attendees: {
				Row: {
					id: string;
					first_name: string;
					last_name: string;
					birthdate: string;
					contact_number: string;
					social_media_name: string | null;
					gender: 'Male' | 'Female' | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					first_name: string;
					last_name: string;
					birthdate: string;
					contact_number: string;
					social_media_name?: string | null;
					gender?: 'Male' | 'Female' | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					first_name?: string;
					last_name?: string;
					birthdate?: string;
					contact_number?: string;
					social_media_name?: string | null;
					gender?: 'Male' | 'Female' | null;
					created_at?: string;
				};
				Relationships: [];
			};
			facilitators: {
				Row: {
					id: string;
					first_name: string;
					last_name: string;
					gender: string;
					is_facilitating: boolean;
					created_at: string;
				};
				Insert: {
					id?: string;
					first_name: string;
					last_name: string;
					gender: string;
					is_facilitating?: boolean;
					created_at?: string;
				};
				Update: {
					id?: string;
					first_name?: string;
					last_name?: string;
					gender?: string;
					is_facilitating?: boolean;
					created_at?: string;
				};
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
	};
}

