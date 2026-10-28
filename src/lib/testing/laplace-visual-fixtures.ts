import type {
	LaplaceExerciseSpec,
	LaplaceFactor,
	LaplaceSignalTerm,
	RationalExercise,
} from "$lib/math-engine/laplace/types";

/** One reproducible curriculum archetype, shared by visual and coverage tests. */
export interface LaplaceVisualFixture {
	/** Stable gallery directory name. */ id: string;
	/** Human-readable archetype heading. */ title: string;
	/** Structured input, never inferred from rendered solution strings. */ spec: LaplaceExerciseSpec;
}

/** Actual screenshot registrations, also inspected by the independent coverage guard. */
export interface LaplaceVisualArchetype {
	/** Solver gallery group. */ module: "laplace";
	/** Stable fixture identity. */ slug: string;
	/** Human-readable problem heading. */ title: string;
	/** Exact shared problem query on the dedicated test origin. */ path: string;
	/** Reproducible configuration seed. */ seed: number;
	/** Laplace must never silently fall back to initial-only captures. */ isItsStepper: true;
}

/** @returns The shared Laplace registrations consumed directly by the E2E screenshot suite. */
export function laplaceVisualArchetypes(): LaplaceVisualArchetype[] {
	return laplaceVisualFixtures().map(({ id, title, spec }) => ({
		module: "laplace",
		slug: id,
		title,
		seed: spec.seed,
		isItsStepper: true,
		path: `/laplace?${new URLSearchParams({ v: "1", seed: String(spec.seed), config: JSON.stringify(spec) })}`,
	}));
}

/** @param real - Real location. @param multiplicity - Factor power. @param frequency - Positive conjugate frequency. @returns Exact factor metadata. */
function factor(
	real: string,
	multiplicity = 1,
	frequency = "0",
): LaplaceFactor {
	return { real, multiplicity, frequency };
}

/** @param side - Ordinary support. @param delay - Exact boundary. @param amplitude - Signed weight. @returns Unit-step signal parameters. */
function step(
	side: "left" | "right",
	delay = "0",
	amplitude = "1",
): LaplaceSignalTerm {
	return {
		kind: "exponential",
		side,
		delay,
		amplitude,
		rate: "0",
		frequency: "0",
		power: 0,
	};
}

/** @returns Fresh bounded fixtures covering every Laplace workflow and construction family. */
export function laplaceVisualFixtures(): LaplaceVisualFixture[] {
	const base: RationalExercise = {
		workflow: "inverse",
		seed: 73,
		system: false,
		rational: {
			gain: "2",
			zeros: [factor("-6")],
			poles: [factor("-3"), factor("-5")],
			delay: "0",
			region: -1,
		},
	};
	return [
		{
			id: "laplace-inverse-pfd",
			title: "Inverse: Supplied Seed-73 Problem",
			spec: base,
		},
		{
			id: "laplace-inverse-repeated",
			title: "Inverse: Repeated Pole and Factorial",
			spec: {
				...base,
				rational: {
					...base.rational,
					gain: "1",
					zeros: [],
					poles: [factor("-2", 4)],
				},
			},
		},
		{
			id: "laplace-inverse-quadratic",
			title: "Inverse: Quadratic Rewrite",
			spec: {
				...base,
				rational: {
					...base.rational,
					gain: "1",
					zeros: [factor("-1")],
					poles: [factor("-2", 1, "3")],
				},
			},
		},
		{
			id: "laplace-inverse-cancellation",
			title: "Inverse: Partial Multiplicity Cancellation",
			spec: {
				...base,
				rational: {
					...base.rational,
					gain: "1",
					zeros: [factor("-1")],
					poles: [factor("-1", 2), factor("-4")],
				},
			},
		},
		{
			id: "laplace-inverse-quotient",
			title: "Inverse: Delayed Impulse Quotient",
			spec: {
				...base,
				rational: {
					...base.rational,
					gain: "1",
					zeros: [factor("-1")],
					poles: [factor("-4")],
					delay: "1",
				},
			},
		},
		{
			id: "laplace-forward-support",
			title: "Forward: Checked Support Intervals",
			spec: {
				workflow: "forward",
				seed: 73,
				terms: [step("right"), step("left"), step("right", "1", "-1")],
			},
		},
		{
			id: "laplace-roc-system",
			title: "System: Two-Sided ROC and Stability",
			spec: {
				workflow: "roc",
				seed: 73,
				system: true,
				rational: {
					gain: "1",
					zeros: [factor("2")],
					poles: [factor("2"), factor("-1"), factor("1")],
					delay: "0",
					region: 1,
				},
			},
		},
		{
			id: "laplace-ode-impulse",
			title: "ODE: Fractional Initial State and Delayed Impulse",
			spec: {
				workflow: "ode",
				seed: 73,
				leading: "1",
				roots: [factor("-2", 2)],
				initial: ["-1/2", "0"],
				terms: [{ ...step("right", "1"), kind: "impulse" }],
			},
		},
	];
}
