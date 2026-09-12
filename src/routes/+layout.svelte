<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { client } from '$lib/supabase';
	import { goto } from '$app/navigation';

	let online = true;

	// Same "auth state, not URL path" fix grantapp-shell's own nav
	// history already learned the hard way (see that repo's +layout.svelte
	// comment) — applied here from the start rather than re-discovered.
	$: isLoggedIn = !!$page.data.session;

	async function handleSignOut() {
		await client.auth.signOut();
		await goto('/login');
	}

	onMount(() => {
		const handleOnline = () => (online = true);
		const handleOffline = () => (online = false);

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		online = navigator.onLine;

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});
</script>

<nav class="site-nav" class:nav-dashboard={isLoggedIn}>
	<div class="nav-left">
		<a href={isLoggedIn ? '/dashboard' : '/'} class="brand">Grant <span>CGPA</span></a>
	</div>

	{#if isLoggedIn}
		<div class="nav-links">
			<a href="/dashboard" class:current={$page.url.pathname === '/dashboard'}>Dashboard</a>
		</div>
	{:else}
		<div class="nav-links">
			<a href="/" class:current={$page.url.pathname === '/'}>Home</a>
			<a href="/login" class:current={$page.url.pathname === '/login'}>Login</a>
		</div>
	{/if}

	<div class="nav-right">
		{#if !online}
			<span class="nav-badge offline">Offline</span>
		{/if}
		{#if isLoggedIn}
			<button class="nav-signout" on:click={handleSignOut}>Sign out</button>
		{/if}
	</div>
</nav>

<main>
	<slot />
</main>

<footer>
	<p>&copy; 2026 Grant CGPA. All rights reserved.</p>
</footer>

<style>
	main {
		min-height: 60vh;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 1.75rem;
	}

	.nav-links a {
		font-family: var(--font-sans);
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--muted);
		transition: color 0.2s ease;
	}

	.nav-links a:hover,
	.nav-links a.current {
		color: var(--text);
	}

	.nav-signout {
		font-family: var(--font-sans);
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: color 0.2s ease;
	}

	.nav-signout:hover {
		color: var(--text);
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		min-width: 0;
	}

	.nav-badge.offline {
		font-family: var(--font-mono);
		color: var(--accent);
		border-color: rgba(245, 158, 11, 0.3);
		background: var(--accent-dim);
	}
</style>
