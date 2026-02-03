<script lang="ts">
	interface Props {
		id: string;
		label: string;
		required?: boolean;
		error?: string;
		helpText?: string;
		disabled?: boolean;
		children: import('svelte').Snippet;
	}

	let { id, label, required = false, error, helpText, disabled = false, children }: Props = $props();
</script>

<div class="space-y-2">
	<label for={id} class="block text-base font-semibold text-gray-900">
		{label} {#if required}<span class="text-red-500 font-bold ml-1">*</span>{/if}
	</label>
	{@render children()}
	{#if helpText}
		<p class="text-sm text-gray-600 font-medium">{helpText}</p>
	{/if}
	{#if error}
		<p class="text-sm font-semibold text-red-600 animate-fade-in" role="alert">{error}</p>
	{/if}
</div>

