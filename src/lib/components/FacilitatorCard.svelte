<script lang="ts">
	import type { FacilitatorWithAttendees, CheckedInAttendee, Ministry } from '$lib/types/attendance';
	import { formatCheckInTime } from '$lib/utils/formatting';

	interface Props {
		facilitator: FacilitatorWithAttendees;
		onTransfer: (
			attendeeId: string,
			attendeeName: string,
			attendeeGender: 'Male' | 'Female',
			ministry: Ministry
		) => void;
		onDemote: (facilitatorId: string) => Promise<void>;
		disabled?: boolean;
	}

	let { facilitator, onTransfer, onDemote, disabled = false }: Props = $props();

	const fullName = `${facilitator.first_name} ${facilitator.last_name}`;

	let isDemoting = $state(false);

	async function handleDemoteClick() {
		if (
			!confirm(
				`Remove ${fullName} as a facilitator? Their current downlines will be re-balanced and ${facilitator.first_name} will be assigned to another facilitator's group.`
			)
		) {
			return;
		}

		isDemoting = true;
		try {
			await onDemote(facilitator.id);
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Failed to remove facilitator.');
		} finally {
			isDemoting = false;
		}
	}
</script>

<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
	<div class="flex items-center justify-between mb-4">
		<div>
			<h3 class="text-lg font-semibold text-gray-900">{fullName}</h3>
			<p class="text-sm text-gray-500">
				{facilitator.gender} Facilitator • {facilitator.attendee_count} attendee{facilitator.attendee_count !== 1 ? 's' : ''}
			</p>
		</div>
		<button
			type="button"
			onclick={handleDemoteClick}
			disabled={disabled || isDemoting}
			class="ml-4 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
			title="Remove as facilitator and reassign to another group"
		>
			{isDemoting ? 'Removing...' : 'Remove as Facilitator'}
		</button>
	</div>

	{#if facilitator.attendees.length > 0}
		<div class="space-y-2 max-h-64 overflow-y-auto">
			{#each facilitator.attendees as attendee (`${attendee.ministry}:${attendee.attendee_id}`)}
				<div
					class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
				>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<p class="font-medium text-gray-900">{attendee.full_name}</p>
							{#if attendee.ministry === 'b1g'}
								<span class="px-2 py-0.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-500 to-purple-600 rounded-full">
									B1G
								</span>
							{/if}
							{#if attendee.is_first_timer}
								<span class="px-2 py-0.5 text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-full">
									First timer
								</span>
							{/if}
						</div>
						<p class="text-sm text-gray-500">Checked in at {formatCheckInTime(attendee.check_in_time)}</p>
					</div>
					<button
						type="button"
						onclick={() => onTransfer(attendee.attendee_id, attendee.full_name, facilitator.gender, attendee.ministry)}
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

