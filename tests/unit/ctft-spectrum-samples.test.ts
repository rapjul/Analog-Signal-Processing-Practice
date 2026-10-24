/** Numerical coverage for accessible CTFT observations independent of screenshots. */
import { describe, expect, it } from "vitest";
import { createCtftProblem } from "$lib/math-engine/fourier-transform/index";
import {
	buildCtftSpectrum,
	selectCtftSpectrumSamples,
} from "$lib/math-engine/fourier-transform/spectrum";

describe("accessible CTFT spectrum samples", () => {
	for (const T of [1, 2, 6]) {
		/** Half-zero-spacing observations expose the side lobes alongside masked zeros. */
		it(`samples the rectangular lobes for width ${T}`, () => {
			const data = buildCtftSpectrum(
				createCtftProblem("rect", { a: 2, T, w0: 3, t0: -1 }),
			);
			const points = selectCtftSpectrumSamples(data.points, "rect");
			expect(points).toHaveLength(17);
			const coordinates = points.map(
				/** @param point - Selected observation. @returns Its frequency. */
				(point) => point.omega,
			);
			expect(new Set(coordinates).size).toBe(17);
			expect(coordinates).toEqual(
				[...coordinates].sort(
					/** @param a - First frequency. @param b - Second frequency. @returns Ascending order. */
					(a, b) => a - b,
				),
			);
			expect(points[8]!.magnitude).toBe(T);
			for (const sign of [-1, 1]) {
				const lobe = points.find(
					/** @param point - Selected observation. @returns Whether it lies midway between the first two zeros. */
					(point) =>
						Math.abs(point.omega - (sign * 3 * Math.PI) / T) <
						1e-10,
				)!;
				expect(lobe.magnitude).toBeCloseTo((2 * T) / (3 * Math.PI));
				expect(lobe.phase).not.toBeNull();
			}
			expect(
				points.filter(
					/** @param point - Selected observation. @returns Whether phase is masked at zero. */
					(point) => point.phase === null,
				),
			).toHaveLength(8);
		});
	}
	for (const family of ["exponential", "gaussian", "delta", "cos"] as const) {
		/** Other families retain the same observations, including a separate empty distribution grid. */
		it(`preserves ${family} sampling`, () => {
			const data = buildCtftSpectrum(
				createCtftProblem(family, { a: 2, T: 4, w0: 3, t0: 1 }),
			);
			expect(selectCtftSpectrumSamples(data.points, family)).toEqual(
				data.points.filter(
					/** @param point - Existing ordinate. @param index - Grid position. @returns The previous sampling policy. */
					(point, index) => index % 50 === 0 || point.phase === null,
				),
			);
		});
	}
});
