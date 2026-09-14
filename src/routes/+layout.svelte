<script lang="ts">
	import '../app.css';
	import '../glow-shimmer-motion.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { client } from '$lib/supabase';
	import { goto } from '$app/navigation';

	let online = true;
	let toolsMenuOpen = false;
	let toolsMenuEl: HTMLDivElement;

	// Same "auth state, not URL path" fix grantapp-shell's own nav
	// history already learned the hard way (see that repo's +layout.svelte
	// comment) — applied here from the start rather than re-discovered.
	$: isLoggedIn = !!$page.data.session;

	/**
	 * Doctrine dashboard content: "All exam/test screens distilled into
	 * an easy-access dropdown UI list, reachable from a persistent
	 * CTA/nav bar or tab." Lists only screens that actually exist —
	 * onboarding is the entry point into course-specific quiz/upload
	 * choices, not a flat item of its own here, since it needs a
	 * faculty/department/year/course context this dropdown doesn't
	 * carry. Extend this list as real exam/test screens are built
	 * (Quick Test, 100-day Mastery), not ahead of them existing.
	 */
	const toolLinks = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/faculties', label: 'Browse Faculties & Courses' },
		{ href: '/transcript', label: 'Transcript Tracker' },
		{ href: '/analytics', label: 'Analytics' },
		{ href: '/path-to-first-class', label: 'Path to First Class' },
		{ href: '/cgpa-calculator', label: 'CGPA Calculator' },
		{ href: '/cgpa-converter', label: 'CGPA Converter' },
		{ href: '/upload-course-material', label: 'Upload Course Material' },
		{ href: '/my-submissions', label: 'My Submissions' },
		{ href: '/whatsapp-groups', label: 'WhatsApp Groups' }
	];

	function toggleToolsMenu() {
		toolsMenuOpen = !toolsMenuOpen;
	}

	function handleClickOutside(e: MouseEvent) {
		if (toolsMenuOpen && toolsMenuEl && !toolsMenuEl.contains(e.target as Node)) {
			toolsMenuOpen = false;
		}
	}

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

		document.addEventListener('click', handleClickOutside);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<nav class="site-nav" class:nav-dashboard={isLoggedIn}>
	<div class="nav-left">
		<a href={isLoggedIn ? '/dashboard' : '/'} class="brand">Grant <span>CGPA</span></a>
	</div>

	{#if isLoggedIn}
		<div class="nav-links">
			<div class="tools-menu" bind:this={toolsMenuEl}>
				<button type="button" class="tools-menu-trigger" class:open={toolsMenuOpen} on:click={toggleToolsMenu}>
					Tools <span class="chevron">▾</span>
				</button>
				{#if toolsMenuOpen}
					<div class="tools-menu-dropdown">
						{#each toolLinks as link}
							<a
								href={link.href}
								class="tools-menu-item"
								class:current={$page.url.pathname === link.href}
								on:click={() => (toolsMenuOpen = false)}
							>
								{link.label}
							</a>
						{/each}
					</div>
				{/if}
			</div>
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

	.tools-menu {
		position: relative;
	}

	.tools-menu-trigger {
		display: flex;
		align-items: center;
		gap: 0.3rem;
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

	.tools-menu-trigger:hover,
	.tools-menu-trigger.open {
		color: var(--text);
	}

	.chevron {
		font-size: 0.7rem;
	}

	.tools-menu-dropdown {
		position: absolute;
		top: calc(100% + 0.75rem);
		left: 0;
		min-width: 220px;
		background: var(--surface);
		border: 1px solid var(--border-2);
		border-radius: var(--radius-md);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
		padding: 0.4rem;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		z-index: 200;
	}

	.tools-menu-item {
		padding: 0.55rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		color: var(--text);
		transition: background 0.15s ease;
	}

	.tools-menu-item:hover {
		background: var(--surface-2);
	}

	.tools-menu-item.current {
		color: var(--accent);
		background: var(--accent-dim);
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
