<script lang="ts">
	interface Props {
		value: string;
		onInput: (value: string) => void;
		isSearching?: boolean;
		disabled?: boolean;
		placeholder?: string;
	}

	let {
		value,
		onInput,
		isSearching = false,
		disabled = false,
		placeholder = 'Type your name or contact number...'
	}: Props = $props();
</script>

<div class="relative">
	<input
		type="text"
		bind:value
		oninput={(e) => onInput(e.currentTarget.value)}
		{disabled}
		{placeholder}
		autocomplete="off"
		class="w-full px-4 py-4 pl-12 border-2 border-gray-200 rounded-xl focus-brand disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-300 text-lg font-medium placeholder-gray-400 shadow-sm hover:shadow-md"
	/>
	<svg
		class="absolute left-4 top-4.5 h-6 w-6 text-gray-400"
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
			d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
		></path>
	</svg>
	{#if isSearching}
		<div class="absolute right-4 top-4.5" aria-label="Searching">
			<svg
				class="animate-spin h-6 w-6 text-red-500"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		</div>
	{/if}
</div>

