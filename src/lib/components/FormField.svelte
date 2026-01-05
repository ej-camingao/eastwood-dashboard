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
	<label for={id} class="block text-base font-semibold text-gray-900 mb-2">
		{label} {#if required}<span class="text-red-600 font-bold ml-1">*</span>{/if}
	</label>
	{@render children()}
	{#if helpText}
		<p class="mt-2 text-sm text-gray-600">{helpText}</p>
	{/if}
	{#if error}
		<p class="mt-2 text-sm font-medium text-red-600" role="alert">{error}</p>
	{/if}
</div>

