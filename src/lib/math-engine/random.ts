/** A small deterministic PRNG used by reproducible problem generators. */
export type RandomSource = () => number;

/**
 * Creates a deterministic Mulberry32 pseudo-random number generator.
 * The same 32-bit seed always produces the same sequence.
 */
export function createSeededPrng(seed: number): RandomSource {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
	};
}

/** Returns an integer in the inclusive range [min, max]. */
export function randomInt(
	random: RandomSource,
	min: number,
	max: number,
): number {
	return Math.floor(random() * (max - min + 1)) + min;
}

/** Picks one item using the supplied deterministic random source. */
export function randomChoice<T>(random: RandomSource, values: readonly T[]): T {
	if (values.length === 0)
		throw new Error("Cannot choose from an empty array");
	return values[randomInt(random, 0, values.length - 1)];
}

/** Returns a deterministically shuffled copy using Fisher-Yates. */
export function shuffleWithRandom<T>(
	values: readonly T[],
	random: RandomSource,
): T[] {
	const shuffled = [...values];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = randomInt(random, 0, i);
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/** Creates a shareable unsigned 32-bit seed for a new problem. */
export function createRandomSeed(): number {
	if (typeof globalThis.crypto?.getRandomValues === "function") {
		return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
	}
	return (Date.now() ^ Math.floor(Math.random() * 0x1_0000_0000)) >>> 0;
}
