/**
 * Laplace Transform & S-Domain Math Engine.
 * Implements Bilateral & Unilateral Laplace transforms, Partial Fraction Decomposition (PFD),
 * Region of Convergence (ROC) analysis, and BIBO/Asymptotic stability determination for UIUC ECE 210.
 */

/**
 * Region of Convergence (ROC) direction classification in the s-domain.
 * Determines system causality and stability properties.
 */
export type RocDirection =
	/** Right-sided ROC (Re(s) > max pole real part), corresponding to causal signals u(t) */
	| "right-sided"
	/** Left-sided ROC (Re(s) < min pole real part), corresponding to anti-causal signals u(-t) */
	| "left-sided"
	/** Two-sided ROC strip (min pole < Re(s) < max pole), corresponding to non-causal signals */
	| "two-sided";

/** Result of Partial Fraction Decomposition (PFD) for rational s-domain functions */
export interface PfdResult {
	/** System poles (roots of denominator D(s) = 0) */
	poles: number[];
	/** Corresponding partial fraction residues computed via Heaviside Cover-up */
	residues: number[];
	/** Formatted LaTeX expression for the time-domain signal x(t) */
	inverseLatex: string;
}

/** Result of BIBO stability analysis based on pole locations and ROC */
export interface StabilityAnalysis {
	/** Whether the system is BIBO stable (true if the ROC contains the imaginary axis j*w) */
	isBiboStable: boolean;
	/** Formatted LaTeX representation of the Region of Convergence (e.g., \operatorname{Re}(s) > -2) */
	rocLatex: string;
}

/** Interface for an individual step in the Laplace transform solution breakdown */
export interface LaplaceSolutionStep {
	/** Title or descriptive header of the step */
	title: string;
	/** Formatted LaTeX content showing algebraic substitutions, residues, or transform pairs */
	latex: string;
}

/** Supported archetype problem categories for s-domain practice */
export type LaplaceProblemType =
	| "inverse_pfd" // Inverse Laplace via Partial Fraction Decomposition
	| "inverse_direct" // Inverse Laplace via standard transform pairs
	| "forward" // Forward Laplace transform calculation
	| "roc_stability"; // Region of Convergence (ROC) and BIBO stability analysis

/** Interface representing a dynamically generated Laplace practice problem */
export interface LaplaceProblem {
	/** Unique identifier for the practice problem */
	id: string;
	/** Problem archetype category */
	problemType: LaplaceProblemType;
	/** Formatted LaTeX prompt question text */
	promptLatex: string;
	/** Reference correct answer LaTeX string */
	referenceAnswerLatex: string;
	/** Granular step-by-step solution derivation breakdown */
	solutionSteps: LaplaceSolutionStep[];
}

/**
 * Solves Partial Fraction Decomposition residues for N(s) / D(s) with distinct real poles.
 *
 * @param {number[]} numCoeffs Polynomial coefficients for numerator [b1, b0]
 * @param {number[]} poles Array of distinct real pole locations [p1, p2]
 * @returns {PfdResult} PfdResult object containing poles, residues, and inverse transform LaTeX
 */
export function evaluatePfdResidues(
	numCoeffs: number[],
	poles: number[],
): PfdResult {
	const residues: number[] = [];

	for (let i = 0; i < poles.length; i++) {
		const p_i = poles[i] ?? 0;
		// Evaluate N(p_i)
		const num0 = numCoeffs[0] ?? 0;
		const num1 = numCoeffs[1] ?? 0;
		const numVal = num0 * p_i + num1;
		// Evaluate product (p_i - p_j) for j != i
		let denVal = 1;
		for (let j = 0; j < poles.length; j++) {
			if (i !== j) {
				denVal *= p_i - (poles[j] ?? 0);
			}
		}
		residues.push(numVal / denVal);
	}

	// Format inverse transform LaTeX: sum_i (A_i * e^{p_i t} u(t))
	const terms = residues.map((res, idx) => {
		const p = poles[idx] ?? 0;
		const sign = res >= 0 ? (idx > 0 ? "+ " : "") : "- ";
		const absRes = Math.abs(res);
		const expTerm = p === 0 ? "" : `e^{${p}t}`;
		return `${sign}${absRes}${expTerm} u(t)`;
	});

	return {
		poles,
		residues,
		inverseLatex: terms.join(" "),
	};
}

