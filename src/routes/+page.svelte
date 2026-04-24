<script lang="ts">
	import {
		registerNewAttendeeAndCheckIn,
		registerNewB1GAttendeeAndCheckIn,
		searchAttendees,
		checkInAttendee,
		getCheckedInAttendeesToday,
		removeCheckIn,
		getAllFacilitatorsWithAttendees,
		getFacilitators,
		transferAttendee,
		transferB1GAttendee
	} from '$lib/services/attendance';
	import type {
		AttendeeRegistrationData,
		B1GRegistrationData,
		Ministry,
		SearchResult,
		CheckedInAttendee,
		FacilitatorWithAttendees,
		Facilitator
	} from '$lib/types/attendance';
	import Alert from '$lib/components/Alert.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import TabButton from '$lib/components/TabButton.svelte';
	import RegistrationForm from '$lib/components/RegistrationForm.svelte';
	import B1GRegistrationForm from '$lib/components/B1GRegistrationForm.svelte';
	// import ReturningUserCheckIn from '$lib/components/ReturningUserCheckIn.svelte';
	// import FacilitatorTab from '$lib/components/FacilitatorTab.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { validateRegistrationForm } from '$lib/utils/validation';

	// Form state for first-time registration
	let registrationForm = $state<AttendeeRegistrationData>({
		first_name: '',
		last_name: '',
		has_mobile_number: true,
		contact_number: '',
		email: '',
		birthday: '',
		school_name: '',
		barangay: '',
		city: '',
		social_media_name: '',
		gender: 'Male',
		is_dgroup_member: false,
		dgroup_leader_name: '',
		heard_about_elevate: ''
	});

	// B1G Eastwood registration form state
	let b1gForm = $state<B1GRegistrationData>({
		first_name: '',
		last_name: '',
		birth_month: '',
		birth_year: '',
		contact_number: '',
		social_media_name: '',
		gender: 'Male'
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
	let activePath: 'new' | 'new_b1g' | 'returning' | 'facilitators' = $state('new');
	let isSubmitting = $state(false);
	let successMessage = $state('');
	let errorMessage = $state('');
	let showSuccessToast = $state(false);

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
					has_mobile_number: true,
					contact_number: '',
					email: '',
					birthday: '',
					school_name: '',
					barangay: '',
					city: '',
					social_media_name: '',
					gender: 'Male',
					is_dgroup_member: false,
					dgroup_leader_name: '',
					heard_about_elevate: ''
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
	async function handleCheckIn(attendeeId: string, firstName: string, ministry: Ministry = 'elevate') {
		successMessage = '';
		errorMessage = '';
		isSubmitting = true;

		try {
			const response = await checkInAttendee(attendeeId, ministry);

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
		showSuccessToast = true;
		setTimeout(() => {
			successMessage = '';
			showSuccessToast = false;
		}, 3000);
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

	function handleB1GFormUpdate(data: Partial<B1GRegistrationData>) {
		b1gForm = { ...b1gForm, ...data };
	}

	async function handleB1GRegistration() {
		successMessage = '';
		errorMessage = '';

		const contactNumber = b1gForm.contact_number.trim();
		const formattedContactNumber = contactNumber.startsWith('+63')
			? contactNumber
			: `+63${contactNumber}`;

		isSubmitting = true;
		try {
			const response = await registerNewB1GAttendeeAndCheckIn({
				...b1gForm,
				contact_number: formattedContactNumber
			});

			if (response.success) {
				showSuccess('Welcome to B1G Eastwood! You are checked in.');
				b1gForm = {
					first_name: '',
					last_name: '',
					birth_month: '',
					birth_year: '',
					contact_number: '',
					social_media_name: '',
					gender: 'Male'
				};
			} else {
				showError(response.error || 'Registration failed. Please try again.');
			}
		} catch (error) {
			showError('An unexpected error occurred. Please try again.');
			console.error('B1G registration error:', error);
		} finally {
			isSubmitting = false;
		}
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
	async function handleTransferAttendee(
		attendeeId: string,
		newFacilitatorId: string | null,
		ministry: Ministry
	) {
		const response =
			ministry === 'b1g'
				? await transferB1GAttendee(attendeeId, newFacilitatorId)
				: await transferAttendee(attendeeId, newFacilitatorId);
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
	function handleTabSwitch(path: 'new' | 'new_b1g' | 'returning' | 'facilitators') {
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

</script>

<div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
	<div class="max-w-7xl mx-auto">
		<!-- Header with Logo -->
		<div class="text-center mb-12 animate-slide-in-up">
			<div class="flex justify-center mb-6">
				<Logo size="xl" />
			</div>
			<div class="space-y-2 max-w-2xl mx-auto">
				<p class="text-xl sm:text-2xl text-gray-800 font-medium leading-snug">
					See you at May 2 for our ELEVATE x B1G Eastwood Service
				</p>
				<p class="text-lg sm:text-xl text-gray-600 font-semibold">Pre-register now!</p>
			</div>
			<div class="mt-4 w-24 h-1 bg-brand-gradient mx-auto rounded-full"></div>
		</div>

		<!-- Enhanced Tab Navigation -->
		<div class="flex justify-center mb-10">
			<div class="inline-flex rounded-xl bg-white p-1.5 shadow-brand glass">
				<TabButton
					label="Elevate Registration"
					isActive={activePath === 'new'}
					onClick={() => handleTabSwitch('new')}
				/>
				<TabButton
					label="B1G Eastwood Registration"
					isActive={activePath === 'new_b1g'}
					onClick={() => handleTabSwitch('new_b1g')}
				/>
				<!-- Temporarily hidden: Returning User + Facilitators
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
				-->
			</div>
		</div>

		<!-- Messages -->
		{#if errorMessage}
			<Alert type="error" message={errorMessage} />
		{/if}

		<!-- Path 1: Elevate Registration -->
		{#if activePath === 'new'}
			<RegistrationForm
				formData={registrationForm}
				{isSubmitting}
				onSubmit={handleRegistration}
				onUpdate={handleFormUpdate}
			/>
		{/if}

		<!-- Path 1b: B1G Eastwood Registration -->
		{#if activePath === 'new_b1g'}
			<B1GRegistrationForm
				formData={b1gForm}
				{isSubmitting}
				onSubmit={handleB1GRegistration}
				onUpdate={handleB1GFormUpdate}
			/>
		{/if}

		<!-- Path 2+3: Returning User + Facilitators (temporarily disabled)
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
		-->
	</div>

	<!-- Success Toast (Centered) -->
	<Toast type="success" message={successMessage} show={showSuccessToast} />

	<!--
		Password modal (Facilitators tab) — re-enable: replace this comment with
		{#if showPasswordModal} ... (full modal from git before "Comment out user-check-in") {/if}
	-->
</div>
