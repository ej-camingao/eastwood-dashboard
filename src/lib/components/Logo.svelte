<script lang="ts">
	interface Props {
		size?: 'sm' | 'md' | 'lg' | 'xl';
		className?: string;
	}

	let { size = 'md', className = '' }: Props = $props();

	const sizeClasses = {
		sm: 'h-8',
		md: 'h-12',
		lg: 'h-16',
		xl: 'h-20'
	};
</script>

<div class="flex justify-center {className}">
	<img 
		src="/elevate-full-logo.png" 
		alt="Elevate Saturday Service" 
		class="{sizeClasses[size]} w-auto object-contain"
	/>
</div>