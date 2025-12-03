<script lang="ts">
	import {
		registerNewAttendeeAndCheckIn,
		searchAttendees,
		checkInAttendee,
		getCheckedInAttendeesToday,
		removeCheckIn
	} from '$lib/services/attendance';
	import type {
		AttendeeRegistrationData,
		SearchResult,
		CheckedInAttendee
	} from '$lib/types/attendance';

	// Form state for first-time registration
	let registrationForm: AttendeeRegistrationData = {
		first_name: '',
		last_name: '',
		contact_number: '',
		email: '',
		birthday: '',
		school_name: '',
		barangay: '',
		city: '',
		social_media_name: '',
		gender: 'Male',
		is_dgroup_member: false,
		dgroup_leader_name: ''
	};

	// Search state for returning users
	let searchQuery = $state('');
	let searchResults = $state<SearchResult[]>([]);
	let isSearching = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Checked-in attendees state
	let checkedInAttendees = $state<CheckedInAttendee[]>([]);
	let isLoadingCheckedIn = $state(false);

	// UI state
	let activePath: 'new' | 'returning' = $state('new');
	let isSubmitting = $state(false);
	let successMessage = $state('');
	let errorMessage = $state('');

	// Debounced search function
	function handleSearchInput(value: string) {
		searchQuery = value;

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		if (value.trim().length < 2) {
			searchResults = [];
			return;
		}

		isSearching = true;
		searchTimeout = setTimeout(async () => {
			const response = await searchAttendees(value);
			isSearching = false;

			if (response.success && response.data) {
				searchResults = response.data;
			} else {
				searchResults = [];
				if (response.error) {
					showError(response.error);
				}
			}
		}, 400);
	}

	// Handle first-time registration
	async function handleRegistration() {
		// Clear previous messages
		successMessage = '';
		errorMessage = '';

		// Client-side validation
		if (
			!registrationForm.first_name.trim() ||
			!registrationForm.last_name.trim() ||
			!registrationForm.contact_number.trim() ||
			!registrationForm.school_name.trim() ||
			!registrationForm.barangay.trim() ||
			!registrationForm.city.trim() ||
			!registrationForm.gender
		) {
			showError('Please fill in all required fields.');
			return;
		}


		// Validate contact number format
		const contactRegex = /^\+639\d{9}$/;
		if (!contactRegex.test(registrationForm.contact_number.trim())) {
			showError('Contact number must be in format +639xxxxxxxxx (e.g., +639123456789)');
			return;
		}

		// Validate email if provided
		if (registrationForm.email && registrationForm.email.trim()) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(registrationForm.email.trim())) {
				showError('Please enter a valid email address.');
				return;
			}
		}

		isSubmitting = true;

		try {
			const response = await registerNewAttendeeAndCheckIn(registrationForm);

			if (response.success) {
				showSuccess('Welcome to Elevate! You are checked in.');
				// Reset form
				registrationForm = {
					first_name: '',
					last_name: '',
					contact_number: '',
					email: '',
					birthday: '',
					school_name: '',
					barangay: '',
					city: '',
					social_media_name: '',
					gender: 'Male',
					is_dgroup_member: false,
					dgroup_leader_name: ''
				};
			} else {
				showError(response.error || 'Registration failed. Please try again.');
			}
		} catch (error) {
			showError('An unexpected error occurred. Please try again.');
			console.error('Registration error:', error);
		} finally {
			isSubmitting = false;
		}
	}

	// Handle returning user check-in
	async function handleCheckIn(attendeeId: string, firstName: string) {
		successMessage = '';
		errorMessage = '';
		isSubmitting = true;

		try {
			const response = await checkInAttendee(attendeeId);

			if (response.success) {
				showSuccess(`Welcome back, ${firstName}! You are checked in.`);
				// Clear search
				searchQuery = '';
				searchResults = [];
				// Reload checked-in attendees list
				await loadCheckedInAttendees();
			} else {
				showError(response.error || 'Check-in failed. Please try again.');
			}
		} catch (error) {
			showError('An unexpected error occurred. Please try again.');
			console.error('Check-in error:', error);
		} finally {
			isSubmitting = false;
		}
	}

	// Helper functions for messages
	function showSuccess(message: string) {
		successMessage = message;
		errorMessage = '';
		setTimeout(() => {
			successMessage = '';
		}, 5000);
	}

	function showError(message: string) {
		errorMessage = message;
		successMessage = '';
	}

	// Format contact number for display (show last 4 digits)
	function formatContactNumber(contactNumber: string): string {
		if (contactNumber.length > 4) {
			return `****${contactNumber.slice(-4)}`;
		}
		return contactNumber;
	}

	// Get today's date in YYYY-MM-DD format for date input max
	function getTodayDate(): string {
		return new Date().toISOString().split('T')[0];
	}

	// Load checked-in attendees for today
	async function loadCheckedInAttendees() {
		isLoadingCheckedIn = true;
		const response = await getCheckedInAttendeesToday();
		isLoadingCheckedIn = false;

		if (response.success && response.data) {
			checkedInAttendees = response.data;
		} else {
			checkedInAttendees = [];
			if (response.error) {
				console.error('Failed to load checked-in attendees:', response.error);
			}
		}
	}

	// Handle removing a check-in
	async function handleRemoveCheckIn(attendanceLogId: string, attendeeName: string) {
		if (!confirm(`Are you sure you want to remove ${attendeeName} from today's attendance?`)) {
			return;
		}

		isSubmitting = true;
		const response = await removeCheckIn(attendanceLogId);

		if (response.success) {
			showSuccess(`${attendeeName} has been removed from today's attendance.`);
			// Reload the checked-in attendees list
			await loadCheckedInAttendees();
		} else {
			showError(response.error || 'Failed to remove check-in. Please try again.');
		}

		isSubmitting = false;
	}

	// Format check-in time for display
	function formatCheckInTime(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		});
	}

	// Load checked-in attendees when returning tab is active
	$effect(() => {
		if (activePath === 'returning') {
			loadCheckedInAttendees();
		}
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
	<div class="max-w-4xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold text-gray-900 mb-2">Elevate Saturday Service</h1>
			<p class="text-lg text-gray-600">Registration & Check-In</p>
		</div>

		<!-- Path Toggle -->
		<div class="flex justify-center mb-8">
			<div class="inline-flex rounded-lg bg-white p-1 shadow-md">
				<button
					type="button"
					class="px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 {activePath === 'new'
						? 'bg-indigo-600 text-white shadow-sm'
						: 'text-gray-700 hover:text-gray-900'}"
					on:click={() => {
						activePath = 'new';
						errorMessage = '';
						successMessage = '';
					}}
				>
					First-Time Registration
				</button>
				<button
					type="button"
					class="px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 {activePath === 'returning'
						? 'bg-indigo-600 text-white shadow-sm'
						: 'text-gray-700 hover:text-gray-900'}"
					on:click={() => {
						activePath = 'returning';
						errorMessage = '';
						successMessage = '';
						searchQuery = '';
						searchResults = [];
					}}
				>
					Returning User Check-In
				</button>
			</div>
		</div>

		<!-- Messages -->
		{#if successMessage}
			<div
				class="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 shadow-sm"
				role="alert"
			>
				<div class="flex items-center">
					<svg
						class="w-5 h-5 mr-2"
						fill="currentColor"
						viewBox="0 0 20 20"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						></path>
					</svg>
					<p class="font-medium">{successMessage}</p>
				</div>
			</div>
		{/if}

		{#if errorMessage}
			<div
				class="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 shadow-sm"
				role="alert"
			>
				<div class="flex items-center">
					<svg
						class="w-5 h-5 mr-2"
						fill="currentColor"
						viewBox="0 0 20 20"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						></path>
					</svg>
					<p class="font-medium">{errorMessage}</p>
				</div>
			</div>
		{/if}

		<!-- Path 1: First-Time Registration -->
		{#if activePath === 'new'}
			<div class="bg-white rounded-xl shadow-lg p-6 sm:p-8">
				<h2 class="text-2xl font-semibold text-gray-900 mb-6">New Attendee Registration</h2>

				<form
					on:submit|preventDefault={handleRegistration}
					class="space-y-6"
				>
					<!-- Name Fields -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label for="first_name" class="block text-sm font-medium text-gray-700 mb-1">
								First Name <span class="text-red-500">*</span>
							</label>
							<input
								type="text"
								id="first_name"
								bind:value={registrationForm.first_name}
								required
								disabled={isSubmitting}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder="John"
							/>
						</div>
						<div>
							<label for="last_name" class="block text-sm font-medium text-gray-700 mb-1">
								Last Name <span class="text-red-500">*</span>
							</label>
							<input
								type="text"
								id="last_name"
								bind:value={registrationForm.last_name}
								required
								disabled={isSubmitting}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder="Doe"
							/>
						</div>
					</div>

					<!-- Gender -->
					<div>
						<label for="gender" class="block text-sm font-medium text-gray-700 mb-1">
							Gender <span class="text-red-500">*</span>
						</label>
						<select
							id="gender"
							bind:value={registrationForm.gender}
							required
							disabled={isSubmitting}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
						>
							<option value="Male">Male</option>
							<option value="Female">Female</option>
						</select>
					</div>

					<!-- Contact Number -->
					<div>
						<label for="contact_number" class="block text-sm font-medium text-gray-700 mb-1">
							Contact Number <span class="text-red-500">*</span>
						</label>
						<input
							type="tel"
							id="contact_number"
							bind:value={registrationForm.contact_number}
							required
							disabled={isSubmitting}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
							placeholder="+639123456789"
						/>
						<p class="mt-1 text-sm text-gray-500">Format: +639xxxxxxxxx</p>
					</div>

					<!-- Email -->
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700 mb-1">
							Email Address
						</label>
						<input
							type="email"
							id="email"
							bind:value={registrationForm.email}
							disabled={isSubmitting}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
							placeholder="john.doe@example.com"
						/>
					</div>

					<!-- Birthday -->
					<div>
						<label for="birthday" class="block text-sm font-medium text-gray-700 mb-1">
							Birthday
						</label>
						<input
							type="date"
							id="birthday"
							bind:value={registrationForm.birthday}
							max={getTodayDate()}
							disabled={isSubmitting}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
						/>
					</div>

					<!-- School Name -->
					<div>
						<label for="school_name" class="block text-sm font-medium text-gray-700 mb-1">
							School Name <span class="text-red-500">*</span>
						</label>
						<input
							type="text"
							id="school_name"
							bind:value={registrationForm.school_name}
							required
							disabled={isSubmitting}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
							placeholder="Your School Name"
						/>
					</div>

					<!-- Location Fields -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label for="barangay" class="block text-sm font-medium text-gray-700 mb-1">
								Barangay <span class="text-red-500">*</span>
							</label>
							<input
								type="text"
								id="barangay"
								bind:value={registrationForm.barangay}
								required
								disabled={isSubmitting}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder="Barangay Name"
							/>
						</div>
						<div>
							<label for="city" class="block text-sm font-medium text-gray-700 mb-1">
								City <span class="text-red-500">*</span>
							</label>
							<input
								type="text"
								id="city"
								bind:value={registrationForm.city}
								required
								disabled={isSubmitting}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder="City Name"
							/>
						</div>
					</div>

					<!-- Social Media Name -->
					<div>
						<label for="social_media_name" class="block text-sm font-medium text-gray-700 mb-1">
							Social Media Name
						</label>
						<input
							type="text"
							id="social_media_name"
							bind:value={registrationForm.social_media_name}
							disabled={isSubmitting}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
							placeholder="Facebook/Messenger Handle"
						/>
					</div>

					<!-- DGroup Member -->
					<div>
						<label for="is_dgroup_member" class="block text-sm font-medium text-gray-700 mb-1">
							Are you a member of a DGroup? <span class="text-red-500">*</span>
						</label>
						<select
							id="is_dgroup_member"
							value={registrationForm.is_dgroup_member ? 'true' : 'false'}
							on:change={(e) => {
								registrationForm.is_dgroup_member = e.currentTarget.value === 'true';
							}}
							required
							disabled={isSubmitting}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
						>
							<option value="false">No</option>
							<option value="true">Yes</option>
						</select>
					</div>

					<!-- DGroup Leader Name -->
					<div>
						<label for="dgroup_leader_name" class="block text-sm font-medium text-gray-700 mb-1">
							Name of your DGroup Leader
						</label>
						<input
							type="text"
							id="dgroup_leader_name"
							bind:value={registrationForm.dgroup_leader_name}
							disabled={isSubmitting}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
							placeholder="DGroup Leader Name (optional)"
						/>
					</div>

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
		{/if}

		<!-- Path 2: Returning User Check-In -->
		{#if activePath === 'returning'}
			<div class="bg-white rounded-xl shadow-lg p-6 sm:p-8">
				<h2 class="text-2xl font-semibold text-gray-900 mb-6">Returning User Check-In</h2>

				<!-- Search & Check-In Section -->
				<div class="mb-8">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">Search & Check-In</h3>

					<!-- Search Input -->
					<div class="mb-6">
						<label for="search" class="block text-sm font-medium text-gray-700 mb-2">
							Search by Name or Contact Number
						</label>
						<div class="relative">
							<input
								type="text"
								id="search"
								bind:value={searchQuery}
								on:input={(e) => handleSearchInput(e.currentTarget.value)}
								disabled={isSubmitting}
								class="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder="Type your name or contact number..."
								autocomplete="off"
							/>
							<svg
								class="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								></path>
							</svg>
							{#if isSearching}
								<div class="absolute right-3 top-3.5">
									<svg
										class="animate-spin h-5 w-5 text-indigo-600"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
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
								</div>
							{/if}
						</div>
						{#if searchQuery && searchQuery.length < 2}
							<p class="mt-1 text-sm text-gray-500">Type at least 2 characters to search</p>
						{/if}
					</div>

					<!-- Search Results -->
					{#if searchResults.length > 0}
						<div class="space-y-2">
							<p class="text-sm font-medium text-gray-700 mb-3">
								Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}:
							</p>
							{#each searchResults as result (result.id)}
								<button
									type="button"
									on:click={() => handleCheckIn(result.id, result.first_name)}
									disabled={isSubmitting}
									class="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<div class="flex items-center justify-between">
										<div>
											<p class="font-medium text-gray-900">{result.full_name}</p>
											<p class="text-sm text-gray-500 mt-1">
												Contact: {formatContactNumber(result.contact_number)}
											</p>
										</div>
										<svg
											class="w-5 h-5 text-indigo-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											></path>
										</svg>
									</div>
								</button>
							{/each}
						</div>
					{:else if searchQuery && searchQuery.length >= 2 && !isSearching}
						<div class="text-center py-8 text-gray-500">
							<p>No results found. Please check your spelling or try a different search term.</p>
						</div>
					{:else if !searchQuery}
						<div class="text-center py-8 text-gray-500">
							<p>Start typing your name or contact number to search for your record.</p>
						</div>
					{/if}
				</div>

				<!-- Checked-In Attendees List -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-gray-900">
							Checked-In Attendees Today ({checkedInAttendees.length})
						</h3>
						<button
							type="button"
							on:click={loadCheckedInAttendees}
							disabled={isLoadingCheckedIn}
							class="text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
						>
							<svg
								class="w-4 h-4 {isLoadingCheckedIn ? 'animate-spin' : ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								></path>
							</svg>
							Refresh
						</button>
					</div>

					{#if isLoadingCheckedIn}
						<div class="text-center py-4 text-gray-500">
							<p>Loading checked-in attendees...</p>
						</div>
					{:else if checkedInAttendees.length > 0}
						<div class="space-y-2 max-h-64 overflow-y-auto">
							{#each checkedInAttendees as attendee (attendee.attendance_log_id)}
								<div
									class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
								>
									<div class="flex-1">
										<p class="font-medium text-gray-900">{attendee.full_name}</p>
										<p class="text-sm text-gray-500">
											Checked in at {formatCheckInTime(attendee.check_in_time)}
										</p>
									</div>
									<button
										type="button"
										on:click={() => handleRemoveCheckIn(attendee.attendance_log_id, attendee.full_name)}
										disabled={isSubmitting}
										class="ml-4 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										title="Remove from attendance"
									>
										<svg
											class="w-5 h-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M6 18L18 6M6 6l12 12"
											></path>
										</svg>
									</button>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-center py-4 text-gray-500 border border-gray-200 rounded-lg">
							<p>No attendees checked in yet today.</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
