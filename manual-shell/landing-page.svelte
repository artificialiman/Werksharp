<script lang="ts">
	import Crest from '$lib/components/Crest.svelte';

	/**
	 * Hub linking every real destination in this app. Previously this
	 * page only linked to /roster — /access-code, /staff, and /feed
	 * existed but weren't reachable from anywhere in the UI (a real gap,
	 * not intentional). Fixed here rather than repeated.
	 */

	const destinations = [
		{
			href: '/roster',
			title: 'Student Roster',
			description: 'Add, remove, and correct students. Per-term remarks.'
		},
		{
			href: '/staff',
			title: 'Staff & Assignments',
			description: 'Teaching roles, subjects, junior/senior scope, class arms.'
		},
		{
			href: '/access-code',
			title: 'Student Access Code',
			description: "Rotate the shared code students use to view results."
		},
		{
			href: '/feed',
			title: 'Feed Posts',
			description: 'Post notices to the public site — pin, tag, remove.'
		}
	];
</script>

<svelte:head>
	<title>Tendercare Staff Dashboard</title>
</svelte:head>

<div class="landing">
	<Crest class="landing-crest-watermark" aria-hidden="true" />

	<header class="landing-header">
		<Crest class="landing-crest" size="3.5rem" />
		<h1>Tendercare Staff Dashboard</h1>
		<p>Roster management, staff assignments, and academic records for staff and admin.</p>
	</header>

	<div class="landing-grid">
		{#each destinations as d (d.href)}
			<a class="landing-card" href={d.href}>
				<span class="landing-card-title">{d.title}</span>
				<span class="landing-card-desc">{d.description}</span>
				<span class="landing-card-arrow">→</span>
			</a>
		{/each}
	</div>
</div>

<style>
	.landing {
		position: relative;
		overflow: hidden;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-16, 4rem) var(--space-5, 1.25rem) var(--space-16, 4rem);
		font-family: var(--font-sans, system-ui);
		background: var(--color-cream, #f8f4ec);
	}

	:global(.landing-crest-watermark) {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(70vw, 640px);
		height: auto;
		color: var(--color-purple-deep, #3a1a5c);
		opacity: 0.045;
		pointer-events: none;
		z-index: 0;
	}

	.landing-header {
		position: relative;
		z-index: 1;
		text-align: center;
		max-width: 42ch;
		margin-bottom: var(--space-12, 3rem);
	}

	:global(.landing-crest) {
		color: var(--color-purple-deep, #3a1a5c);
		margin: 0 auto var(--space-3, 0.75rem);
	}

	.landing-header h1 {
		font-family: var(--font-serif, serif);
		font-weight: 400;
		font-size: var(--text-2xl, 2rem);
		color: var(--color-purple-deep, #3a1a5c);
		margin: 0 0 var(--space-2, 0.5rem);
	}

	.landing-header p {
		opacity: 0.7;
		font-size: var(--text-sm, 0.875rem);
		margin: 0;
	}

	.landing-grid {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4, 1rem);
		width: 100%;
		max-width: 640px;
	}

	.landing-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1, 0.25rem);
		background: var(--color-white, #fff);
		border: 1px solid var(--color-cream-deep, #e4d8c4);
		border-radius: var(--radius-lg, 16px);
		padding: var(--space-5, 1.25rem);
		text-decoration: none;
		color: inherit;
		transition:
			transform var(--duration-base, 300ms),
			box-shadow var(--duration-base, 300ms),
			border-color var(--duration-base, 300ms);
		position: relative;
	}

	.landing-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md, 0 4px 16px rgba(26, 16, 32, 0.12));
		border-color: var(--color-purple-light, #c4a8e0);
	}

	.landing-card-title {
		font-family: var(--font-serif, serif);
		font-weight: 600;
		font-size: var(--text-md, 1.125rem);
		color: var(--color-ink, #1a1020);
	}

	.landing-card-desc {
		font-size: var(--text-xs, 0.75rem);
		color: var(--color-ash-dark, #6c6c78);
		line-height: 1.5;
	}

	.landing-card-arrow {
		position: absolute;
		top: var(--space-4, 1rem);
		right: var(--space-4, 1rem);
		color: var(--color-purple-light, #c4a8e0);
		font-size: var(--text-lg, 1.25rem);
		transition: transform var(--duration-fast, 150ms);
	}

	.landing-card:hover .landing-card-arrow {
		transform: translateX(3px);
		color: var(--color-purple, #5b2d8e);
	}

	@media (max-width: 560px) {
		.landing-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
