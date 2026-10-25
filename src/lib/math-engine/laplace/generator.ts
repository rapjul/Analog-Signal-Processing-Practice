import { createSeededPrng, randomInt } from "$lib/math-engine/random";
import { createLaplaceExercise } from "./configuration";
import type {
	LaplaceExercise,
	LaplaceExerciseSpec,
	LaplaceFactor,
	LaplaceSignalTerm,
} from "./types";

/** Supported selectable example families. */
export const LAPLACE_PRESETS = [
	"distinct",
	"cancellation",
	"repeated",
	"complex",
	"delay",
	"impulse",
	"two-sided",
	"random",
] as const;
/** Family selection. */
export type LaplacePreset = (typeof LAPLACE_PRESETS)[number];

/** @param real - Exact real part. @param multiplicity - Number of copies. @param frequency - Imaginary magnitude. @returns Factor. */
export function laplaceFactor(
	real = "-2",
	multiplicity = 1,
	frequency = "0",
): LaplaceFactor {
	return { real, frequency, multiplicity };
}

/** @param kind - Pair family. @returns Editable standard signal term. */
export function laplaceSignal(
	kind: LaplaceSignalTerm["kind"] = "exponential",
): LaplaceSignalTerm {
	return {
		kind,
		amplitude: "1",
		rate: "-2",
		frequency: kind === "cosine" || kind === "sine" ? "3" : "0",
		power: 0,
		delay: "0",
		side: "right",
	};
}

/** @param workflow - Requested workflow. @param seed - Deterministic seed. @param preset - Family. @returns Valid constructively generated exercise. */
export function generateLaplaceExercise(
	workflow: LaplaceExerciseSpec["workflow"] = "inverse",
	seed = 1,
	preset: LaplacePreset = "distinct",
): LaplaceExercise {
	const random = createSeededPrng(seed),
		rate = String(-randomInt(random, 1, 4));
	const family =
		preset === "random"
			? LAPLACE_PRESETS[randomInt(random, 0, 6)]!
			: preset;
	const spec =
		workflow === "forward"
			? forwardSpec(seed, family, rate, random)
			: workflow === "ode"
				? odeSpec(seed, family, rate)
				: rationalSpec(workflow, seed, family, rate);
	return createLaplaceExercise(spec);
}

/** @param seed - Reproducible seed. @param family - Pair family. @param rate - Generated rate. @param random - Seeded random source. @returns Forward specification. */
function forwardSpec(
	seed: number,
	family: LaplacePreset,
	rate: string,
	random: () => number,
): LaplaceExerciseSpec {
	const term = laplaceSignal(
		family === "complex"
			? "cosine"
			: family === "impulse"
				? "impulse"
				: "exponential",
	);
	term.rate = rate;
	term.amplitude = String(randomInt(random, 1, 4));
	if (family === "repeated") term.power = randomInt(random, 1, 3);
	if (family === "delay") term.delay = String(randomInt(random, 1, 3));
	if (family === "two-sided") {
		term.side = "left";
		term.rate = "2";
	}
	return {
		workflow: "forward",
		seed,
		terms:
			family === "cancellation"
				? [term, { ...term, amplitude: `-${term.amplitude}` }]
				: [term],
	};
}

/** @param seed - Reproducible seed. @param family - Operator/input family. @param rate - Generated root. @returns Initial-value specification. */
function odeSpec(
	seed: number,
	family: LaplacePreset,
	rate: string,
): LaplaceExerciseSpec {
	const roots =
		family === "repeated"
			? [laplaceFactor(rate, 2)]
			: family === "complex"
				? [laplaceFactor(rate, 1, "3")]
				: [laplaceFactor(rate)];
	const term = laplaceSignal(
		family === "impulse"
			? "impulse"
			: family === "complex"
				? "cosine"
				: "exponential",
	);
	term.rate = "0";
	term.amplitude = "2";
	if (family === "delay") term.delay = "2";
	return {
		workflow: "ode",
		seed,
		leading: "1",
		roots,
		initial: ["1", "0"],
		terms: [term],
	};
}

/** @param workflow - Inverse or system analysis. @param seed - Reproducible seed. @param family - Rational family. @param rate - Generated root. @returns Rational specification. */
function rationalSpec(
	workflow: "inverse" | "roc",
	seed: number,
	family: LaplacePreset,
	rate: string,
): LaplaceExerciseSpec {
	let poles = [laplaceFactor(rate), laplaceFactor(String(Number(rate) - 2))],
		zeros = [laplaceFactor(String(Number(rate) - 3))];
	if (family === "cancellation") zeros = [laplaceFactor(rate)];
	if (family === "repeated") {
		poles = [laplaceFactor(rate, 4)];
		zeros = [];
	}
	if (family === "complex") {
		poles = [laplaceFactor(rate, 1, "3")];
		zeros = [];
	}
	if (family === "impulse") {
		poles = [laplaceFactor(rate)];
		zeros = [laplaceFactor(String(Number(rate) - 3))];
	}
	if (family === "two-sided") {
		poles = [laplaceFactor("-2"), laplaceFactor("3")];
		zeros = [];
	}
	return {
		workflow,
		seed,
		system: workflow === "roc",
		rational: {
			gain: "2",
			zeros,
			poles,
			delay: family === "delay" ? "2" : "0",
			region: family === "two-sided" ? 1 : -1,
		},
	};
}
