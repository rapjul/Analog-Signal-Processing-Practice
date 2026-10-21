/** Shared coefficient names used by integral and evaluation questions. */
import type { FourierCoefficientTarget } from "./types";

/** Presentation metadata for one coefficient family. */
interface CoefficientMetadata {
	/** Mathematical symbol without delimiters or an equals sign. */
	readonly label: string;
	/** Existing learner-facing family title. */
	readonly title: string;
}

/** Exhaustive labels and titles for all supported coefficient targets. */
export const FOURIER_COEFFICIENT_METADATA = {
	a0: { label: "a_0", title: "DC Coefficient" },
	an: { label: "a_n", title: "Cosine Coefficients" },
	bn: { label: "b_n", title: "Sine Coefficients" },
	Fn: { label: "F_n", title: "Exponential Coefficients" },
} as const satisfies Record<FourierCoefficientTarget, CoefficientMetadata>;
