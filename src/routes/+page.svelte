<script lang="ts">
	import {
		registerNewAttendeeAndCheckIn,
		searchAttendees,
		checkInAttendee,
		getCheckedInAttendeesToday,
		removeCheckIn,
		getAllFacilitatorsWithAttendees,
		getFacilitators,
		transferAttendee
	} from '$lib/services/attendance';
	import type {
		AttendeeRegistrationData,
		SearchResult,
		CheckedInAttendee,
		FacilitatorWithAttendees,
		Facilitator
	} from '$lib/types/attendance';
	import Alert from '$lib/components/Alert.svelte';
	import TabButton from '$lib/components/TabButton.svelte';
	import RegistrationForm from '$lib/components/RegistrationForm.svelte';
	import ReturningUserCheckIn from '$lib/components/ReturningUserCheckIn.svelte';
	import FacilitatorTab from '$lib/components/FacilitatorTab.svelte';
	import { validateRegistrationForm } from '$lib/utils/validation';

	// Form state for first-time registration
	let registrationForm = $state<AttendeeRegistrationData>({
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
	});

	// Search state for returning users
	let searchQuery = $state('');
	let searchResults = $state<SearchResult[]>([]);
	let isSearching = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Checked-in attendees state
	let checkedInAttendees = $state<CheckedInAttendee[]>([]);
	let isLoadingCheckedIn = $state(false);

	// Facilitator state
	let facilitators = $state<FacilitatorWithAttendees[]>([]);
	let availableFacilitators = $state<Facilitator[]>([]);
	let isLoadingFacilitators = $state(false);

	// UI state
	let activePath: 'new' | 'returning' | 'facilitators' = $state('new');
	let isSubmitting = $state(false);
	let successMessage = $state('');
	let errorMessage = $state('');

	// Password protection for facilitators tab
	const FACILITATOR_PASSWORD = 'Matt281920';
	let facilitatorPasswordInput = $state('');
	let isPasswordAuthenticated = $state(false);
	let showPasswordModal = $state(false);
	let passwordError = $state('');

	// Computed values using $derived
	const hasSearchResults = $derived(searchResults.length > 0);
	const showNoResults = $derived(
		searchQuery && searchQuery.length >= 2 && !isSearching && !hasSearchResults
	);
	const showEmptyState = $derived(!searchQuery);

	// Debounced search function with improved cleanup
	function handleSearchInput(value: string) {
		searchQuery = value;

		if (searchTimeout) {
			clearTimeout(searchTimeout);
			searchTimeout = null;
		}

		if (value.trim().length < 2) {
			searchResults = [];
			isSearching = false;
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
			searchTimeout = null;
		}, 400);
	}

	// Cleanup search timeout on component unmount or path change
	$effect(() => {
		return () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout);
				searchTimeout = null;
			}
		};
	});

	// Handle first-time registration
	async function handleRegistration() {
		// Clear previous messages
		successMessage = '';
		errorMessage = '';

		// Prepend +63 to contact number if not already present
		const contactNumber = registrationForm.contact_number.trim();
		const formattedContactNumber = contactNumber.startsWith('+63')
			? contactNumber
			: `+63${contactNumber}`;

		// Create form data with formatted contact number for validation
		const formDataForValidation = {
			...registrationForm,
			contact_number: formattedContactNumber
		};

		// Client-side validation using shared utility
		const validation = validateRegistrationForm(formDataForValidation);
		if (!validation.isValid) {
			showError(validation.error || 'Please fill in all required fields.');
			return;
		}

		isSubmitting = true;

		try {
			// Submit with formatted contact number
			const response = await registerNewAttendeeAndCheckIn({
				...registrationForm,
				contact_number: formattedContactNumber
			});

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

	// Handle form updates
	function handleFormUpdate(data: Partial<AttendeeRegistrationData>) {
		registrationForm = { ...registrationForm, ...data };
	}

	// Load facilitators
	async function loadFacilitators() {
		isLoadingFacilitators = true;
		const [facilitatorsResponse, availableResponse] = await Promise.all([
			getAllFacilitatorsWithAttendees(),
			getFacilitators()
		]);
		isLoadingFacilitators = false;

		if (facilitatorsResponse.success && facilitatorsResponse.data) {
			facilitators = facilitatorsResponse.data;
		} else {
			facilitators = [];
			if (facilitatorsResponse.error) {
				console.error('Failed to load facilitators:', facilitatorsResponse.error);
			}
		}

		if (availableResponse.success && availableResponse.data) {
			availableFacilitators = availableResponse.data;
		} else {
			availableFacilitators = [];
		}
	}

	// Handle transferring an attendee
	async function handleTransferAttendee(attendeeId: string, newFacilitatorId: string | null) {
		const response = await transferAttendee(attendeeId, newFacilitatorId);
		if (!response.success) {
			throw new Error(response.error || 'Failed to transfer attendee.');
		}
		// Reload facilitators after transfer
		await loadFacilitators();
	}

	// Password handling functions
	function handlePasswordSubmit() {
		if (facilitatorPasswordInput === FACILITATOR_PASSWORD) {
			isPasswordAuthenticated = true;
			showPasswordModal = false;
			facilitatorPasswordInput = '';
			passwordError = '';
			// Switch to facilitators tab
			activePath = 'facilitators';
			errorMessage = '';
			successMessage = '';
		} else {
			passwordError = 'Incorrect password. Please try again.';
			facilitatorPasswordInput = '';
		}
	}

	function closePasswordModal() {
		showPasswordModal = false;
		facilitatorPasswordInput = '';
		passwordError = '';
		// If closing without authentication, don't switch tabs
		if (!isPasswordAuthenticated) {
			// Stay on current tab or switch to 'new'
			if (activePath === 'facilitators') {
				activePath = 'new';
			}
		}
	}

	// Handle tab switching
	function handleTabSwitch(path: 'new' | 'returning' | 'facilitators') {
		// Check password if switching to facilitators tab
		if (path === 'facilitators' && !isPasswordAuthenticated) {
			showPasswordModal = true;
			passwordError = '';
			facilitatorPasswordInput = '';
			return; // Don't switch yet, wait for password
		}

		activePath = path;
		errorMessage = '';
		successMessage = '';
		if (path === 'returning') {
			searchQuery = '';
			searchResults = [];
		}
	}

	// Load checked-in attendees when returning tab is active
	$effect(() => {
		if (activePath === 'returning') {
			loadCheckedInAttendees();
		} else if (activePath === 'facilitators') {
			loadFacilitators();
		}
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
	<div class="max-w-7xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-10">
			<h1 class="text-5xl font-bold text-gray-900 mb-3">Elevate Saturday Service</h1>
			<p class="text-xl text-gray-700 font-medium">Registration & Check-In</p>
		</div>

		<!-- Path Toggle -->
		<div class="flex justify-center mb-8">
			<div class="inline-flex rounded-lg bg-white p-1 shadow-md">
				<TabButton
					label="First-Time Registration"
					isActive={activePath === 'new'}
					onClick={() => handleTabSwitch('new')}
				/>
				<TabButton
					label="Returning User Check-In"
					isActive={activePath === 'returning'}
					onClick={() => handleTabSwitch('returning')}
				/>
				<TabButton
					label="Facilitators"
					isActive={activePath === 'facilitators'}
					onClick={() => handleTabSwitch('facilitators')}
				/>
			</div>
		</div>

		<!-- Messages -->
		{#if successMessage}
			<Alert type="success" message={successMessage} />
		{/if}

		{#if errorMessage}
			<Alert type="error" message={errorMessage} />
		{/if}

		<!-- Path 1: First-Time Registration -->
		{#if activePath === 'new'}
			<RegistrationForm
				formData={registrationForm}
				{isSubmitting}
				onSubmit={handleRegistration}
				onUpdate={handleFormUpdate}
			/>
		{/if}

		<!-- Path 2: Returning User Check-In -->
		{#if activePath === 'returning'}
			<ReturningUserCheckIn
				{searchQuery}
				{searchResults}
				{isSearching}
				{checkedInAttendees}
				{isLoadingCheckedIn}
				{isSubmitting}
				onSearchInput={handleSearchInput}
				onCheckIn={handleCheckIn}
				onRemoveCheckIn={handleRemoveCheckIn}
				onRefresh={loadCheckedInAttendees}
			/>
		{/if}

		<!-- Path 3: Facilitators -->
		{#if activePath === 'facilitators' && isPasswordAuthenticated}
			<FacilitatorTab
				{facilitators}
				{availableFacilitators}
				isLoading={isLoadingFacilitators}
				onTransfer={handleTransferAttendee}
				onRefresh={loadFacilitators}
				disabled={isSubmitting}
			/>
		{/if}
	</div>

	<!-- Password Modal -->
	{#if showPasswordModal}
		<div
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
			onclick={closePasswordModal}
			role="dialog"
			aria-modal="true"
			aria-labelledby="password-modal-title"
		>
			<div
				class="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
				onclick={(e) => e.stopPropagation()}
			>
				<h3 id="password-modal-title" class="text-lg font-semibold text-gray-900 mb-4">
					Enter Password to Access Facilitators
				</h3>

				{#if passwordError}
					<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
						<p class="text-sm text-red-600">{passwordError}</p>
					</div>
				{/if}

				<div class="mb-4">
					<label for="password-input" class="block text-sm font-medium text-gray-700 mb-2">
						Password
					</label>
					<input
						type="password"
						id="password-input"
						bind:value={facilitatorPasswordInput}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								handlePasswordSubmit();
							}
						}}
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
						placeholder="Enter password"
						autofocus
					/>
				</div>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={closePasswordModal}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={handlePasswordSubmit}
						class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
					>
						Submit
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
