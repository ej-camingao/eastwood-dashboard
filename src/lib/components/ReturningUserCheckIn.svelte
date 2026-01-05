<script lang="ts">
	import type { SearchResult, CheckedInAttendee } from '$lib/types/attendance';
	import SearchInput from './SearchInput.svelte';
	import AttendeeCard from './AttendeeCard.svelte';
	import AttendeeList from './AttendeeList.svelte';

	interface Props {
		searchQuery: string;
		searchResults: SearchResult[];
		isSearching: boolean;
		checkedInAttendees: CheckedInAttendee[];
		isLoadingCheckedIn: boolean;
		isSubmitting: boolean;
		onSearchInput: (value: string) => void;
		onCheckIn: (attendeeId: string, firstName: string) => void;
		onRemoveCheckIn: (attendanceLogId: string, attendeeName: string) => void;
		onRefresh: () => void;
	}

	let {
		searchQuery,
		searchResults,
		isSearching,
		checkedInAttendees,
		isLoadingCheckedIn,
		isSubmitting,
		onSearchInput,
		onCheckIn,
		onRemoveCheckIn,
		onRefresh
	}: Props = $props();

	const hasSearchResults = $derived(searchResults.length > 0);
	const showNoResults = $derived(
		searchQuery && searchQuery.length >= 2 && !isSearching && !hasSearchResults
	);
	const showEmptyState = $derived(!searchQuery);
</script>

<div class="bg-white rounded-xl shadow-lg p-6 sm:p-8">
	<h2 class="text-3xl font-bold text-gray-900 mb-8">Returning User Check-In</h2>

	<!-- Search & Check-In Section -->
	<div class="mb-8">
		<h3 class="text-xl font-bold text-gray-900 mb-4">Search & Check-In</h3>

		<!-- Search Input -->
		<div class="mb-6">
			<label for="search" class="block text-base font-semibold text-gray-900 mb-2">
				Search by Name or Contact Number
			</label>
			<SearchInput
				value={searchQuery}
				onInput={onSearchInput}
				{isSearching}
				disabled={isSubmitting}
			/>
			{#if searchQuery && searchQuery.length < 2}
				<p class="mt-2 text-sm text-gray-600">Type at least 2 characters to search</p>
			{/if}
		</div>

		<!-- Search Results -->
		{#if hasSearchResults}
			<div class="space-y-2">
				<p class="text-base font-semibold text-gray-900 mb-3">
					Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}:
				</p>
				{#each searchResults as result (result.id)}
					<AttendeeCard {result} onCheckIn={onCheckIn} disabled={isSubmitting} />
				{/each}
			</div>
		{:else if showNoResults}
			<div class="text-center py-8 text-gray-500">
				<p>No results found. Please check your spelling or try a different search term.</p>
			</div>
		{:else if showEmptyState}
			<div class="text-center py-8 text-gray-500">
				<p>Start typing your name or contact number to search for your record.</p>
			</div>
		{/if}
	</div>

	<!-- Checked-In Attendees List -->
	<AttendeeList
		attendees={checkedInAttendees}
		{isLoadingCheckedIn}
		onRemove={onRemoveCheckIn}
		onRefresh={onRefresh}
		disabled={isSubmitting}
	/>
</div>

