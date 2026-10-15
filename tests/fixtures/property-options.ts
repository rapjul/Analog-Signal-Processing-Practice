/**
 * Reads a bounded integer configuration for reproducible property tests.
 * @param name - Environment variable.
 * @param fallback - Default value.
 * @param min - Inclusive minimum.
 * @param max - Inclusive maximum.
 * @returns Validated integer, refusing malformed test configuration.
 */
function setting(
	name: string,
	fallback: number,
	min: number,
	max: number,
): number {
	const raw = process.env[name];
	if (raw === undefined) return fallback;
	const value = Number(raw);
	if (
		!/^-?\d+$/.test(raw) ||
		!Number.isInteger(value) ||
		value < min ||
		value > max
	)
		throw new Error(
			`Invalid ${name}: expected an integer in [${min}, ${max}].`,
		);
	return value;
}

/**
 * Supplies deterministic generation and shrinking, with replay via seed and path.
 * @returns Per-property settings; interrupted runs fail instead of silently passing.
 */
export function propertyOptions() {
	const path = process.env.SIGNALLAB_PROPERTY_PATH;
	const numRuns = setting("SIGNALLAB_PROPERTY_RUNS", 500, 1, 5000);
	return {
		seed: setting("SIGNALLAB_PROPERTY_SEED", 73, -2147483648, 2147483647),
		numRuns,
		...(path === undefined ? {} : { path }),
		interruptAfterTimeLimit: numRuns > 500 ? 300000 : 60000,
		markInterruptAsFailure: true,
		verbose: true,
	};
}
