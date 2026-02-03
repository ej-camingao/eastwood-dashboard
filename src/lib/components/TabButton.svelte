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
	class="px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 transform {isActive
		? 'bg-brand-gradient text-white shadow-brand scale-105'
		: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}"
	onclick={onClick}
	aria-pressed={isActive}
>
	{label}
</button>

