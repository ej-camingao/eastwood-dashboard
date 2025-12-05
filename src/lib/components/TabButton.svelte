<script lang="ts">
	interface Props {
		label: string;
		isActive: boolean;
		onClick: () => void;
	}

	let { label, isActive, onClick }: Props = $props();
</script>

<button
	type="button"
	class="px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 {isActive
		? 'bg-indigo-600 text-white shadow-sm'
		: 'text-gray-700 hover:text-gray-900'}"
	onclick={onClick}
	aria-pressed={isActive}
>
	{label}
</button>

