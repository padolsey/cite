<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	
	let { children } = $props();
</script>

<svelte:head>
	<title>CITE Demo - Context, Interception, Thinking, Escalation</title>
	<meta name="description" content="CITE Framework Demo: A responsible AI system demonstrating Context management, Interception, Thinking, and Escalation capabilities for safe and helpful conversations." />
	<meta name="theme-color" content="#2563eb" />
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
