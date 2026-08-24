import { describe, expect, it } from "vitest";
import {
	type ConvolutionProblemSelection,
	DEFAULT_CONVOLUTION_SELECTION,
} from "$lib/math-engine/convolution";
import {
	CONVOLUTION_SHARE_VERSION,
	parseConvolutionFilters,
	serializeConvolutionFilters,
} from "$lib/problems/convolution-filters";

function customSelection(): ConvolutionProblemSelection {
	return {
		x: {
			type: "multi_rect",
			parameterMode: "random",
			amplitude: "-2",
			componentAmplitudes: ["-3", "2"],
			shiftState: "shifted",
			shiftValue: "-4",
		},
		h: {
			type: "exponential",
			parameterMode: "random",
			amplitude: "random_signed",
			componentAmplitudes: ["default", "default"],
			shiftState: "random",
			shiftValue: "random_positive",
		},
	};
}

describe("convolution frozen share filters", () => {
	it("uses textbook defaults for bare, legacy, and unversioned URLs", () => {
		for (const query of ["", "pair=tri_rect&seed=12", "share=1&seed=12"]) {
			expect(
				parseConvolutionFilters(new URLSearchParams(query), 123),
			).toEqual({
				selection: DEFAULT_CONVOLUTION_SELECTION,
				seed: 123,
				isShared: false,
			});
		}
	});

	it("round-trips every independent signal choice in a frozen URL", () => {
		const selection = customSelection();
		const params = serializeConvolutionFilters({
			selection,
			seed: 0xffff_ffff,
		});
		expect(params.get("share")).toBe("1");
		expect(params.get("v")).toBe(CONVOLUTION_SHARE_VERSION);
		expect(params.get("seed")).toBe("4294967295");
		expect(parseConvolutionFilters(params, 0)).toEqual({
			selection,
			seed: 0xffff_ffff,
			isShared: true,
		});
	});

	it("falls back field by field when a shared URL contains invalid choices", () => {
		const parsed = parseConvolutionFilters(
			new URLSearchParams(
				"share=1&v=2&seed=-1&xType=bad&xParameter=random&xAmplitude=-3&xAmplitude1=bad&xAmplitude2=2&xShift=shifted&xShiftValue=-5&hType=triangle&hShift=random&hShiftValue=random_negative",
			),
			77,
		);
		expect(parsed.seed).toBe(77);
		expect(parsed.isShared).toBe(true);
		expect(parsed.selection.x).toEqual({
			...DEFAULT_CONVOLUTION_SELECTION.x,
			parameterMode: "random",
			amplitude: "-3",
			componentAmplitudes: ["default", "2"],
			shiftState: "shifted",
			shiftValue: "-5",
		});
		expect(parsed.selection.h).toEqual({
			...DEFAULT_CONVOLUTION_SELECTION.h,
			type: "triangle",
			shiftState: "random",
			shiftValue: "random_negative",
		});
	});

	it("copies default arrays instead of exposing shared mutable state", () => {
		const first = parseConvolutionFilters(new URLSearchParams(), 1);
		const second = parseConvolutionFilters(new URLSearchParams(), 1);
		first.selection.x.componentAmplitudes[0] = "-3";
		expect(second.selection.x.componentAmplitudes).toEqual([
			"default",
			"default",
		]);
	});
});
