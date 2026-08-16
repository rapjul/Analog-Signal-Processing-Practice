<script lang="ts">
	/**
	 * FormulaDrawer Svelte 5 Component.
	 *
	 * Slide-over drawer providing on-demand mathematical reference tables,
	 * formulas, and shortcuts for ODEs, Fourier Series, and Transforms.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template
	import MathBlock from "../math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template
	import MathText from "../math/MathText.svelte";

	interface Props {
		/** Whether the drawer overlay is currently open */
		isOpen: boolean;
		/** Callback triggered when the drawer is closed */
		onClose: () => void;
	}

	let { isOpen = $bindable(false), onClose }: Props = $props();

	type TabId = "odes" | "fourier" | "transforms";
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let activeTab = $state<TabId>("odes");

	/**
	 * Handles keydown events to close drawer on Esc key.
	 * @param {KeyboardEvent} event Keyboard event
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === "Escape" && isOpen) {
			onClose();
		}
	}

	/**
	 * Sets the active reference tab.
	 * @param {TabId} tab Tab identifier
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function setTab(tab: TabId) {
		activeTab = tab;
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
	<div
		class="drawer-backdrop"
		onclick={onClose}
		onkeydown={(e) => e.key === "Escape" && onClose()}
		role="button"
		tabindex="-1"
		aria-label="Close formula reference drawer backdrop"
	></div>

	<div
		class="formula-drawer"
		role="dialog"
		aria-modal="true"
		aria-labelledby="drawer-title"
	>
		<div class="drawer-header">
			<div class="header-title-group">
				<span class="header-icon">📖</span>
				<h2
					id="drawer-title"
					class="drawer-title"
				>
					Formula Reference Sheet
				</h2>
			</div>
			<button
				type="button"
				class="btn-close close-btn"
				onclick={onClose}
				aria-label="Close formula reference drawer"
			>
				✕
			</button>
		</div>

		<!-- Tab Navigation -->
		<div
			class="drawer-tabs"
			role="tablist"
		>
			<button
				type="button"
				role="tab"
				class="tab-btn"
				class:active={activeTab === "odes"}
				aria-selected={activeTab === "odes"}
				onclick={() => setTab("odes")}
			>
				LCC ODEs
			</button>
			<button
				type="button"
				role="tab"
				class="tab-btn"
				class:active={activeTab === "fourier"}
				aria-selected={activeTab === "fourier"}
				onclick={() => setTab("fourier")}
			>
				Fourier Series
			</button>
			<button
				type="button"
				role="tab"
				class="tab-btn"
				class:active={activeTab === "transforms"}
				aria-selected={activeTab === "transforms"}
				onclick={() => setTab("transforms")}
			>
				Transforms & Circuits
			</button>
		</div>

		<!-- Drawer Body Content -->
		<div class="drawer-content">
			{#if activeTab === "odes"}
				<div class="ref-section">
					<h3 class="section-heading">
						Characteristic Roots & Damping
					</h3>
					<MathBlock
						math={"s^2 + a_1 s + a_0 = 0"}
						compact={true}
					/>
					<ul class="ref-list">
						<li>
							<strong>Distinct Real Roots:</strong>
							<MathText
								text={String.raw`$y_h(t) = C_1 e^{r_1 t} + C_2 e^{r_2 t}$`}
							/>
						</li>
						<li>
							<strong>Repeated Real Roots:</strong>
							<MathText
								text={String.raw`$y_h(t) = (C_1 + C_2 t) e^{r t}$`}
							/>
						</li>
						<li>
							<strong>Complex Conjugate Roots:</strong>
							<MathText
								text={String.raw`$y_h(t) = e^{\sigma t} [C_1 \cos(\omega_d t) + C_2 \sin(\omega_d t)]$`}
							/>
						</li>
					</ul>
				</div>

				<div class="ref-section">
					<h3 class="section-heading">
						Particular Solution Ansatz Table
					</h3>
					<table class="ref-table">
						<thead>
							<tr>
								<th>
									<MathText text={"Input $x(t)$"} />
								</th>
								<th>
									<MathText text={"Ansatz $y_p(t)$"} />
								</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td><MathText text={"Constant $K$"} /></td>
								<td><MathText text={"$K_p$"} /></td>
							</tr>
							<tr>
								<td>
									<MathText
										text={String.raw`Exponential $K e^{p t}$`}
									/>
								</td>
								<td
									><MathText
										text={String.raw`$K_p e^{p t}$`}
									/></td
								>
							</tr>
							<tr>
								<td>
									<MathText
										text={String.raw`Sinusoid $K \cos(\omega t)$`}
									/>
								</td>
								<td>
									<MathText
										text={String.raw`$A \cos(\omega t) + B \sin(\omega t)$`}
									/>
								</td>
							</tr>
						</tbody>
					</table>
					<div class="callout callout-warning">
						<MathText
							text={String.raw`<strong>Resonance Rule:</strong> If the trial guess $y_p(t)$ contains terms present in $y_h(t)$, multiply by $t$ (or $t^2$ for repeated roots).`}
						/>
					</div>
				</div>

				<div class="ref-section">
					<h3 class="section-heading">Response Decomposition</h3>
					<p class="ref-text">
						<strong>Total Solution:</strong>
						<MathText
							text={String.raw`$y(t) = y_{ZI}(t) + y_{ZS}(t) = y_h(t) + y_p(t)$`}
						/>
					</p>
					<ul class="ref-list">
						<li>
							<MathText
								text={String.raw`<strong>Zero-Input Response ($y_{ZI}$):</strong> Driven purely by initial conditions ($x(t) = 0$).`}
							/>
						</li>
						<li>
							<MathText
								text={String.raw`<strong>Zero-State Response ($y_{ZS}$):</strong> Driven purely by forcing input ($y(0^-) = y'(0^-) = 0$).`}
							/>
						</li>
						<li>
							<MathText
								text={String.raw`<strong>Initial Conditions:</strong> Always match $y(0^+) = y_h(0^+) + y_p(0^+)$ and $y'(0^+) = y_h'(0^+) + y_p'(0^+)$.`}
							/>
						</li>
					</ul>
				</div>
			{:else if activeTab === "fourier"}
				<div class="ref-section">
					<h3 class="section-heading">
						Fourier Series Representations
					</h3>
					<p class="ref-label">Trigonometric Form:</p>
					<MathBlock
						math={"x(t) = a_0 + \\sum_{n=1}^{\\infty} [a_n \\cos(n \\omega_0 t) + b_n \\sin(n \\omega_0 t)]"}
						compact={true}
					/>
					<p class="ref-label">Exponential Form:</p>
					<MathBlock
						math={"x(t) = \\sum_{n=-\\infty}^{\\infty} c_n e^{j n \\omega_0 t}"}
						compact={true}
					/>
					<p class="ref-label">Coefficient Relations:</p>
					<MathBlock
						math={"c_n = \\frac{a_n - j b_n}{2}, \\quad c_{-n} = c_n^*, \\quad c_0 = a_0"}
						compact={true}
					/>
				</div>

				<div class="ref-section">
					<h3 class="section-heading">Integration Scaling Factors</h3>
					<ul class="ref-list">
						<li>
							<MathText
								text={String.raw`<strong>Trigonometric Coefficients:</strong> Requires factor of $\frac{2}{T_0}$:`}
							/>
							<MathBlock
								math={"a_n = \\frac{2}{T_0} \\int_{T_0} x(t) \\cos(n \\omega_0 t) dt, \\quad b_n = \\frac{2}{T_0} \\int_{T_0} x(t) \\sin(n \\omega_0 t) dt"}
								compact={true}
							/>
						</li>
						<li>
							<MathText
								text={String.raw`<strong>Exponential Coefficients:</strong> Requires factor of $\frac{1}{T_0}$:`}
							/>
							<MathBlock
								math={"c_n = \\frac{1}{T_0} \\int_{T_0} x(t) e^{-j n \\omega_0 t} dt"}
								compact={true}
							/>
						</li>
					</ul>
				</div>

				<div class="ref-section">
					<h3 class="section-heading">Symmetry Shortcuts</h3>
					<ul class="ref-list">
						<li>
							<MathText
								text={String.raw`<strong>Even Symmetry ($x(-t) = x(t)$):</strong> $b_n = 0, \; c_n \in \mathbb{R}$`}
							/>
						</li>
						<li>
							<MathText
								text={String.raw`<strong>Odd Symmetry ($x(-t) = -x(t)$):</strong> $a_0 = 0, \; a_n = 0, \; c_n \in j\mathbb{R}$`}
							/>
						</li>
						<li>
							<MathText
								text={String.raw`<strong>Half-Wave Odd ($x(t - T_0/2) = -x(t)$):</strong> $a_n = b_n = c_n = 0$ for even $n$.`}
							/>
						</li>
					</ul>
				</div>

				<div class="ref-section">
					<h3 class="section-heading">
						Parseval's Power & Gibbs Phenomenon
					</h3>
					<MathBlock
						math={"P_x = \\frac{1}{T_0} \\int_{T_0} |x(t)|^2 dt = a_0^2 + \\frac{1}{2} \\sum_{n=1}^{\\infty} (a_n^2 + b_n^2) = \\sum_{n=-\\infty}^{\\infty} |c_n|^2"}
						compact={true}
					/>
					<p class="ref-text">
						<MathText
							text={String.raw`<strong>Gibbs Phenomenon:</strong> Truncated Fourier sums at jump discontinuities exhibit a persistent overshoot of $\approx 8.95\%$ of the total jump height as $N \to \infty$.`}
						/>
					</p>
				</div>
			{:else if activeTab === "transforms"}
				<div class="ref-section">
					<h3 class="section-heading">
						Common Laplace Transform Pairs
					</h3>
					<table class="ref-table">
						<thead>
							<tr>
								<th>
									<MathText
										text={"Time Domain $x(t) u(t)$"}
									/>
								</th>
								<th>
									<MathText text={"Laplace Domain $X(s)$"} />
								</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td
									><MathText
										text={String.raw`$\delta(t)$`}
									/></td
								>
								<td><MathText text={"$1$"} /></td>
							</tr>
							<tr>
								<td><MathText text={"$u(t)$"} /></td>
								<td
									><MathText
										text={String.raw`$\frac{1}{s}$`}
									/></td
								>
							</tr>
							<tr>
								<td
									><MathText
										text={String.raw`$e^{-a t} u(t)$`}
									/></td
								>
								<td
									><MathText
										text={String.raw`$\frac{1}{s + a}$`}
									/></td
								>
							</tr>
							<tr>
								<td>
									<MathText
										text={String.raw`$\cos(\omega t) u(t)$`}
									/>
								</td>
								<td>
									<MathText
										text={String.raw`$\frac{s}{s^2 + \omega^2}$`}
									/>
								</td>
							</tr>
							<tr>
								<td>
									<MathText
										text={String.raw`$\sin(\omega t) u(t)$`}
									/>
								</td>
								<td>
									<MathText
										text={String.raw`$\frac{\omega}{s^2 + \omega^2}$`}
									/>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div class="ref-section">
					<h3 class="section-heading">
						Continuous-Time Fourier Transform (CTFT)
					</h3>
					<MathBlock
						math={"X(\\omega) = \\int_{-\\infty}^{\\infty} x(t) e^{-j \\omega t} dt, \\quad x(t) = \\frac{1}{2\\pi} \\int_{-\\infty}^{\\infty} X(\\omega) e^{j \\omega t} d\\omega"}
						compact={true}
					/>
					<ul class="ref-list">
						<li>
							<strong>Duality:</strong>
							<MathText
								text={String.raw`$X(t) \leftrightarrow 2\pi x(-\omega)$`}
							/>
						</li>
						<li>
							<strong>Time Shifting:</strong>
							<MathText
								text={String.raw`$x(t - t_0) \leftrightarrow e^{-j \omega t_0} X(\omega)$`}
							/>
						</li>
						<li>
							<strong>Modulation:</strong>
							<MathText
								text={String.raw`$x(t) e^{j \omega_0 t} \leftrightarrow X(\omega - \omega_0)$`}
							/>
						</li>
						<li>
							<strong>Differentiation:</strong>
							<MathText
								text={String.raw`$\frac{d x}{dt} \leftrightarrow j \omega X(\omega)$`}
							/>
						</li>
					</ul>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.drawer-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(2px);
		z-index: 200;
		animation: fadeIn 0.2s ease-out forwards;
	}

	.formula-drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(100%, 520px);
		background: var(--bg-card);
		border-left: 1px solid var(--border-color);
		box-shadow: -4px 0 24px rgba(0, 0, 0, 0.35);
		z-index: 210;
		display: flex;
		flex-direction: column;
		animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--border-color);
		background: var(--bg-card);
	}

	.header-title-group {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.header-icon {
		font-size: 1.3rem;
	}

	.drawer-title {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.btn-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: transparent;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 0.95rem;
		transition: all 0.15s ease;
	}

	.btn-close:hover {
		background: var(--bg-card-hover);
		color: var(--text-primary);
		border-color: var(--accent-primary);
	}

	.btn-close:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.drawer-tabs {
		display: flex;
		border-bottom: 1px solid var(--border-color);
		background: var(--bg-secondary);
		padding: 0 1rem;
		gap: 0.5rem;
		overflow-x: auto;
	}

	.tab-btn {
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--text-secondary);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s ease;
	}

	.tab-btn:hover {
		color: var(--text-primary);
	}

	.tab-btn.active {
		color: var(--accent-primary);
		border-bottom-color: var(--accent-primary);
	}

	.tab-btn:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: -2px;
	}

	.drawer-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.ref-section {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid var(--border-color);
	}

	.ref-section:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.section-heading {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.ref-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin: 0.25rem 0 0 0;
	}

	.ref-text {
		font-size: 0.85rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0;
	}

	.ref-list {
		margin: 0;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.ref-list li {
		margin: 0;
	}

	.ref-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
		margin-top: 0.25rem;
	}

	.ref-table th,
	.ref-table td {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border-color);
		text-align: left;
	}

	.ref-table th {
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-weight: 600;
	}

	.callout {
		padding: 0.75rem 1rem;
		border-radius: var(--radius-sm, 6px);
		font-size: 0.85rem;
		line-height: 1.5;
	}

	.callout-warning {
		background: rgba(245, 158, 11, 0.12);
		border: 1px solid rgba(245, 158, 11, 0.35);
		color: var(--text-primary);
	}

	@media (max-width: 640px) {
		.formula-drawer {
			width: 100%;
		}
	}
</style>
