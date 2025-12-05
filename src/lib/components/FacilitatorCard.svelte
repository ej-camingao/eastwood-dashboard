<script lang="ts">
	import type { FacilitatorWithAttendees, CheckedInAttendee } from '$lib/types/attendance';
	import { formatCheckInTime } from '$lib/utils/formatting';

	interface Props {
		facilitator: FacilitatorWithAttendees;
		onTransfer: (attendeeId: string, attendeeName: string, attendeeGender: 'Male' | 'Female') => void;
		disabled?: boolean;
	}

	let { facilitator, onTransfer, disabled = false }: Props = $props();

	const fullName = `${facilitator.first_name} ${facilitator.last_name}`;
</script>

<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
	<div class="flex items-center justify-between mb-4">
		<div>
			<h3 class="text-lg font-semibold text-gray-900">{fullName}</h3>
			<p class="text-sm text-gray-500">
				{facilitator.gender} Facilitator • {facilitator.attendee_count} attendee{facilitator.attendee_count !== 1 ? 's' : ''}
			</p>
		</div>
	</div>

	{#if facilitator.attendees.length > 0}
		<div class="space-y-2 max-h-64 overflow-y-auto">
			{#each facilitator.attendees as attendee (attendee.attendee_id)}
				<div
					class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
				>
					<div class="flex-1">
						<p class="font-medium text-gray-900">{attendee.full_name}</p>
						<p class="text-sm text-gray-500">Checked in at {formatCheckInTime(attendee.check_in_time)}</p>
					</div>
					<button
						type="button"
						onclick={() => onTransfer(attendee.attendee_id, attendee.full_name, facilitator.gender)}
						disabled={disabled}
						class="ml-4 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200"
						title="Transfer to different facilitator"
						aria-label="Transfer {attendee.full_name} to different facilitator"
					>
						Transfer
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-6 text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
			<p>No attendees assigned yet</p>
		</div>
	{/if}
</div>

