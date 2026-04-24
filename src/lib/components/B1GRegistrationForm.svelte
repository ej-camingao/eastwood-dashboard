<script lang="ts">
	import type { B1GRegistrationData } from '$lib/types/attendance';
	import FormField from './FormField.svelte';

	interface Props {
		formData: B1GRegistrationData;
		isSubmitting: boolean;
		onSubmit: () => void;
		onUpdate: (data: Partial<B1GRegistrationData>) => void;
	}

	let { formData, isSubmitting, onSubmit, onUpdate }: Props = $props();

	const MONTHS: { value: string; label: string }[] = [
		{ value: '01', label: '01 - January' },
		{ value: '02', label: '02 - February' },
		{ value: '03', label: '03 - March' },
		{ value: '04', label: '04 - April' },
		{ value: '05', label: '05 - May' },
		{ value: '06', label: '06 - June' },
		{ value: '07', label: '07 - July' },
		{ value: '08', label: '08 - August' },
		{ value: '09', label: '09 - September' },
		{ value: '10', label: '10 - October' },
		{ value: '11', label: '11 - November' },
		{ value: '12', label: '12 - December' }
	];

	const currentYear = new Date().getFullYear();
	const years: string[] = Array.from({ length: 101 }, (_, i) => String(currentYear - i));

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		onSubmit();
	}
</script>

<div class="glass rounded-2xl shadow-brand-lg p-8 animate-slide-in-up">
	<div class="text-center mb-8">
		<h2 class="text-3xl font-bold text-gray-900 mb-2">B1G Eastwood Registration</h2>
		<div class="w-16 h-1 bg-brand-gradient mx-auto rounded-full"></div>
	</div>

	<form onsubmit={handleSubmit} class="space-y-6">
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
			<FormField id="b1g_first_name" label="First Name" required>
				<input
					type="text"
					id="b1g_first_name"
					value={formData.first_name}
					oninput={(e) => onUpdate({ first_name: e.currentTarget.value })}
					required
					disabled={isSubmitting}
					class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus-brand disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-300 font-medium"
					placeholder="John"
				/>
			</FormField>
			<FormField id="b1g_last_name" label="Last Name" required>
				<input
					type="text"
					id="b1g_last_name"
					value={formData.last_name}
					oninput={(e) => onUpdate({ last_name: e.currentTarget.value })}
					required
					disabled={isSubmitting}
					class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus-brand disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-300 font-medium"
					placeholder="Doe"
				/>
			</FormField>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
			<FormField id="b1g_birth_month" label="Birth Month" required>
				<select
					id="b1g_birth_month"
					value={formData.birth_month}
					onchange={(e) => onUpdate({ birth_month: e.currentTarget.value })}
					required
					disabled={isSubmitting}
					class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus-brand disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-300 font-medium"
				>
					<option value="" disabled>Select month</option>
					{#each MONTHS as m (m.value)}
						<option value={m.value}>{m.label}</option>
					{/each}
				</select>
			</FormField>
			<FormField id="b1g_birth_year" label="Birth Year" required>
				<select
					id="b1g_birth_year"
					value={formData.birth_year}
					onchange={(e) => onUpdate({ birth_year: e.currentTarget.value })}
					required
					disabled={isSubmitting}
					class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus-brand disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-300 font-medium"
				>
					<option value="" disabled>Select year</option>
					{#each years as y (y)}
						<option value={y}>{y}</option>
					{/each}
				</select>
			</FormField>
		</div>

		<FormField id="b1g_gender" label="Gender" required>
			<select
				id="b1g_gender"
				value={formData.gender}
				onchange={(e) => onUpdate({ gender: e.currentTarget.value as 'Male' | 'Female' })}
				required
				disabled={isSubmitting}
				class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus-brand disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-300 font-medium"
			>
				<option value="Male">Male</option>
				<option value="Female">Female</option>
			</select>
		</FormField>

		<FormField
			id="b1g_contact_number"
			label="Contact Number"
			required
			helpText="Enter your 10-digit mobile number (e.g., 9123456789)"
		>
			<div class="flex">
				<span
					class="inline-flex items-center px-4 py-4 rounded-l-xl border-2 border-r-0 border-gray-200 bg-gray-50 text-gray-900 text-base font-bold"
				>
					+63
				</span>
				<input
					type="tel"
					id="b1g_contact_number"
					value={formData.contact_number.replace(/^\+63/, '')}
					oninput={(e) => {
						const value = e.currentTarget.value.replace(/\D/g, '').slice(0, 10);
						onUpdate({ contact_number: value });
					}}
					required
					disabled={isSubmitting}
					class="flex-1 px-4 py-4 border-2 border-gray-200 rounded-r-xl focus-brand disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-300 font-medium"
					placeholder="9123456789"
					maxlength="10"
				/>
			</div>
		</FormField>

		<FormField id="b1g_social_media_name" label="Socials" helpText="Optional">
			<input
				type="text"
				id="b1g_social_media_name"
				value={formData.social_media_name || ''}
				oninput={(e) => onUpdate({ social_media_name: e.currentTarget.value })}
				disabled={isSubmitting}
				class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus-brand disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-300 font-medium"
				placeholder="Facebook/Instagram Handle"
			/>
		</FormField>

		<button
			type="submit"
			disabled={isSubmitting}
			class="w-full bg-brand-gradient text-white py-4 px-8 rounded-xl font-bold text-lg hover:shadow-brand-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center"
		>
			{#if isSubmitting}
				<svg
					class="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
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
