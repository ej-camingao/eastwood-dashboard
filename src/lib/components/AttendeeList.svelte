<script lang="ts">
	import type { CheckedInAttendee } from '$lib/types/attendance';
	import { formatCheckInTime } from '$lib/utils/formatting';

	interface Props {
		attendees: CheckedInAttendee[];
		isLoading?: boolean;
		onRemove: (attendanceLogId: string, attendeeName: string) => void;
		onRefresh: () => void;
		disabled?: boolean;
	}

	let { attendees, isLoading = false, onRemove, onRefresh, disabled = false }: Props = $props();
</script>

<div>
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-gray-900">Checked-In Attendees Today ({attendees.length})</h3>
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
		<div class="text-center py-4 text-gray-500">
			<p>Loading checked-in attendees...</p>
		</div>
	{:else if attendees.length > 0}
		<div class="space-y-2 max-h-64 overflow-y-auto">
			{#each attendees as attendee (attendee.attendance_log_id)}
				<div
					class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
				>
					<div class="flex-1">
						<p class="font-medium text-gray-900">{attendee.full_name}</p>
						<p class="text-sm text-gray-500">Checked in at {formatCheckInTime(attendee.check_in_time)}</p>
					</div>
					<button
						type="button"
						onclick={() => onRemove(attendee.attendance_log_id, attendee.full_name)}
						disabled={disabled}
						class="ml-4 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						title="Remove from attendance"
						aria-label="Remove {attendee.full_name} from attendance"
					>
						<svg
							class="w-5 h-5"
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

