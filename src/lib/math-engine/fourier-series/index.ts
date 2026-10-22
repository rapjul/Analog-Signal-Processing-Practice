/**
 * Fourier Series Domain Package Entry Point.
 *
 * Re-exports domain types, analytical solvers, problem generators, and ITS data builders.
 */

export * from "./generator";
export * from "./its-scaffolding/index";
export {
	computeHarmonicPowerContribution,
	FOURIER_POWER_TARGETS,
} from "./power";
export * from "./solver";
export * from "./types";
