<script lang="ts">
	import type { AttendeeRegistrationData } from '$lib/types/attendance';
	import FormField from './FormField.svelte';
	import { getTodayDate } from '$lib/utils/formatting';

	interface Props {
		formData: AttendeeRegistrationData;
		isSubmitting: boolean;
		onSubmit: () => void;
		onUpdate: (data: Partial<AttendeeRegistrationData>) => void;
	}

	let { formData, isSubmitting, onSubmit, onUpdate }: Props = $props();

	const todayDate = $derived(getTodayDate());

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		onSubmit();
	}
</script>

<div class="bg-white rounded-xl shadow-lg p-6 sm:p-8">
	<h2 class="text-3xl font-bold text-gray-900 mb-8">New Attendee Registration</h2>

	<form onsubmit={handleSubmit} class="space-y-6">
		<!-- Name Fields -->
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<FormField id="first_name" label="First Name" required>
				<input
					type="text"
					id="first_name"
					value={formData.first_name}
					oninput={(e) => onUpdate({ first_name: e.currentTarget.value })}
					required
					disabled={isSubmitting}
					class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
					placeholder="John"
				/>
			</FormField>
			<FormField id="last_name" label="Last Name" required>
				<input
					type="text"
					id="last_name"
					value={formData.last_name}
					oninput={(e) => onUpdate({ last_name: e.currentTarget.value })}
					required
					disabled={isSubmitting}
					class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
					placeholder="Doe"
				/>
			</FormField>
		</div>

		<!-- Gender -->
		<FormField id="gender" label="Gender" required>
			<select
				id="gender"
				value={formData.gender}
				onchange={(e) => onUpdate({ gender: e.currentTarget.value as 'Male' | 'Female' })}
				required
				disabled={isSubmitting}
				class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
			>
				<option value="Male">Male</option>
				<option value="Female">Female</option>
			</select>
		</FormField>

		<!-- Contact Number -->
		<FormField id="contact_number" label="Contact Number" required helpText="Enter your 10-digit mobile number (e.g., 9123456789)">
			<div class="flex">
				<span
					class="inline-flex items-center px-4 py-3 rounded-l-lg border-2 border-r-0 border-gray-300 bg-gray-50 text-gray-900 text-base font-semibold"
				>
					+63
				</span>
				<input
					type="tel"
					id="contact_number"
					value={formData.contact_number.replace(/^\+63/, '')}
					oninput={(e) => {
						// Only allow digits, max 10 characters (9xxxxxxxxx format)
						const value = e.currentTarget.value.replace(/\D/g, '').slice(0, 10);
						onUpdate({ contact_number: value });
					}}
					required
					disabled={isSubmitting}
					class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-r-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
					placeholder="9123456789"
					maxlength="10"
				/>
			</div>
		</FormField>

		<!-- Email -->
		<FormField id="email" label="Email Address" helpText="Optional">
			<input
				type="email"
				id="email"
				value={formData.email || ''}
				oninput={(e) => onUpdate({ email: e.currentTarget.value })}
				disabled={isSubmitting}
				class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
				placeholder="john.doe@example.com"
			/>
		</FormField>

		<!-- Birthday -->
		<FormField id="birthday" label="Birthday" required>
			<input
				type="date"
				id="birthday"
				value={formData.birthday || ''}
				oninput={(e) => onUpdate({ birthday: e.currentTarget.value })}
				max={todayDate}
				required
				disabled={isSubmitting}
				class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
			/>
		</FormField>

		<!-- School Name -->
		<FormField id="school_name" label="School Name" required>
			<input
				type="text"
				id="school_name"
				value={formData.school_name}
				oninput={(e) => onUpdate({ school_name: e.currentTarget.value })}
				required
				disabled={isSubmitting}
				class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
				placeholder="Your School Name"
			/>
		</FormField>

		<!-- Location Fields -->
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<FormField id="barangay" label="Barangay" required>
				<input
					type="text"
					id="barangay"
					value={formData.barangay}
					oninput={(e) => onUpdate({ barangay: e.currentTarget.value })}
					required
					disabled={isSubmitting}
					class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
					placeholder="Barangay Name"
				/>
			</FormField>
			<FormField id="city" label="City" required>
				<input
					type="text"
					id="city"
					value={formData.city}
					oninput={(e) => onUpdate({ city: e.currentTarget.value })}
					required
					disabled={isSubmitting}
					class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
					placeholder="City Name"
				/>
			</FormField>
		</div>

		<!-- Social Media Name -->
		<FormField id="social_media_name" label="Social Media Name">
			<input
				type="text"
				id="social_media_name"
				value={formData.social_media_name || ''}
				oninput={(e) => onUpdate({ social_media_name: e.currentTarget.value })}
				disabled={isSubmitting}
				class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
				placeholder="Facebook/Messenger Handle"
			/>
		</FormField>

		<!-- DGroup Member -->
		<FormField id="is_dgroup_member" label="Are you a member of a DGroup?" required>
			<select
				id="is_dgroup_member"
				value={formData.is_dgroup_member ? 'true' : 'false'}
				onchange={(e) => onUpdate({ is_dgroup_member: e.currentTarget.value === 'true' })}
				required
				disabled={isSubmitting}
				class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
			>
				<option value="false">No</option>
				<option value="true">Yes</option>
			</select>
		</FormField>

		<!-- DGroup Leader Name -->
		<FormField id="dgroup_leader_name" label="Name of your DGroup Leader">
			<input
				type="text"
				id="dgroup_leader_name"
				value={formData.dgroup_leader_name || ''}
				oninput={(e) => onUpdate({ dgroup_leader_name: e.currentTarget.value })}
				disabled={isSubmitting}
				class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
				placeholder="DGroup Leader Name (optional)"
			/>
		</FormField>

		<!-- Submit Button -->
		<button
			type="submit"
			disabled={isSubmitting}
			class="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
		>
			{#if isSubmitting}
				<svg
					class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Registering...
			{:else}
				Register & Check In
			{/if}
		</button>
	</form>
</div>

