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
	class="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
>
	<div class="flex items-center justify-between">
		<div>
			<p class="font-medium text-gray-900">{result.full_name}</p>
			<p class="text-sm text-gray-500 mt-1">Contact: {formatContactNumber(result.contact_number)}</p>
		</div>
		<svg
			class="w-5 h-5 text-indigo-600"
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
</button>

