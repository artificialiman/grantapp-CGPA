<script lang="ts">
	import { CATALOG } from '$lib/catalog';
	import { rememberProgramme } from '$lib/auth/freeze';

	// Auth is frozen for testing and demos (src/lib/auth/freeze.ts): nothing
	// is sent anywhere and no entry is checked. The course picker stays so the
	// flow can be shown; the Sign Up button is an ordinary link.
	let email = '';
	let password = '';
	let fullName = '';
	let facultySlug: string | null = null;
	let departmentSlug = '';
	$: faculty = CATALOG.find((f) => f.slug === facultySlug) ?? null;
	$: next = facultySlug && departmentSlug ? `/faculties/${facultySlug}/${departmentSlug}` : '/onboarding/programme';

	function remember() {
		if (facultySlug && departmentSlug) rememberProgramme(facultySlug, departmentSlug);
	}
</script>

<div class="auth-container">
	<div class="auth-card">
		<div class="hero-eyebrow">Grant CGPA</div>
		<h1>Create your account</h1>

		<form on:submit|preventDefault>
			<div class="form-group">
				<label for="fullName">Full name</label>
				<input id="fullName" type="text" bind:value={fullName} placeholder="Ada Lovelace" />
			</div>

			<div class="form-group">
				<label for="email">Email</label>
				<input id="email" type="email" bind:value={email} placeholder="you@example.com" />
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input id="password" type="password" bind:value={password} placeholder="••••••••" />
			</div>

			<div class="form-group">
				<span class="label-static">Your course</span>
				<p class="course-help">
					Do this once. Everything after it works from your course, without waiting on the network.
				</p>

				{#if !faculty}
					<ul class="course-list">
						{#each CATALOG as f}
							<li class="faculty-context--{f.slug}">
								<button type="button" class="course-row" on:click={() => (facultySlug = f.slug)}>
									<span class="course-name">{f.name}</span>
									<span class="course-meta">
										{f.departments.length} {f.departments.length === 1 ? 'department' : 'departments'}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<button
						type="button"
						class="course-back"
						on:click={() => {
							facultySlug = null;
							departmentSlug = '';
						}}
					>
						← Change faculty
					</button>
					<ul class="course-list">
						{#each faculty.departments as d}
							<li>
								<button
									type="button"
									class="course-row"
									class:selected={departmentSlug === d.slug}
									on:click={() => (departmentSlug = d.slug)}
								>
									<span class="course-name">{d.name}</span>
									<span class="course-meta">
										{d.courses.length} {d.courses.length === 1 ? 'course' : 'courses'}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}

				{#if departmentSlug}
					<p class="lock-note">
						Locked in once you sign up. To change it later you'll need an administrator.
					</p>
				{/if}
			</div>

			<a href={next} class="btn btn-primary btn-full" on:click={remember}>Sign Up</a>
		</form>

		<div class="toggle">
			<p>Already have an account? <a href="/login">Sign In</a></p>
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

	.label-static {
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		font-size: 0.7rem;
	}

	.course-help {
		margin: 0.3rem 0 0.6rem;
		color: var(--muted);
		font-size: 0.8rem;
		line-height: 1.5;
	}

	.course-list {
		list-style: none;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		overflow: hidden;
		max-height: 220px;
		overflow-y: auto;
	}

	.course-row {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.75rem 0.85rem;
		background: var(--surface-2);
		border: 0;
		border-bottom: 1px solid var(--border);
		border-left: 3px solid transparent;
		color: var(--text);
		text-align: left;
		cursor: pointer;
		font: inherit;
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	.course-list li:last-child .course-row {
		border-bottom: 0;
	}

	.course-row:hover:not(:disabled),
	.course-row:focus-visible {
		border-left-color: var(--accent);
		background: var(--accent-dim);
	}

	.course-row.selected {
		border-left-color: var(--accent);
		background: var(--accent-dim);
	}

	.course-row:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.course-name {
		font-weight: 700;
		font-size: 0.9rem;
	}

	.course-meta {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		color: var(--muted);
		white-space: nowrap;
	}

	.course-back {
		background: none;
		border: 0;
		color: var(--muted);
		cursor: pointer;
		margin-bottom: 0.5rem;
		padding: 0;
		font: inherit;
		font-size: 0.8rem;
	}

	.course-back:hover:not(:disabled) {
		color: var(--text);
	}

	.lock-note {
		margin: 0.5rem 0 0;
		color: var(--muted);
		font-size: 0.78rem;
		line-height: 1.5;
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
