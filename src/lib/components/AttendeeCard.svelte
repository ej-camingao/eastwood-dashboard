<script lang="ts">
	import type { SearchResult } from '$lib/types/attendance';
	import { formatContactNumber } from '$lib/utils/formatting';

	interface Props {
		result: SearchResult;
		onCheckIn: (attendeeId: string, firstName: string) => void;
		disabled?: boolean;
	}

	let { result, onCheckIn, disabled = false }: Props = $props();
</script>

<button
	type="button"
	onclick={() => onCheckIn(result.id, result.first_name)}
	{disabled}
	class="w-full text-left p-6 border-2 border-gray-200 rounded-xl hover:border-red-300 hover:shadow-brand focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 bg-white"
>
	<div class="flex items-center justify-between">
		<div class="flex items-center">
			<div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mr-4">
				<svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
				</svg>
			</div>
			<div>
				<p class="font-bold text-gray-900 text-lg">{result.full_name}</p>
				<p class="text-sm text-gray-600 font-medium mt-1">Contact: {formatContactNumber(result.contact_number)}</p>
			</div>
		</div>
		<div class="flex items-center">
			<span class="text-sm font-semibold text-red-600 mr-2">Check In</span>
			<svg
				class="w-6 h-6 text-red-600"
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
					d="M9 5l7 7-7 7"
				></path>
			</svg>
		</div>
	</div>
</button>

