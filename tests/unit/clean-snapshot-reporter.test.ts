import { describe, expect, it } from "vitest";
import {
	formatStateName,
	formatViewport,
	parseSnapshotMessage,
} from "../e2e/clean-snapshot-reporter.ts";

describe("CleanSnapshotReporter parsing and formatting", () => {
	it("correctly parses newly added snapshot logs", () => {
		const line =
			"A snapshot doesn't exist at /Users/user/repo/tests/e2e/solver-visual-baselines/fourier-series/fourier-series-sawtooth-wave/fourier.step-02.symmetry.misconception.hints__dark__desktop-1280x800.png, writing actual.";
		const parsed = parseSnapshotMessage(line);

		expect(parsed).not.toBeNull();
		expect(parsed?.action).toBe("NEW");
		expect(parsed?.module).toBe("fourier-series");
		expect(parsed?.archetype).toBe("fourier-series-sawtooth-wave");
		expect(parsed?.stepLabel).toBe(
			"Step 02: Symmetry Misconception (hints)",
		);
		expect(parsed?.theme).toBe("dark");
		expect(parsed?.viewportLabel).toBe("Desktop (1280×800)");
	});

	it("correctly parses updated snapshot logs", () => {
		const line =
			"/Users/user/repo/tests/e2e/solver-visual-baselines/fourier-series/fourier-series-sawtooth-wave/fourier.step-03.vanishing-coefficients.hints__dark__mobile-narrow-320x568.png is re-generated, writing actual.";
		const parsed = parseSnapshotMessage(line);

		expect(parsed).not.toBeNull();
		expect(parsed?.action).toBe("UPDATED");
		expect(parsed?.module).toBe("fourier-series");
		expect(parsed?.archetype).toBe("fourier-series-sawtooth-wave");
		expect(parsed?.stepLabel).toBe(
			"Step 03: Vanishing Coefficients (hints)",
		);
		expect(parsed?.theme).toBe("dark");
		expect(parsed?.viewportLabel).toBe("Mobile Narrow (320×568)");
	});

	it("formats milestone states cleanly", () => {
		expect(formatStateName("milestone.initial")).toBe("Milestone: Initial");
		expect(formatStateName("milestone.diagnostic")).toBe(
			"Milestone: Diagnostic",
		);
		expect(formatStateName("milestone.completed")).toBe(
			"Milestone: Completed",
		);
	});

	it("formats ODE and domain-specific abbreviations cleanly", () => {
		expect(
			formatStateName("ode.step-01.characteristic-equation.hints"),
		).toBe("Step 01: Characteristic Equation (hints)");
		expect(formatStateName("ode.step-07.zero-input-state.hints")).toBe(
			"Step 07: Zero-Input State (hints)",
		);
		expect(
			formatStateName("ode.step-07.transient-steady-state.hints"),
		).toBe("Step 07: Transient & Steady-State (hints)");
	});

	it("formats viewports with clean dimension strings", () => {
		expect(formatViewport("desktop-1280x800")).toBe("Desktop (1280×800)");
		expect(formatViewport("mobile-narrow-320x568")).toBe(
			"Mobile Narrow (320×568)",
		);
		expect(formatViewport("tablet-768x1024")).toBe("Tablet (768×1024)");
	});

	it("returns null for non-snapshot lines", () => {
		expect(
			parseSnapshotMessage("Running 1 test using 1 worker"),
		).toBeNull();
		expect(parseSnapshotMessage("")).toBeNull();
	});
});
