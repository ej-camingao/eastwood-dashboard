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

<div>
	<label for={id} class="block text-sm font-medium text-gray-700 mb-1">
		{label} {#if required}<span class="text-red-500">*</span>{/if}
	</label>
	{@render children()}
	{#if helpText}
		<p class="mt-1 text-sm text-gray-500">{helpText}</p>
	{/if}
	{#if error}
		<p class="mt-1 text-sm text-red-600" role="alert">{error}</p>
	{/if}
</div>

