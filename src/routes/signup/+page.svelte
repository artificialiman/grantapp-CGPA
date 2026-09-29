<script lang="ts">
	import { client } from '$lib/supabase';
	import { computeDeviceFingerprint, guessDeviceLabel } from '$lib/auth/deviceFingerprint';

	let email = '';
	let password = '';
	let fullName = '';

	let loading = false;
	let error: string | null = null;
	let blockedDevices: { id: number; device_label: string | null; last_active_at: string }[] | null = null;

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (loading) return;
		loading = true;
		error = null;
		blockedDevices = null;

		try {
			const { error: signUpError, data: signUpData } = await client.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/auth/callback`
				}
			});

			if (signUpError) {
				error = signUpError.message;
				loading = false;
				return;
			}

			if (!signUpData.session) {
				error = 'Check your email to confirm your account, then sign in to finish setup.';
				loading = false;
				return;
			}

			const deviceHash = await computeDeviceFingerprint();
			const deviceLabel = guessDeviceLabel();

			const deviceResponse = await fetch('/api/check-device', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ device_hash: deviceHash, device_label: deviceLabel })
			});
			const deviceResult = await deviceResponse.json();

			if (!deviceResponse.ok) {
				error = deviceResult.message ?? 'Failed to register device';
				loading = false;
				return;
			}

			if (!deviceResult.allowed) {
				blockedDevices = deviceResult.devices;
				loading = false;
				return;
			}

			const completeResponse = await fetch('/api/complete-signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ full_name: fullName })
			});

			if (!completeResponse.ok) {
				const completeError = await completeResponse.json();
				error = completeError.message || 'Failed to finish setting up your account';
				loading = false;
				return;
			}

			window.location.href = '/faculties';
		} catch (err) {
			error = (err as Error).message || 'An error occurred';
			loading = false;
		}
	}

	async function removeDeviceAndRetry(deviceId: number) {
		loading = true;
		try {
			const res = await fetch('/api/remove-device', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ device_id: deviceId })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = body.message ?? 'Failed to remove device';
				loading = false;
				return;
			}
			blockedDevices = null;
			await handleSubmit(new Event('retry'));
		} catch (err) {
			error = (err as Error).message || 'Failed to remove device';
			loading = false;
		}
	}
</script>

<div class="auth-container">
	<div class="auth-card">
		<div class="hero-eyebrow">Grant CGPA</div>
		<h1>Create your account</h1>

		{#if error}
			<div class="error-banner" class:success={error.includes('Check your email')}>
				<div class="error-content">
					<p>{error}</p>
				</div>
			</div>
		{/if}

		{#if blockedDevices}
			<div class="error-banner">
				<div class="error-content">
					<h3>Device limit reached</h3>
					<p>Your account is already active on 2 devices. Remove one to continue on this device.</p>
				</div>
			</div>
			<ul class="device-list">
				{#each blockedDevices as device}
					<li class="device-row">
						<div>
							<div class="device-label">{device.device_label ?? 'Unknown device'}</div>
							<div class="device-meta">Last active {new Date(device.last_active_at).toLocaleDateString()}</div>
						</div>
						<button class="btn btn-danger btn-sm" disabled={loading} on:click={() => removeDeviceAndRetry(device.id)}>
							Remove
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<form on:submit={handleSubmit}>
				<div class="form-group">
					<label for="fullName">Full name</label>
					<input id="fullName" type="text" bind:value={fullName} required disabled={loading} placeholder="Ada Lovelace" />
				</div>

				<div class="form-group">
					<label for="email">Email</label>
					<input id="email" type="email" bind:value={email} required disabled={loading} placeholder="you@example.com" />
				</div>

				<div class="form-group">
					<label for="password">Password</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						minlength="6"
						disabled={loading}
						placeholder="••••••••"
					/>
				</div>

				<button type="submit" class="btn btn-primary btn-full" disabled={loading}>
					{loading ? 'Creating account...' : 'Sign Up'}
				</button>
			</form>

			<div class="toggle">
				<p>Already have an account? <a href="/login">Sign In</a></p>
			</div>
		{/if}
	</div>
</div>

<style>
	.auth-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 70vh;
		padding: 2rem 1rem;
	}

	.auth-card {
		width: 100%;
		max-width: 400px;
		padding: 2.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		background: var(--surface);
	}

	.hero-eyebrow {
		text-align: center;
		margin-bottom: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
	}

	h1 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		text-align: center;
		font-size: 1.6rem;
	}

	.error-banner {
		margin-bottom: 1.5rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		font-size: 0.7rem;
	}

	.btn-full {
		width: 100%;
		justify-content: center;
		padding: 0.75rem;
	}

	.toggle {
		margin-top: 1.5rem;
		text-align: center;
		font-size: 0.9rem;
		color: var(--muted);
	}

	.toggle a {
		color: var(--accent);
		font-weight: 600;
	}

	.device-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.device-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
		background: var(--surface-2);
		border: 1px solid var(--border-2);
		border-radius: var(--radius-md);
	}

	.device-label {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.device-meta {
		font-size: 0.75rem;
		color: var(--muted);
	}
</style>
