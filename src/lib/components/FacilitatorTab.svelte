<script lang="ts">
	import type { FacilitatorWithAttendees, CheckedInAttendee, Facilitator } from '$lib/types/attendance';
	import FacilitatorCard from './FacilitatorCard.svelte';
	import Alert from './Alert.svelte';

	interface Props {
		facilitators: FacilitatorWithAttendees[];
		availableFacilitators: Facilitator[];
		isLoading?: boolean;
		onTransfer: (attendeeId: string, newFacilitatorId: string | null) => Promise<void>;
		onRefresh: () => void;
		disabled?: boolean;
	}

	let { facilitators, availableFacilitators, isLoading = false, onTransfer, onRefresh, disabled = false }: Props =
		$props();

	let showTransferModal = $state(false);
	let selectedAttendeeId = $state<string | null>(null);
	let selectedAttendeeName = $state('');
	let selectedAttendeeGender = $state<'Male' | 'Female'>('Male');
	let isTransferring = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	// Group facilitators by gender
	const maleFacilitators = $derived(
		facilitators.filter((f) => f.gender === 'Male').sort((a, b) => a.first_name.localeCompare(b.first_name))
	);
	const femaleFacilitators = $derived(
		facilitators.filter((f) => f.gender === 'Female').sort((a, b) => a.first_name.localeCompare(b.first_name))
	);

	// Get available facilitators for transfer (filtered by gender)
	const availableFacilitatorsForGender = $derived((gender: 'Male' | 'Female') => {
		return availableFacilitators
			.filter((f) => f.gender === gender)
			.sort((a, b) => a.first_name.localeCompare(b.first_name));
	});

	function handleTransferClick(attendeeId: string, attendeeName: string, attendeeGender: 'Male' | 'Female') {
		selectedAttendeeId = attendeeId;
		selectedAttendeeName = attendeeName;
		selectedAttendeeGender = attendeeGender;
		showTransferModal = true;
		errorMessage = '';
		successMessage = '';
	}

	function closeTransferModal() {
		showTransferModal = false;
		selectedAttendeeId = null;
		selectedAttendeeName = '';
		errorMessage = '';
		successMessage = '';
	}

	async function handleTransferConfirm(newFacilitatorId: string | null) {
		if (!selectedAttendeeId) return;

		isTransferring = true;
		errorMessage = '';
		successMessage = '';

		try {
			await onTransfer(selectedAttendeeId, newFacilitatorId);
			successMessage = `Successfully transferred ${selectedAttendeeName}.`;
			setTimeout(() => {
				closeTransferModal();
				onRefresh();
			}, 1000);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to transfer attendee.';
		} finally {
			isTransferring = false;
		}
	}

	function showSuccess(message: string) {
		successMessage = message;
		setTimeout(() => {
			successMessage = '';
		}, 5000);
	}

	function showError(message: string) {
		errorMessage = message;
	}
</script>

<div>
	<div class="flex items-center justify-between mb-6">
		<h2 class="text-2xl font-bold text-gray-900">Facilitators & Breakout Groups</h2>
		<button
			type="button"
			onclick={onRefresh}
			disabled={isLoading || disabled}
			class="text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
		>
			<svg
				class="w-4 h-4 {isLoading ? 'animate-spin' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
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

	{#if isLoading}
		<div class="text-center py-8 text-gray-500">
			<p>Loading facilitators...</p>
		</div>
	{:else if facilitators.length === 0}
		<div class="text-center py-8 text-gray-500 border border-gray-200 rounded-lg bg-white">
			<p>No facilitators found. Please add facilitators in Supabase.</p>
		</div>
	{:else}
		<div class="space-y-8">
			<!-- Male Facilitators -->
			{#if maleFacilitators.length > 0}
				<div>
					<h3 class="text-xl font-semibold text-gray-900 mb-4">Male Facilitators</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each maleFacilitators as facilitator (facilitator.id)}
							<FacilitatorCard
								{facilitator}
								onTransfer={handleTransferClick}
								{disabled}
							/>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Female Facilitators -->
			{#if femaleFacilitators.length > 0}
				<div>
					<h3 class="text-xl font-semibold text-gray-900 mb-4">Female Facilitators</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each femaleFacilitators as facilitator (facilitator.id)}
							<FacilitatorCard
								{facilitator}
								onTransfer={handleTransferClick}
								{disabled}
							/>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Transfer Modal -->
	{#if showTransferModal}
		<div
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
			onclick={closeTransferModal}
			role="dialog"
			aria-modal="true"
			aria-labelledby="transfer-modal-title"
		>
			<div
				class="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
				onclick={(e) => e.stopPropagation()}
			>
				<h3 id="transfer-modal-title" class="text-lg font-semibold text-gray-900 mb-4">
					Transfer {selectedAttendeeName}
				</h3>

				{#if errorMessage}
					<Alert type="error" message={errorMessage} />
				{/if}

				{#if successMessage}
					<Alert type="success" message={successMessage} />
				{/if}

				<div class="mb-4">
					<label for="facilitator-select" class="block text-sm font-medium text-gray-700 mb-2">
						Select New Facilitator ({selectedAttendeeGender})
					</label>
					<select
						id="facilitator-select"
						disabled={isTransferring || disabled}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<option value="">Unassign (No Facilitator)</option>
						{#each availableFacilitatorsForGender(selectedAttendeeGender) as facilitator}
							<option value={facilitator.id}>
								{facilitator.first_name} {facilitator.last_name}
							</option>
						{/each}
					</select>
				</div>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={closeTransferModal}
						disabled={isTransferring}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={() => {
							const select = document.getElementById('facilitator-select') as HTMLSelectElement;
							const newFacilitatorId = select.value || null;
							handleTransferConfirm(newFacilitatorId);
						}}
						disabled={isTransferring || disabled}
						class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isTransferring ? 'Transferring...' : 'Transfer'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

