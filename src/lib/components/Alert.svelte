<script lang="ts">
	type AlertType = 'success' | 'error';

	interface Props {
		type: AlertType;
		message: string;
	}

	let { type, message }: Props = $props();
</script>

{#if message}
	<div
		class="mb-6 rounded-xl border p-4 shadow-sm animate-slide-in-up {type === 'success'
			? 'bg-green-50 border-green-200 text-green-800'
			: 'bg-red-50 border-red-200 text-red-800'}"
		role="alert"
		aria-live="polite"
	>
		<div class="flex items-center">
			{#if type === 'success'}
				<div class="flex-shrink-0">
					<svg
						class="w-5 h-5 mr-3 text-green-600"
						fill="currentColor"
						viewBox="0 0 20 20"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						></path>
					</svg>
				</div>
			{:else}
				<div class="flex-shrink-0">
					<svg
						class="w-5 h-5 mr-3 text-red-600"
						fill="currentColor"
						viewBox="0 0 20 20"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						></path>
					</svg>
				</div>
			{/if}
			<p class="font-semibold">{message}</p>
		</div>
	</div>
{/if}

