<script lang="ts">
	/**
	 * SignalLab Main Course Dashboard & Module Launcher (/).
	 * Provides a course overview for UIUC ECE 210 with module launcher cards.
	 */
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import Navigation from "$lib/components/ui/Navigation.svelte";

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const modules = [
		{
			id: "odes",
			title: "LCC Ordinary Differential Equations",
			description:
				"Master homogeneous solutions y_h(t), particular solutions y_p(t), characteristic roots, and zero-input/zero-state separation.",
			badge: "Exam 1 Scope",
			link: "/odes",
			icon: "📐",
			status: "Ready",
		},
		{
			id: "fourier-series",
			title: "Fourier Series Analysis",
			description:
				"Calculate Trigonometric and Exponential coefficients (a0, an, bn, cn), Parseval power, and observe Gibbs phenomenon overshoot.",
			badge: "Exam 2 Scope",
			link: "/fourier-series",
			icon: "🎵",
			status: "Ready",
		},
		{
			id: "fourier-transform",
			title: "Continuous-Time Fourier Transform (CTFT)",
			description:
				"Practice CTFT pairs (rect, sinc, exp, delta), operational properties, duality, energy spectra |F(w)|^2, and 3dB bandwidth.",
			badge: "Exam 3 Scope",
			link: "/fourier-transform",
			icon: "📊",
			status: "Ready",
		},
		{
			id: "convolution",
			title: "Continuous-Time Convolution",
			description:
				"Practice graphical flip-and-shift overlap integrals, piecewise analytical solutions, and impulse/step response synthesis.",
			badge: "Exam 3 Scope",
			link: "/convolution",
			icon: "🔄",
			status: "Ready",
		},
		{
			id: "laplace",
			title: "Laplace Transform & S-Domain Analysis",
			description:
				"Bilateral/unilateral Laplace, Partial Fraction Decomposition (PFD), ROC analysis, and interactive s-plane pole-zero canvas.",
			badge: "Final Exam Scope",
			link: "/laplace",
			icon: "🎯",
			status: "Ready",
		},
		{
			id: "circuits",
			title: "Circuit Analysis & Transfer Functions H(s)",
			description:
				"Derive RLC transfer functions H(s), steady-state AC phasors, component initial value sources, and Bode plots.",
			badge: "Final Exam Scope",
			link: "/circuits",
			icon: "⚡",
			status: "Ready",
		},
	];
</script>

<svelte:head>
	<title>SignalLab — Analog Signal Processing Practice Suite</title>
</svelte:head>

<Navigation activeRoute="/" />

<main class="dashboard-container">
	<div class="hero-section">
		<span class="hero-tag">Analog Signal Processing Practice Suite</span>
		<h1 class="hero-title">Master Analog Signal Processing Math</h1>
		<p class="hero-subtitle">
			Zero-latency, offline-first active retrieval tool aligned with
			<em>Analog Signals and Systems</em>
			by Kudeki & Munson.
		</p>
	</div>

	<!-- Module Grid -->
	<div class="modules-grid">
		{#each modules as mod}
			<a href={mod.link} class="module-card">
				<div class="module-header">
					<span class="module-icon">{mod.icon}</span>
					<span class="module-badge">{mod.badge}</span>
				</div>
				<h3 class="module-title">{mod.title}</h3>
				<p class="module-description">{mod.description}</p>
				<div class="module-footer">
					<span
						class="status-indicator"
						class:ready={mod.status === "Ready"}
					>
						{mod.status === "Ready"
							? "▶ Practice Now"
							: "🔒 Planned"}
					</span>
				</div>
			</a>
		{/each}
	</div>
</main>

<style>
	.dashboard-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2.5rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.hero-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.75rem;
		max-width: 750px;
		margin: 0 auto;
	}

	.hero-tag {
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent-primary);
		background: rgba(6, 182, 212, 0.12);
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(6, 182, 212, 0.3);
	}

	.hero-title {
		font-size: 2.25rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.hero-subtitle {
		font-size: 1rem;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.modules-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
		gap: 1.5rem;
	}

	.module-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		text-decoration: none;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		transition: all 0.25s ease;
		max-width: 100%;
		min-width: 0;
	}

	@media (max-width: 480px) {
		.dashboard-container {
			padding: 1.5rem 0.75rem;
			gap: 1.5rem;
		}

		.module-card {
			padding: 1.15rem 1rem;
		}

		.modules-grid {
			gap: 1rem;
		}
	}

	.module-card:hover {
		transform: translateY(-4px);
		border-color: var(--accent-primary);
		box-shadow: var(--shadow-glow);
	}

	.module-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.module-icon {
		font-size: 1.75rem;
	}

	.module-badge {
		font-size: 0.7rem;
		font-weight: 600;
		background: var(--bg-card-hover);
		color: var(--text-muted);
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
	}

	.module-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.module-description {
		font-size: 0.85rem;
		color: var(--text-secondary);
		line-height: 1.5;
		flex-grow: 1;
	}

	.module-footer {
		margin-top: 0.5rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-color);
	}

	.status-indicator {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.status-indicator.ready {
		color: var(--accent-primary);
	}
</style>
