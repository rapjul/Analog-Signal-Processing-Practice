/** Independently audited examples retained from the retired production bank. */
export const inverseFixtures = [
	{ numerator: [2, 10], poles: [-2, -4], residues: [3, -1] },
	{ numerator: [1, 7], poles: [-1, -3], residues: [3, -2] },
	{ numerator: [5, 13], poles: [-2, -3], residues: [3, 2] },
	{ numerator: [4, 18], poles: [-2, -5], residues: [10 / 3, 2 / 3] },
] as const;

/** Standard-pair fixtures include repeated, complex, delayed, and impulse terms. */
export const pairFixtures = [
	{ transform: "(3s+8)/(s^2+16)", inverse: "(3\\cos(4t)+2\\sin(4t))u(t)" },
	{ transform: "(s+3)/((s+3)^2+25)", inverse: "e^{-3t}\\cos(5t)u(t)" },
	{ transform: "4e^{-2s}/(s+5)", inverse: "4e^{-5(t-2)}u(t-2)" },
	{ transform: "6/(s+4)^4", inverse: "t^3e^{-4t}u(t)" },
	{ transform: "5+6/(s+2)", inverse: "5\\delta(t)+6e^{-2t}u(t)" },
] as const;

/** Forward fixtures avoid the undefined product of an impulse with a discontinuous step. */
export const forwardFixtures = [
	{ transform: "(6s+26)/((s+3)(s+5))", inverse: "(4e^{-3t}+2e^{-5t})u(t)" },
	{ transform: "3/((s+1)(s+4))", inverse: "(e^{-t}-e^{-4t})u(t)" },
	{ transform: "(5s+6)/(s(s+2))", inverse: "(3+2e^{-2t})u(t)" },
	{ transform: "(s+6)/(s+2)", inverse: "\\delta(t)+4e^{-2t}u(t)" },
] as const;
