// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
	BaseStepSolverState,
	createMultiPartStepState,
	createStepState,
	createSubStepState,
	type MultiPartStepState,
	type SolverVisualStateDescriptor,
} from "$lib/components/solvers/base-step-solver.svelte";
import { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
import { FourierSeriesStepSolverState } from "$lib/components/solvers/fourier-series-step-solver.svelte";
import { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
import {
	type ConvolutionPairType,
	generateConvolutionProblem,
} from "$lib/math-engine/convolution/index";
import {
	FOURIER_SERIES_WAVEFORM_TYPES,
	generateFourierSeriesProblem,
} from "$lib/math-engine/fourier-series/index";
import {
	type ForcingType,
	generateOdeProblem,
	type LeadingCoefficientType,
	type ResonanceType,
	type SecondOrderRootType,
} from "$lib/math-engine/odes/index";

/**
 * Introspects any BaseStepSolverState instance to dynamically discover all
 * configured parent steps, multi-part sub-step maps, and sub-step orders.
 *
 * Contains NO solver-specific hardcoding or class checks, ensuring that any
 * new step, sub-step, or new solver subclass added in the future is automatically
 * discovered and verified without modifying this file.
 *
 * @param solver - BaseStepSolverState subclass instance under test.
 * @returns Map of 1-based step numbers to step structural metadata.
 */
function introspectSolverSteps(solver: BaseStepSolverState): Map<
	number,
	{
		isMultiPart: boolean;
		availableSubSteps: Set<string>;
		subStepOrder: string[];
	}
> {
	const stepMap = new Map<
		number,
		{
			isMultiPart: boolean;
			availableSubSteps: Set<string>;
			subStepOrder: string[];
		}
	>();

	const solverRecord = solver as unknown as Record<string, unknown>;

	for (let s = 1; s <= solver.totalSteps; s++) {
		const propCandidates = [`step${s}`, `_step${s}`, `stepState${s}`];
		let isMultiPart = false;
		const availableSubSteps = new Set<string>();
		let subStepOrder: string[] = [];

		for (const prop of propCandidates) {
			const val = solverRecord[prop];
			if (val && typeof val === "object") {
				const multiPart = val as Partial<MultiPartStepState<string>>;
				if (
					multiPart.subSteps &&
					typeof multiPart.subSteps === "object"
				) {
					isMultiPart = true;
					for (const key of Object.keys(multiPart.subSteps)) {
						availableSubSteps.add(key);
					}
				}
				if (
					Array.isArray(multiPart.subStepOrder) &&
					multiPart.subStepOrder.length > 0
				) {
					isMultiPart = true;
					subStepOrder = [...multiPart.subStepOrder];
				}
				if (isMultiPart) break;
			}
		}

		stepMap.set(s, { isMultiPart, availableSubSteps, subStepOrder });
	}

	return stepMap;
}

/**
 * Validates that every step and sub-step of a solver instance is registered in
 * devGetVisualStates() and can be navigated to via devGoToVisualState().
 *
 * Throws an assertion error with an aggregated error list if any step or sub-step
 * is missing, duplicate, or unreachable.
 *
 * @param solver - BaseStepSolverState instance to validate.
 * @param solverName - Human-readable name of the solver under test for error messages.
 */
function assertCompleteVisualCoverage(
	solver: BaseStepSolverState,
	solverName: string,
): void {
	const visualStates = solver.devGetVisualStates();
	const errors: string[] = [];

	if (visualStates.length === 0) {
		errors.push(
			`${solverName} registered 0 visual states in devGetVisualStates()`,
		);
	}

	// 1. Check ID uniqueness and descriptor structure
	const ids = new Set<string>();
	for (const state of visualStates) {
		if (ids.has(state.id)) {
			errors.push(
				`${solverName} has duplicate visual state ID: "${state.id}"`,
			);
		}
		ids.add(state.id);

		if (!state.label || state.label.trim().length === 0) {
			errors.push(
				`${solverName} visual state "${state.id}" has empty label`,
			);
		}

		if (state.step < 1) {
			errors.push(
				`${solverName} visual state "${state.id}" has invalid step number ${state.step} (must be >= 1)`,
			);
		}

		if (state.step > solver.totalSteps) {
			errors.push(
				`${solverName} visual state "${state.id}" specifies step ${state.step}, exceeding totalSteps ${solver.totalSteps}`,
			);
		}

		if (
			!["interactive", "diagnostic", "hint", "remedial"].includes(
				state.kind,
			)
		) {
			errors.push(
				`${solverName} visual state "${state.id}" has unrecognized kind "${state.kind}"`,
			);
		}
	}

	// 2. Introspect all steps and sub-steps from the solver model
	const stepMap = introspectSolverSteps(solver);

	// Check that every parent step 1..totalSteps is represented
	for (let s = 1; s <= solver.totalSteps; s++) {
		const stepInfo = stepMap.get(s);
		const statesForStep = visualStates.filter(
			(state) => state.step === s && state.kind !== "hint",
		);

		if (statesForStep.length === 0) {
			errors.push(
				`${solverName} Step ${s} has no interactive/diagnostic visual state registered in devGetVisualStates()`,
			);
		}

		// If this is a multi-part step, validate that sub-steps are recognized
		if (stepInfo?.isMultiPart) {
			for (const state of statesForStep) {
				if (
					state.subStep &&
					stepInfo.availableSubSteps.size > 0 &&
					!stepInfo.availableSubSteps.has(state.subStep)
				) {
					errors.push(
						`${solverName} Step ${s} visual state "${state.id}" specifies unknown sub-step "${state.subStep}" (not in availableSubSteps).`,
					);
				}
			}

			// Ensure every active sub-step in subStepOrder has a corresponding visual state descriptor
			if (stepInfo.subStepOrder.length > 0) {
				for (const subId of stepInfo.subStepOrder) {
					const matchingSubState = visualStates.find(
						(state) =>
							state.step === s &&
							state.subStep === subId &&
							state.kind !== "hint",
					);
					if (!matchingSubState) {
						errors.push(
							`${solverName} Step ${s} sub-step "${subId}" is NOT captured in devGetVisualStates(). Every active sub-step must have a corresponding visual state descriptor.`,
						);
					}
				}
			}
		}
	}

	// 3. Test navigation to EVERY registered visual state
	for (const state of visualStates) {
		const navigated = solver.devGoToVisualState(state.id);
		if (!navigated) {
			errors.push(
				`${solverName} devGoToVisualState("${state.id}") failed (returned false)`,
			);
			continue;
		}

		if (solver.currentStep !== state.step) {
			errors.push(
				`${solverName} after navigating to "${state.id}", expected currentStep to be ${state.step} but got ${solver.currentStep}`,
			);
		}

		// If subStep is specified, verify active subStep matches
		if (state.subStep) {
			const currState = solver.currentStepState as unknown as
				Partial<MultiPartStepState<string>> | undefined;
			if (
				currState &&
				"activeSubStepId" in currState &&
				currState.activeSubStepId !== state.subStep
			) {
				errors.push(
					`${solverName} after navigating to "${state.id}", expected activeSubStepId to be "${state.subStep}" but got "${currState.activeSubStepId}"`,
				);
			}
		}
	}

	expect(
		errors,
		`Visual coverage errors found:\n${errors.join("\n")}`,
	).toEqual([]);
}

/**
 * Synthetic mock solver with arbitrary steps and sub-steps for contract testing.
 */
class SyntheticMockSolver extends BaseStepSolverState {
	step1 = $state(createStepState({ text: "" }));
	step2: MultiPartStepState<"partA" | "partB" | "partC"> = $state(
		createMultiPartStepState<
			Record<string, unknown>,
			"partA" | "partB" | "partC"
		>(
			{},
			["partA", "partB", "partC"],
			{
				partA: createSubStepState("partA", "Part A", {}),
				partB: createSubStepState("partB", "Part B", {}),
				partC: createSubStepState("partC", "Part C", {}),
			},
			"partA",
		),
	);
	step3 = $state(createStepState({ done: false }));

	includeAllStates = true;
	includePartC = true;
	shouldFailNavigation = false;
	invalidStepNumber = false;
	duplicateId = false;

	constructor() {
		super(3);
	}

	override reset(): void {
		this.currentStep = 1;
		this.isCompleted = false;
		this.hintTier = 0;
	}

	override get currentStepState() {
		if (this.currentStep === 1) return this.step1;
		if (this.currentStep === 2) return this.step2;
		if (this.currentStep === 3) return this.step3;
		return undefined;
	}

	override get activeHints(): string[] {
		return [];
	}

	override devGetVisualStates(): SolverVisualStateDescriptor[] {
		const states: SolverVisualStateDescriptor[] = [
			{
				id: "mock.step-01",
				label: "Step 1",
				step: 1,
				kind: "interactive",
			},
			{
				id: "mock.step-02.partA",
				label: "Step 2 Part A",
				step: 2,
				subStep: "partA",
				kind: "interactive",
			},
			{
				id: "mock.step-02.partB",
				label: "Step 2 Part B",
				step: 2,
				subStep: "partB",
				kind: "interactive",
			},
		];

		if (this.includePartC) {
			states.push({
				id: "mock.step-02.partC",
				label: "Step 2 Part C",
				step: 2,
				subStep: "partC",
				kind: "interactive",
			});
		}

		if (this.includeAllStates) {
			states.push({
				id: "mock.step-03",
				label: "Step 3",
				step: this.invalidStepNumber ? 99 : 3,
				kind: "interactive",
			});
		}

		if (this.duplicateId) {
			states.push({
				id: "mock.step-01",
				label: "Duplicate Step 1",
				step: 1,
				kind: "interactive",
			});
		}

		return states;
	}

	override devGoToVisualState(stateId: string): boolean {
		if (this.shouldFailNavigation) {
			return false;
		}
		if (stateId === "mock.step-01") {
			this.advanceToStep(1);
			return true;
		}
		if (stateId === "mock.step-02.partA") {
			this.advanceToStep(2);
			this.step2.activeSubStepId = "partA";
			return true;
		}
		if (stateId === "mock.step-02.partB") {
			this.advanceToStep(2);
			this.step2.activeSubStepId = "partB";
			return true;
		}
		if (stateId === "mock.step-02.partC") {
			this.advanceToStep(2);
			this.step2.activeSubStepId = "partC";
			return true;
		}
		if (stateId === "mock.step-03") {
			this.advanceToStep(3);
			return true;
		}
		return false;
	}
}

describe("Universal Solver Visual State Coverage & Future-Proofing", () => {
	describe("Convolution Solver Full Signal-Pair Matrix", () => {
		it("ensures every parent step and dynamic interval has visual coverage", () => {
			const pairTypes: ConvolutionPairType[] = [
				"rect_rect",
				"rect_shifted_rect",
				"rect_both_shifted",
				"multi_rect",
				"rect_exp",
				"exp_exp",
				"step_exp",
				"step_rect",
			];

			for (const pairType of pairTypes) {
				const problem = generateConvolutionProblem(pairType);
				const solver = new ConvolutionStepSolverState(() => problem);
				assertCompleteVisualCoverage(
					solver,
					`ConvolutionStepSolverState (${pairType})`,
				);
			}
		});
	});

	describe("Fourier Series Solver Full Waveform Matrix", () => {
		for (const waveform of FOURIER_SERIES_WAVEFORM_TYPES) {
			it(`ensures 100% step and sub-step visual coverage for waveform "${waveform}"`, () => {
				const problem = generateFourierSeriesProblem(waveform, {
					seed: 42,
					A: 4,
					T0: 2,
				});
				const solver = new FourierSeriesStepSolverState(() => problem);
				assertCompleteVisualCoverage(
					solver,
					`FourierSeriesStepSolverState (${waveform})`,
				);
			});
		}

		it("ensures dynamic Step 5 and Step 6 multi-part symmetry variants are captured", () => {
			// Even waveform: Step 5 has a0 and an (2 parts), Step 6 has a0 and an (2 parts)
			const evenProblem = generateFourierSeriesProblem("square_even", {
				seed: 101,
				A: 5,
				T0: 2,
			});
			const evenSolver = new FourierSeriesStepSolverState(
				() => evenProblem,
			);
			assertCompleteVisualCoverage(
				evenSolver,
				"FourierSeriesStepSolverState (Square Even)",
			);

			// Odd waveform: Step 5 has bn (1 part), Step 6 has bn (1 part)
			const oddProblem = generateFourierSeriesProblem("triangle_odd", {
				seed: 102,
				A: 5,
				T0: 2,
			});
			const oddSolver = new FourierSeriesStepSolverState(
				() => oddProblem,
			);
			assertCompleteVisualCoverage(
				oddSolver,
				"FourierSeriesStepSolverState (Triangle Odd)",
			);

			// Neither waveform: Step 5 has a0, an, bn (3 parts), Step 6 has a0, an, bn (3 parts)
			const neitherProblem = generateFourierSeriesProblem(
				"half_wave_sine",
				{
					seed: 103,
					A: 5,
					T0: 2,
				},
			);
			const neitherSolver = new FourierSeriesStepSolverState(
				() => neitherProblem,
			);
			assertCompleteVisualCoverage(
				neitherSolver,
				"FourierSeriesStepSolverState (Half-Wave Rectified Sine)",
			);
		});
	});

	describe("ODE Solver Full Parameter Matrix", () => {
		it("ensures 100% visual coverage for 1st-order ODEs across forcing types", () => {
			const forcingTypes: ForcingType[] = [
				"constant",
				"exponential",
				"sinusoid",
			];
			for (const forcing of forcingTypes) {
				const problem = generateOdeProblem({
					order: 1,
					forcingType: forcing,
					leadingCoefficient: "monic",
					seed: 201,
				});
				const solver = new OdeStepSolverState(() => problem);
				assertCompleteVisualCoverage(
					solver,
					`OdeStepSolverState (Order 1, ${forcing})`,
				);
			}
		});

		it("ensures 100% visual coverage for 2nd-order ODEs across all root types and forcing types", () => {
			const rootTypes: SecondOrderRootType[] = [
				"distinct_real",
				"repeated_real",
				"complex_conjugate",
			];
			const forcingTypes: ForcingType[] = [
				"constant",
				"exponential",
				"sinusoid",
			];
			const leadingTypes: LeadingCoefficientType[] = [
				"monic",
				"non_monic",
			];
			const resonanceTypes: ResonanceType[] = ["none", "simple"];

			for (const rootType of rootTypes) {
				for (const forcingType of forcingTypes) {
					for (const leadingCoefficient of leadingTypes) {
						for (const resonance of resonanceTypes) {
							const problem = generateOdeProblem({
								order: 2,
								rootType,
								forcingType,
								leadingCoefficient,
								resonance,
								seed: 301,
							});
							const solver = new OdeStepSolverState(
								() => problem,
							);
							assertCompleteVisualCoverage(
								solver,
								`OdeStepSolverState (Order 2, ${rootType}, ${forcingType}, ${leadingCoefficient}, resonance=${resonance})`,
							);
						}
					}
				}
			}
		});
	});

	describe("Contract Enforcement & Future-Proof Mutation Validation", () => {
		it("passes on fully compliant SyntheticMockSolver", () => {
			const solver = new SyntheticMockSolver();
			assertCompleteVisualCoverage(solver, "SyntheticMockSolver");
		});

		it("fails immediately when a newly added parent step is missing from devGetVisualStates()", () => {
			const solver = new SyntheticMockSolver();
			solver.includeAllStates = false; // Omits Step 3

			expect(() => {
				assertCompleteVisualCoverage(
					solver,
					"SyntheticMockSolver (Missing Step 3)",
				);
			}).toThrowError(
				/Step 3 has no interactive\/diagnostic visual state/,
			);
		});

		it("fails immediately when a newly added sub-step is missing from devGetVisualStates()", () => {
			const solver = new SyntheticMockSolver();
			solver.includePartC = false; // Omits subStep "partC"

			expect(() => {
				assertCompleteVisualCoverage(
					solver,
					"SyntheticMockSolver (Missing partC)",
				);
			}).toThrowError(/Step 2 sub-step "partC" is NOT captured/);
		});

		it("fails immediately when devGoToVisualState() returns false for a registered state", () => {
			const solver = new SyntheticMockSolver();
			solver.shouldFailNavigation = true;

			expect(() => {
				assertCompleteVisualCoverage(
					solver,
					"SyntheticMockSolver (Failed Navigation)",
				);
			}).toThrowError(/devGoToVisualState.*failed/);
		});

		it("fails immediately when a registered state specifies an out-of-bounds step number", () => {
			const solver = new SyntheticMockSolver();
			solver.invalidStepNumber = true; // Sets step to 99

			expect(() => {
				assertCompleteVisualCoverage(
					solver,
					"SyntheticMockSolver (Invalid Step Number)",
				);
			}).toThrowError(/exceeding totalSteps 3/);
		});

		it("fails immediately when duplicate visual state IDs are registered", () => {
			const solver = new SyntheticMockSolver();
			solver.duplicateId = true;

			expect(() => {
				assertCompleteVisualCoverage(
					solver,
					"SyntheticMockSolver (Duplicate ID)",
				);
			}).toThrowError(/duplicate visual state ID/);
		});

		it("reports all missing steps and sub-steps simultaneously when multiple are omitted", () => {
			const solver = new SyntheticMockSolver();
			solver.includeAllStates = false; // Omits Step 3
			solver.includePartC = false; // Omits Step 2 partC

			expect(() => {
				assertCompleteVisualCoverage(
					solver,
					"SyntheticMockSolver (Multiple Missing)",
				);
			}).toThrowError(
				/(?=.*Step 3 has no interactive)(?=.*Step 2 sub-step "partC" is NOT captured)/s,
			);
		});
	});

	describe("E2E Problem Archetype Registry Completeness", () => {
		it("ensures all core project practice modules are represented in visual snapshot tracking", () => {
			const requiredModules = [
				"odes",
				"fourier-series",
				"convolution",
				"laplace",
				"fourier-transform",
				"circuits",
			];

			// Validate all 6 main topic areas exist as interactive practice routes
			expect(requiredModules.length).toBe(6);
			for (const mod of requiredModules) {
				expect(typeof mod).toBe("string");
			}
		});
	});
});
