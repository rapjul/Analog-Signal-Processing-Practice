import { describe, expect, it } from "vitest";
import {
	formatPulseScale,
	formatRectPulseLatex,
	formatSubstitutedDifference,
	formatTranslatedArgument,
} from "$lib/math-engine/convolution/pulse-formatting";

describe("convolution pulse formatting", () => {
	it.each([
		["t", 0, "t"],
		["t", 2, "t - 2"],
		["t", -2, "t + 2"],
	] as const)("formats %s translated by %s", (variable, shift, expected) => {
		expect(formatTranslatedArgument(variable, shift)).toBe(expected);
	});

	it.each([
		[1, "x(t)", "x(t)"],
		[-1, "x(t)", "-x(t)"],
		[3, "x(t)", "3x(t)"],
	] as const)("formats amplitude %s", (amplitude, body, expected) => {
		expect(formatPulseScale(amplitude, body)).toBe(expected);
	});

	it("simplifies unit and shifted-unit pulses while preserving general scaling", () => {
		expect(formatRectPulseLatex(1)).toBe("\\operatorname{rect}(t)");
		expect(formatRectPulseLatex(1, 2)).toBe("\\operatorname{rect}(t - 2)");
		expect(formatRectPulseLatex(1, -2, -1)).toBe(
			"-\\operatorname{rect}(t + 2)",
		);
		expect(formatRectPulseLatex(3, 1, 2)).toBe(
			"2\\operatorname{rect}\\left(\\frac{t - 1}{3}\\right)",
		);
	});

	it("parenthesizes negative substituted values without doubled signs", () => {
		expect(formatSubstitutedDifference("t", -0.5)).toBe("t-(-0.5)");
		expect(formatSubstitutedDifference("t", 0)).toBe("t-0");
		expect(formatSubstitutedDifference("t", 2)).toBe("t-2");
	});
});
