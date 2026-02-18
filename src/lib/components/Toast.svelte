<script lang="ts">
	type ToastType = 'success' | 'error';

	interface Props {
		type: ToastType;
		message: string;
		show: boolean;
	}

	let { type, message, show }: Props = $props();
</script>

{#if show}
	<div
		class="fixed inset-0 flex items-center justify-center z-50 pointer-events-none animate-fade-in"
		role="alert"
		aria-live="assertive"
	>
		<div
			class="glass rounded-2xl shadow-brand-lg p-8 max-w-md w-full mx-4 pointer-events-auto animate-scale-in {type === 'success'
				? 'bg-green-50 border-2 border-green-300'
				: 'bg-red-50 border-2 border-red-300'}"
		>
			<div class="flex flex-col items-center text-center">
				{#if type === 'success'}
					<div
						class="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4"
					>
						<svg
							class="w-10 h-10 text-green-600"
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
					<div
						class="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4"
					>
						<svg
							class="w-10 h-10 text-red-600"
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
				<p
					class="text-xl font-bold mb-2 {type === 'success'
						? 'text-green-900'
						: 'text-red-900'}"
				>
					{type === 'success' ? 'Success!' : 'Error'}
				</p>
				<p
					class="text-lg font-semibold {type === 'success'
						? 'text-green-800'
						: 'text-red-800'}"
				>
					{message}
				</p>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes scale-in {
		from {
			transform: scale(0.9);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.animate-fade-in {
		animation: fade-in 0.3s ease-out;
	}

	.animate-scale-in {
		animation: scale-in 0.3s ease-out;
	}
</style>
