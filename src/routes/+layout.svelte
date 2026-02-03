<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/elevate-logo.png" type="image/png" />
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
	<title>Elevate Saturday Service - Registration & Check-In</title>
	<meta name="description" content="Registration and check-in system for Elevate Saturday Service">
</svelte:head>

<div class="min-h-screen bg-hero-gradient font-['Inter']">
	{@render children()}
</div>
