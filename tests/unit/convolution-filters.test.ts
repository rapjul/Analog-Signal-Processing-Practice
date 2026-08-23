import { describe, expect, it } from "vitest";
import {
	CONVOLUTION_DRILL_PAIR_TYPES,
	parseConvolutionFilters,
	resolveConvolutionPairSelection,
	serializeConvolutionFilters,
} from "$lib/problems/convolution-filters";

describe("Convolution URL filters", () => {
	it("defaults missing and invalid pairs to seeded Random mode", () => {
		expect(parseConvolutionFilters(new URLSearchParams(), 123)).toEqual({
			pair: "random",
			seed: 123,
		});
		expect(
			parseConvolutionFilters(
				new URLSearchParams("pair=%3Cscript%3E&seed=-1"),
				456,
			),
		).toEqual({ pair: "random", seed: 456 });
	});

	it("round-trips concrete and Random selections canonically", () => {
		const random = serializeConvolutionFilters({ pair: "random", seed: 7 });
		expect(random.toString()).toBe("pair=random&seed=7");
		expect(parseConvolutionFilters(random, 0)).toEqual({
			pair: "random",
			seed: 7,
		});
		const triangle = serializeConvolutionFilters({
			pair: "tri_shifted_tri",
			seed: 0xffff_ffff,
		});
		expect(triangle.toString()).toBe(
			"pair=tri_shifted_tri&seed=4294967295",
		);
	});

	it("resolves every seeded selection deterministically", () => {
		expect(CONVOLUTION_DRILL_PAIR_TYPES).toEqual([
			"rect_rect",
			"rect_shifted_rect",
			"rect_both_shifted",
			"multi_rect",
			"rect_exp",
			"exp_exp",
			"tri_rect",
			"tri_shifted_tri",
		]);
		for (let seed = 0; seed < 100; seed += 1) {
			const first = resolveConvolutionPairSelection("random", seed);
			expect(resolveConvolutionPairSelection("random", seed)).toBe(first);
			expect(CONVOLUTION_DRILL_PAIR_TYPES).toContain(first);
		}
		expect(resolveConvolutionPairSelection("tri_rect", 2)).toBe("tri_rect");
		expect(resolveConvolutionPairSelection("rect_both_shifted", 2)).toBe(
			"rect_both_shifted",
		);
	});
});