/**
 * Evaluates ROC and stability for a system given its poles and ROC direction.
 *
 * @param {number[]} poles Array of pole real values
 * @param {RocDirection} direction ROC direction ('right-sided' | 'left-sided' | 'two-sided')
 * @returns {StabilityAnalysis} StabilityAnalysis object
 */
export function determineStability(
	poles: number[],
	direction: RocDirection,
): StabilityAnalysis {
	const maxPole = Math.max(...poles);
	const minPole = Math.min(...poles);

	switch (direction) {
		case "right-sided": {
			const isBiboStable = maxPole < 0;
			return {
				isBiboStable,
				rocLatex: `\\operatorname{Re}(s) > ${maxPole}`,
			};
		}
		case "left-sided": {
			const isBiboStable = minPole > 0;
			return {
				isBiboStable,
				rocLatex: `\\operatorname{Re}(s) < ${minPole}`,
			};
		}
		case "two-sided": {
			const isBiboStable = minPole < 0 && maxPole > 0;
			return {
				isBiboStable,
				rocLatex: `${minPole} < \\operatorname{Re}(s) < ${maxPole}`,
			};
		}
		default: {
			const _exhaustiveCheck: never = direction;
			throw new Error(
				`Unsupported ROC direction: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}

/**
 * Returns LaTeX for standard Laplace transform pairs.
 *
 * @param {string} type Signal pair identifier
 * @returns {{ timeLatex: string; laplaceLatex: string }} LaTeX pair object
 */
export function getLaplacePairLatex(type: string): {
	timeLatex: string;
	laplaceLatex: string;
} {
	switch (type) {
		case "exp":
			return {
				timeLatex: "e^{-a t} u(t)",
				laplaceLatex: "\\frac{1}{s + a}",
			};
		case "step":
			return { timeLatex: "u(t)", laplaceLatex: "\\frac{1}{s}" };
		case "delta":
			return { timeLatex: "\\delta(t)", laplaceLatex: "1" };
		default:
			throw new Error(`Unknown Laplace pair: ${type}`);
	}
}

/**
 * Generates a practice Laplace problem with dynamic parameter synthesis and step-by-step breakdowns.
 *
 * @param {LaplaceProblemType} problemType Type of Laplace problem ('inverse_pfd' | 'inverse_direct' | 'forward' | 'roc_stability')
 * @returns {LaplaceProblem} LaplaceProblem object
 */
export function generateLaplaceProblem(
	problemType: LaplaceProblemType = "inverse_pfd",
): LaplaceProblem {
	const id = `laplace-${problemType}-${Date.now()}`;

	switch (problemType) {
		case "inverse_pfd": {
			const polesList = [-1, -2, -3, -4, -5];
			const p1 =
				polesList[Math.floor(Math.random() * polesList.length)] ?? -1;
			let p2 =
				polesList[Math.floor(Math.random() * polesList.length)] ?? -2;
			while (p2 === p1) {
				p2 =
					polesList[Math.floor(Math.random() * polesList.length)] ??
					-2;
			}

			const b1 = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
			const b0 = Math.floor(Math.random() * 8) + 1; // 1 to 8

			const pfd = evaluatePfdResidues([b1, b0], [p1, p2]);
			const a1 = Math.abs(p1);
			const a2 = Math.abs(p2);

			return {
				id,
				problemType: "inverse_pfd",
				promptLatex: `\\text{Find the inverse Laplace transform } x(t) \\text{ of } X(s) = \\frac{${b1}s + ${b0}}{(s + ${a1})(s + ${a2})}`,
				referenceAnswerLatex: pfd.inverseLatex,
				solutionSteps: [
					{
						title: "Step 1: Set Up Partial Fraction Expansion",
						latex: `X(s) = \\frac{${b1}s + ${b0}}{(s + ${a1})(s + ${a2})} = \\frac{A}{s + ${a1}} + \\frac{B}{s + ${a2}}`,
					},
					{
						title: `Step 2: Solve Residue A at s = ${p1}`,
						latex: `A = \\left. (s + ${a1}) X(s) \\right|_{s = ${p1}} = \\frac{${b1}(${p1}) + ${b0}}{${p1} + ${a2}} = ${pfd.residues[0] ?? 0}`,
					},
					{
						title: `Step 3: Solve Residue B at s = ${p2}`,
						latex: `B = \\left. (s + ${a2}) X(s) \\right|_{s = ${p2}} = \\frac{${b1}(${p2}) + ${b0}}{${p2} + ${a1}} = ${pfd.residues[1] ?? 0}`,
					},
					{
						title: "Step 4: Perform Term-by-Term Inverse Transform",
						latex: `x(t) = \\mathcal{L}^{-1}\\left\\{${pfd.inverseLatex}\\right\\}`,
					},
				],
			};
		}
		case "inverse_direct": {
			const directTypes = ["trig", "delay", "impulse"];
			const chosen =
				directTypes[Math.floor(Math.random() * directTypes.length)] ??
				"trig";

			if (chosen === "trig") {
				const A = Math.floor(Math.random() * 4) + 1;
				const B = Math.floor(Math.random() * 3) + 1;
				const omega = Math.floor(Math.random() * 4) + 2; // 2, 3, 4, 5
				const wSq = omega * omega;
				const bOmega = B * omega;

				return {
					id,
					problemType: "inverse_direct",
					promptLatex: `\\text{Find } x(t) = \\mathcal{L}^{-1}\\left\\{\\frac{${A}s + ${bOmega}}{s^2 + ${wSq}}\\right\\}`,
					referenceAnswerLatex: `(${A} \\cos(${omega}t) + ${B} \\sin(${omega}t)) u(t)`,
					solutionSteps: [
						{
							title: "Step 1: Separate into Cosine and Sine Terms",
							latex: `X(s) = ${A} \\cdot \\frac{s}{s^2 + ${omega}^2} + ${B} \\cdot \\frac{${omega}}{s^2 + ${omega}^2}`,
						},
						{
							title: "Step 2: Recall Standard Trigonometric Pairs",
							latex: `\\mathcal{L}^{-1}\\left\\{\\frac{s}{s^2 + ${omega}^2}\\right\\} = \\cos(${omega}t) u(t), \\quad \\mathcal{L}^{-1}\\left\\{\\frac{${omega}}{s^2 + ${omega}^2}\\right\\} = \\sin(${omega}t) u(t)`,
						},
						{
							title: "Step 3: Combine Terms by Linearity",
							latex: `x(t) = (${A} \\cos(${omega}t) + ${B} \\sin(${omega}t)) u(t)`,
						},
					],
				};
			} else if (chosen === "delay") {
				const A = Math.floor(Math.random() * 4) + 1;
				const a = Math.floor(Math.random() * 4) + 1;
				const t0 = Math.floor(Math.random() * 3) + 1;

				return {
					id,
					problemType: "inverse_direct",
					promptLatex: `\\text{Find } x(t) = \\mathcal{L}^{-1}\\left\\{\\frac{${A} e^{-${t0}s}}{s + ${a}}\\right\\}`,
					referenceAnswerLatex: `${A} e^{-${a}(t-${t0})} u(t-${t0})`,
					solutionSteps: [
						{
							title: "Step 1: Identify Time-Shift Property",
							latex: `\\mathcal{L}^{-1}\\{e^{-${t0}s} F(s)\\} = f(t - ${t0}) u(t - ${t0})`,
						},
						{
							title: "Step 2: Inverse Transform of Unshifted Term",
							latex: `\\mathcal{L}^{-1}\\left\\{\\frac{${A}}{s + ${a}}\\right\\} = ${A} e^{-${a}t} u(t)`,
						},
						{
							title: "Step 3: Apply Time Shift",
							latex: `x(t) = ${A} e^{-${a}(t-${t0})} u(t-${t0})`,
						},
					],
				};
			} else {
				const A = Math.floor(Math.random() * 5) + 1;
				const B = Math.floor(Math.random() * 5) + 1;
				const a = Math.floor(Math.random() * 4) + 1;

				return {
					id,
					problemType: "inverse_direct",
					promptLatex: `\\text{Find } x(t) = \\mathcal{L}^{-1}\\left\\{${A} + \\frac{${B}}{s + ${a}}\\right\\}`,
					referenceAnswerLatex: `${A} \\delta(t) + ${B} e^{-${a}t} u(t)`,
					solutionSteps: [
						{
							title: "Step 1: Identify Impulse & Exponential Pairs",
							latex: `\\mathcal{L}^{-1}\\{1\\} = \\delta(t), \\quad \\mathcal{L}^{-1}\\left\\{\\frac{1}{s + ${a}}\\right\\} = e^{-${a}t} u(t)`,
						},
						{
							title: "Step 2: Combine Terms",
							latex: `x(t) = ${A} \\delta(t) + ${B} e^{-${a}t} u(t)`,
						},
					],
				};
			}
		}
		case "forward": {
			const c1 = Math.floor(Math.random() * 4) + 1;
			const c2 = Math.floor(Math.random() * 4) + 1;
			const a1 = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
			let a2 = Math.floor(Math.random() * 4) + 2; // 2, 3, 4, 5
			while (a2 === a1) a2 = a2 + 1;

			const b1 = c1 + c2;
			const b0 = c1 * a2 + c2 * a1;
			const d1 = a1 + a2;
			const d0 = a1 * a2;

			return {
				id,
				problemType: "forward",
				promptLatex: `\\text{Find } X(s) = \\mathcal{L}\\{x(t)\\} \\text{ for } x(t) = (${c1} e^{-${a1}t} + ${c2} e^{-${a2}t}) u(t)`,
				referenceAnswerLatex: `\\frac{${b1}s + ${b0}}{s^2 + ${d1}s + ${d0}}`,
				solutionSteps: [
					{
						title: "Step 1: Apply Exponential Transform Pair",
						latex: `\\mathcal{L}\\{e^{-at} u(t)\\} = \\frac{1}{s + a} \\implies X(s) = \\frac{${c1}}{s+${a1}} + \\frac{${c2}}{s+${a2}}`,
					},
					{
						title: "Step 2: Combine Terms Over Common Denominator",
						latex: `X(s) = \\frac{${c1}(s+${a2}) + ${c2}(s+${a1})}{(s+${a1})(s+${a2})} = \\frac{${b1}s + ${b0}}{s^2 + ${d1}s + ${d0}}`,
					},
				],
			};
		}
		case "roc_stability": {
			const polesList = [-3, -2, -1, 1, 2, 3];
			const p1 =
				polesList[Math.floor(Math.random() * polesList.length)] ?? -1;
			let p2 =
				polesList[Math.floor(Math.random() * polesList.length)] ?? 2;
			while (p2 === p1) {
				p2 =
					polesList[Math.floor(Math.random() * polesList.length)] ??
					2;
			}

			const directions: ("right-sided" | "left-sided" | "two-sided")[] = [
				"right-sided",
				"left-sided",
				"two-sided",
			];
			const direction =
				directions[Math.floor(Math.random() * directions.length)] ??
				"right-sided";
			const stability = determineStability([p1, p2], direction);

			return {
				id,
				problemType: "roc_stability",
				promptLatex: `\\text{Determine ROC and BIBO stability for } ${direction} \\text{ system } X(s) = \\frac{1}{(s - (${p1}))(s - (${p2}))}`,
				referenceAnswerLatex: `${stability.rocLatex}, \\quad \\text{${stability.isBiboStable ? "BIBO Stable" : "Unstable"}}`,
				solutionSteps: [
					{
						title: "Step 1: Identify System Poles",
						latex: `D(s) = 0 \\implies p_1 = ${p1}, \\quad p_2 = ${p2}`,
					},
					{
						title: "Step 2: Determine ROC Region",
						latex: `\\text{ROC for } ${direction} \\text{ system is } ${stability.rocLatex}`,
					},
					{
						title: "Step 3: Check Stability Criteria",
						latex: `\\operatorname{Re}(s) = 0 \\text{ ${stability.isBiboStable ? "is contained in" : "is NOT contained in"} ROC } \\implies \\text{${stability.isBiboStable ? "BIBO Stable" : "Unstable"}}`,
					},
				],
			};
		}
		default: {
			const _exhaustiveCheck: never = problemType;
			throw new Error(
				`Unsupported Laplace problem type: ${String(_exhaustiveCheck)}`,
			);
		}
	}
}
