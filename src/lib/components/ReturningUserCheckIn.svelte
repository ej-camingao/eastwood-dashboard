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

<div class="glass rounded-2xl shadow-brand-lg p-8 animate-slide-in-up">
	<div class="text-center mb-8">
		<h2 class="text-3xl font-bold text-gray-900 mb-2">Returning User Check-In</h2>
		<div class="w-16 h-1 bg-brand-gradient mx-auto rounded-full"></div>
	</div>

	<!-- Search & Check-In Section -->
	<div class="mb-10">
		<div class="flex items-center mb-6">
			<div class="flex-shrink-0 w-8 h-8 bg-brand-gradient rounded-full flex items-center justify-center mr-3">
				<span class="text-white font-bold text-sm">1</span>
			</div>
			<h3 class="text-xl font-bold text-gray-900">Search & Check-In</h3>
		</div>

		<!-- Search Input -->
		<div class="mb-6">
			<label for="search" class="block text-base font-semibold text-gray-900 mb-3">
				Search by Name or Contact Number
			</label>
			<SearchInput
				value={searchQuery}
				onInput={onSearchInput}
				{isSearching}
				disabled={isSubmitting}
			/>
			{#if searchQuery && searchQuery.length < 2}
				<p class="mt-3 text-sm text-gray-600 font-medium">Type at least 2 characters to search</p>
			{/if}
		</div>

		<!-- Search Results -->
		{#if hasSearchResults}
			<div class="space-y-3">
				<p class="text-base font-bold text-gray-900 mb-4 flex items-center">
					<svg class="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
					</svg>
					Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}:
				</p>
				{#each searchResults as result (result.id)}
					<AttendeeCard {result} onCheckIn={onCheckIn} disabled={isSubmitting} />
				{/each}
			</div>
		{:else if showNoResults}
			<div class="text-center py-12 text-gray-500">
				<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8a7.962 7.962 0 01-2 5.291z"></path>
				</svg>
				<p class="font-medium">No results found</p>
				<p class="text-sm mt-1">Please check your spelling or try a different search term.</p>
			</div>
		{:else if showEmptyState}
			<div class="text-center py-12 text-gray-500">
				<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
				</svg>
				<p class="font-medium">Ready to search</p>
				<p class="text-sm mt-1">Start typing your name or contact number to find your record.</p>
			</div>
		{/if}
	</div>

	<!-- Checked-In Attendees List -->
	<div class="border-t border-gray-200 pt-8">
		<div class="flex items-center mb-6">
			<div class="flex-shrink-0 w-8 h-8 bg-brand-gradient rounded-full flex items-center justify-center mr-3">
				<span class="text-white font-bold text-sm">2</span>
			</div>
			<h3 class="text-xl font-bold text-gray-900">Today's Attendance</h3>
		</div>
		<AttendeeList
			attendees={checkedInAttendees}
			{isLoadingCheckedIn}
			onRemove={onRemoveCheckIn}
			onRefresh={onRefresh}
			disabled={isSubmitting}
		/>
	</div>
</div>

