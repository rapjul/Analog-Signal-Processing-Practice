<script lang="ts">
	/** Completed plots keep regular spectra separate from weighted distributions. */
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import { buildCtftSpectrum } from "$lib/math-engine/ctft-spectrum";
	import type { GeneratedCtftProblem } from "$lib/math-engine/fourier-transform";

	/** Plot inputs. */
	interface Props {
		/** Completed authoritative signal. */ problem: GeneratedCtftProblem;
	}
	let { problem }: Props = $props();
	const data = $derived(buildCtftSpectrum(problem));
	const maximum = $derived(
		Math.max(
			1e-12,
			...data.points.map(
				/** @param point - Regular sample. @returns Magnitude. */
				(point) => point.magnitude,
			),
		),
	);
	const tablePoints = $derived(
		data.points.filter(
			/** @param point - Sample. @param index - Offset. @returns Representative values and all zeros. */
			(point, index) => index % 50 === 0 || point.phase === null,
		),
	);
	/** @param omega - Angular frequency. @returns Horizontal SVG coordinate. */
	function x(omega: number): number {
		return 50 + 280 * (omega / data.extent + 1);
	}
	/**
	 * Splits curves at undefined phase and principal-argument wraps.
	 * @param metric - Magnitude or phase.
	 * @returns SVG path in a fixed accessible view box.
	 */
	function path(metric: "magnitude" | "phase"): string {
		let result = "";
		let previous: number | null = null;
		for (const point of data.points) {
			const value = point[metric];
			if (value === null) {
				previous = null;
				continue;
			}
			const y =
				metric === "magnitude"
					? 160 - (130 * value) / maximum
					: 95 - (65 * value) / Math.PI;
			result += `${previous === null || (metric === "phase" && Math.abs(value - previous) > Math.PI) ? "M" : "L"}${x(point.omega).toFixed(2)},${y.toFixed(2)} `;
			previous = value;
		}
		return result;
	}
	/** @param value - Numerical observation. @returns Compact approximation. */
	function number(value: number): string {
		return Math.abs(value) < 1e-12 ? "0" : value.toPrecision(5);
	}
</script>

<section
	class="ctft-spectrum"
	aria-label="Completed CTFT spectrum"
>
	<h3>Verified Spectrum</h3>
	{#if data.impulses.length}
		<p>
			Arrows mark Dirac impulses. Arrow length is symbolic; labels give
			complex weights, not finite peak heights.
		</p>
		<p>
			<MathText
				text={String.raw`Each arrow has weight magnitude $\pi$. Horizontal axis: $\omega$ (rad/s).`}
			/>
		</p>
		<svg
			viewBox="0 0 640 200"
			role="img"
			aria-label="Cosine distribution with impulses at both carrier frequencies"
		>
			<line
				x1="40"
				y1="160"
				x2="620"
				y2="160"
			/>
			{#each data.impulses as impulse}
				<path
					d={`M${x(impulse.location)},160 L${x(impulse.location)},40 m-7,12 l7,-12 l7,12`}
				/>
				<text
					x={x(impulse.location)}
					y="180"
					text-anchor="middle">{impulse.location}</text
				>
			{/each}
		</svg>
		<div class="table-scroll">
			<table>
				<caption>Impulse locations and complex weights</caption>
				<thead
					><tr
						><th
							><MathText
								text={String.raw`$\omega$ (rad/s)`}
							/></th
						><th>Weight</th><th>Weight magnitude</th><th
							>Weight phase (rad)</th
						></tr
					></thead
				>
				<tbody
					>{#each data.impulses as impulse}<tr
							><td>{impulse.location}</td>
							<td
								><MathBlock
									math={`\\pi e^{-j(${impulse.location})(${problem.params.t0})}`}
									compact
									hideHeader
								/></td
							>
							<td><MathText text={String.raw`$\pi$`} /></td><td
								>{number(impulse.weight.arg())}</td
							>
						</tr>{/each}</tbody
				>
			</table>
		</div>
	{:else}
		{#each ["magnitude", "phase"] as metric}
			<p>
				<MathText
					text={metric === "magnitude"
						? String.raw`$|X(\omega)|$ (peak $${number(maximum)}$). Horizontal axis: $\omega$ (rad/s).`
						: String.raw`$\arg X(\omega)$ ($-\pi$ to $\pi$ rad). Horizontal axis: $\omega$ (rad/s).`}
				/>
			</p>
			<svg
				viewBox="0 0 640 200"
				role="img"
				aria-label={metric === "magnitude"
					? "Ordinary CTFT magnitude spectrum"
					: "Principal CTFT phase in radians; masked at numerical zeros"}
			>
				<line
					x1="50"
					y1={metric === "magnitude" ? 160 : 95}
					x2="610"
					y2={metric === "magnitude" ? 160 : 95}
				/>
				<line
					x1="330"
					y1="25"
					x2="330"
					y2="165"
				/><path d={path(metric as "magnitude" | "phase")} />
				<text
					x="50"
					y="185">{number(-data.extent)}</text
				><text
					x="325"
					y="185">0</text
				><text
					x="555"
					y="185">{number(data.extent)}</text
				>
			</svg>
		{/each}
		<p>
			Principal phase is undefined at spectral zeros; gaps also separate
			phase wraps.
		</p>
		<details>
			<summary>View numerical spectrum values</summary>
			<div class="table-scroll">
				<table>
					<caption
						>Representative samples, including numerical zeros</caption
					>
					<thead
						><tr
							><th
								><MathText
									text={String.raw`$\omega$ (rad/s)`}
								/></th
							><th
								><MathText
									text={String.raw`$|X(\omega)|$`}
								/></th
							><th>Phase (rad)</th></tr
						></thead
					>
					<tbody
						>{#each tablePoints as point}<tr
								><td>{number(point.omega)}</td><td
									>{number(point.magnitude)}</td
								><td
									>{point.phase === null
										? "Undefined at zero"
										: number(point.phase)}</td
								></tr
							>{/each}</tbody
					>
				</table>
			</div>
		</details>
	{/if}
</section>

<style>
	/* ═══════════════════════════════════════════════════════════════════════
	   Spectrum layout and vector curves
	   ═══════════════════════════════════════════════════════════════════════ */
	.ctft-spectrum {
		min-width: 0;
		display: grid;
		gap: 1rem;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
	}
	svg line {
		stroke: var(--text-secondary);
		stroke-width: 1;
	}
	svg path {
		stroke: var(--accent-primary);
		stroke-width: 2;
		fill: none;
	}
	svg text {
		fill: var(--text-primary);
		font-size: 12px;
	}
	p {
		color: var(--text-secondary);
	}
	/* ═══════════════════════════════════════════════════════════════════════
	   Accessible numerical values
	   ═══════════════════════════════════════════════════════════════════════ */
	.table-scroll {
		overflow-x: auto;
		max-width: 100%;
	}
	table {
		border-collapse: collapse;
		width: 100%;
	}
	th,
	td {
		padding: 0.5rem;
		text-align: left;
		border-bottom: 1px solid var(--border-color);
	}
	summary {
		cursor: pointer;
	}
</style>
