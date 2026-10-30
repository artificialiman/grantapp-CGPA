<script lang="ts">
	// Auth is frozen for testing and demos (src/lib/auth/freeze.ts): the form
	// is for show. Nothing is sent anywhere and no entry is checked; the
	// button is an ordinary link.
	let email = '';
	let password = '';
</script>

<div class="auth-container">
	<div class="auth-card">
		<div class="hero-eyebrow">Grant CGPA</div>
		<h1>Sign In</h1>

		<form on:submit|preventDefault>
			<div class="form-group">
				<label for="email">Email</label>
				<input id="email" type="email" bind:value={email} placeholder="you@example.com" />
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input id="password" type="password" bind:value={password} placeholder="••••••••" />
			</div>

			<a href="/dashboard" class="btn btn-primary btn-full">Sign In</a>
		</form>

		<div class="toggle">
			<p>Don't have an account? <a href="/signup">Sign Up</a></p>
		</div>
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




</style>
