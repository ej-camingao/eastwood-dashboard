<script lang="ts">
	import {
		getDefaultFacilitatorChoices,
		listDgroupLeaderNames,
		listElevateAttendees,
		updateElevateAttendeeAdminFields
	} from '$lib/services/attendance';
	import type { Attendee, ElevateAttendeeAdminPatch, Facilitator } from '$lib/types/attendance';
	import Alert from '$lib/components/Alert.svelte';
	import AdminAttendeePanel from '$lib/components/AdminAttendeePanel.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';

	const ADMIN_SEARCH_PASSWORD = 'FaciHead';

	let unlocked = $state(false);
	let passwordInput = $state('');
	let passwordError = $state('');

	let searchQuery = $state('');
	let attendees = $state.raw<Attendee[]>([]);
	let leaderNames = $state.raw<string[]>([]);
	let isLoadingList = $state(false);

	let selected = $state.raw<Attendee | null>(null);
	let facilitatorChoices = $state.raw<Facilitator[]>([]);
	let isSaving = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let isDgroupMember = $state(false);
	let leaderName = $state('');
	let isFirstTimer = $state(false);
	let facilitatorId = $state('');

	const visibleAttendees = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return attendees;
		return attendees.filter((attendee) => {
			const fullName = `${attendee.first_name} ${attendee.last_name}`.toLowerCase();
			return (
				fullName.includes(query) ||
				attendee.first_name.toLowerCase().includes(query) ||
				attendee.last_name.toLowerCase().includes(query)
			);
		});
	});

	function syncForm(attendee: Attendee) {
		isDgroupMember = attendee.is_dgroup_member;
		leaderName = attendee.dgroup_leader_name ?? '';
		isFirstTimer = attendee.is_first_timer;
		facilitatorId = attendee.default_facilitator_id ?? '';
	}

	function sortAttendees(rows: Attendee[]): Attendee[] {
		return [...rows].sort((a, b) => {
			if (a.is_first_timer !== b.is_first_timer) return a.is_first_timer ? -1 : 1;
			return a.first_name.localeCompare(b.first_name) || a.last_name.localeCompare(b.last_name);
		});
	}

	async function loadAttendees() {
		isLoadingList = true;
		const [attendeeResponse, leaderResponse] = await Promise.all([
			listElevateAttendees(),
			listDgroupLeaderNames()
		]);
		isLoadingList = false;

		if (attendeeResponse.success && attendeeResponse.data) {
			attendees = attendeeResponse.data;
		} else {
			attendees = [];
		}

		if (leaderResponse.success && leaderResponse.data) {
			leaderNames = leaderResponse.data;
		} else {
			leaderNames = [];
		}

		errorMessage = attendeeResponse.error || leaderResponse.error || '';
	}

	async function handlePasswordSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (passwordInput === ADMIN_SEARCH_PASSWORD) {
			unlocked = true;
			passwordInput = '';
			passwordError = '';
			await loadAttendees();
			return;
		}
		passwordError = 'Incorrect password. Please try again.';
		passwordInput = '';
	}

	function handleSearchInput(value: string) {
		searchQuery = value;
		successMessage = '';
	}

	function matchDetail(attendee: Attendee): string {
		const school = attendee.school_name?.trim();
		const city = attendee.city?.trim();
		if (school && city) return `${school} · ${city}`;
		return school || city || '';
	}

	async function loadFacilitatorChoices(attendee: Attendee) {
		facilitatorChoices = [];
		if (attendee.gender !== 'Male' && attendee.gender !== 'Female') {
			errorMessage = 'This attendee has no gender that can be matched to a facilitator.';
			return;
		}

		const response = await getDefaultFacilitatorChoices(
			attendee.gender,
			attendee.default_facilitator_id ?? ''
		);
		if (selected?.id !== attendee.id) return;
		if (response.success && response.data) {
			facilitatorChoices = response.data;
		} else if (response.error) {
			errorMessage = response.error;
		}
	}

	async function selectAttendee(attendee: Attendee) {
		selected = attendee;
		syncForm(attendee);
		errorMessage = '';
		successMessage = '';
		await loadFacilitatorChoices(attendee);
	}

	async function handleSave(patch: ElevateAttendeeAdminPatch) {
		if (!selected) return;
		const attendeeId = selected.id;
		isSaving = true;
		errorMessage = '';
		successMessage = '';

		const response = await updateElevateAttendeeAdminFields(attendeeId, patch);
		isSaving = false;
		if (selected?.id !== attendeeId) return;

		if (!response.success || !response.data) {
			errorMessage = response.error || 'Failed to update attendee.';
			return;
		}

		const updated = response.data;
		selected = updated;
		syncForm(updated);
		attendees = sortAttendees(
			attendees.map((attendee) => (attendee.id === updated.id ? updated : attendee))
		);
		const leaders = await listDgroupLeaderNames();
		if (selected?.id !== attendeeId) return;
		if (leaders.success && leaders.data) {
			leaderNames = leaders.data;
			successMessage = 'Attendee updated.';
		} else {
			errorMessage = leaders.error || 'Attendee updated, but the leader list could not be refreshed.';
		}
		await loadFacilitatorChoices(updated);
	}
</script>

{#snippet attendeeRow(attendee: Attendee)}
	<li>
		<button
			type="button"
			aria-current={selected?.id === attendee.id ? 'true' : undefined}
			class="w-full rounded-xl border-2 px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 {selected?.id ===
			attendee.id
				? 'border-red-500 bg-red-50'
				: 'border-gray-200 hover:bg-red-50'}"
			onclick={() => selectAttendee(attendee)}
		>
			<span class="flex flex-wrap items-center gap-2">
				<span class="font-semibold text-gray-900">
					{attendee.first_name} {attendee.last_name}
				</span>
				{#if attendee.is_first_timer}
					<span
						class="rounded-full bg-gradient-to-r from-red-500 to-red-600 px-2 py-0.5 text-xs font-semibold text-white"
					>
						First-timer
					</span>
				{/if}
				{#if attendee.is_dgroup_member}
					<span class="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white">
						DGroup
					</span>
				{:else}
					<span class="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs font-semibold text-gray-600">
						No DGroup
					</span>
				{/if}
			</span>
			{#if matchDetail(attendee)}
				<span class="mt-0.5 block text-sm text-gray-600">{matchDetail(attendee)}</span>
			{/if}
		</button>
	</li>
{/snippet}

<div class="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
	<div class="max-w-3xl mx-auto">
		<div class="text-center mb-10">
			<div class="flex justify-center mb-6">
				<Logo size="lg" />
			</div>
			<h1 class="text-3xl sm:text-4xl font-bold text-gray-900">Attendee search</h1>
			<div class="mt-4 w-24 h-1 bg-brand-gradient mx-auto rounded-full"></div>
		</div>

		{#if !unlocked}
			<form
				class="glass rounded-2xl shadow-brand-lg max-w-md mx-auto p-8"
				onsubmit={handlePasswordSubmit}
			>
				<div class="text-center mb-6">
					<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
						<svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
							></path>
						</svg>
					</div>
					<h2 class="text-xl font-bold text-gray-900 mb-2">Officer access</h2>
					<p class="text-gray-600">Enter the password to search Elevate attendees.</p>
				</div>

				{#if passwordError}
					<Alert type="error" message={passwordError} />
				{/if}

				<label for="admin-search-password" class="block text-sm font-semibold text-gray-900 mb-3">
					Password
				</label>
				<input
					type="password"
					id="admin-search-password"
					bind:value={passwordInput}
					class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus-brand font-medium mb-6"
					placeholder="Enter password"
					autocomplete="current-password"
				/>
				<button
					type="submit"
					class="w-full px-6 py-3 text-sm font-bold text-white bg-brand-gradient rounded-xl hover:shadow-brand transition-all duration-300"
				>
					Continue
				</button>
			</form>
		{:else}
			{#if errorMessage}
				<Alert type="error" message={errorMessage} />
			{/if}
			{#if successMessage}
				<Alert type="success" message={successMessage} />
			{/if}

			<div class="glass rounded-2xl shadow-brand-lg p-8 mb-8">
				<label for="admin-attendee-search" class="block text-base font-semibold text-gray-900 mb-3">
					Search by name
				</label>
				<SearchInput
					id="admin-attendee-search"
					value={searchQuery}
					onInput={handleSearchInput}
					isSearching={isLoadingList}
					disabled={isSaving}
					placeholder="Type a first or last name..."
				/>

				{#if isLoadingList}
					<p class="mt-6 text-sm font-medium text-gray-600">Loading attendees…</p>
				{:else if visibleAttendees.length === 0}
					<p class="mt-6 text-sm font-medium text-gray-600">No Elevate attendees found</p>
				{:else}
					<div class="mt-6">
						<h2 class="mb-2 text-sm font-bold text-gray-900">
							Attendees
							<span class="font-semibold text-gray-500">({visibleAttendees.length})</span>
						</h2>
						<ul class="max-h-72 space-y-2 overflow-y-auto p-1" aria-label="Attendees">
							{#each visibleAttendees as attendee (attendee.id)}
								{@render attendeeRow(attendee)}
							{/each}
						</ul>
					</div>
				{/if}
			</div>

			{#if selected}
				<AdminAttendeePanel
					attendee={selected}
					facilitators={facilitatorChoices}
					{leaderNames}
					{isSaving}
					{isDgroupMember}
					{leaderName}
					{isFirstTimer}
					{facilitatorId}
					onDgroupMemberChange={(value) => (isDgroupMember = value)}
					onLeaderNameChange={(value) => (leaderName = value)}
					onFirstTimerChange={(value) => (isFirstTimer = value)}
					onFacilitatorIdChange={(value) => (facilitatorId = value)}
					onSave={handleSave}
				/>
			{/if}
		{/if}
	</div>
</div>
