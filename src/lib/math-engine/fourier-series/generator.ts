/**
 * Fourier Series Problem Generator & Constructive Synthesis.
 *
 * Synthesizes parameterized Fourier Series problems, step solution breakdowns,
 * conversion challenges, and full ITS scaffolding models.
 */

import {
	createRandomSeed,
	createSeededPrng,
	randomChoice,
	shuffleWithRandom,
} from "../random";
import type { SolutionStep } from "../types";
import { formatFourierFrequency, formatFourierNumber } from "./frequency";
import {
	buildPrimarySeriesOptions,
	generateFourierSeriesItsData,
} from "./its-scaffolding/index";
import {
	buildCompactSeriesLatex,
	buildFourierSeriesSymbolicDerivation,
	buildSignalLatex,
	computeFourierSeriesCoefficients,
} from "./solver";
import type {
	FourierSeriesConversionChallenge,
	FourierSeriesGenerationOptions,
	FourierSeriesPrimaryForm,
	FourierSeriesProblem,
	FourierSeriesWaveformType,
} from "./types";

/** Display names shared by synthesis and conversion prompts. */
const formNames: Record<FourierSeriesPrimaryForm, string> = {
	trig: "Trigonometric",
	exp: "Exponential",
};

/**
 * Generates a practice Fourier Series problem with randomized parameters and ITS step metadata.
 *
 * Mathematical derivation process:
 * 1. Randomly samples peak amplitude A and fundamental period T0 (with w0 = 2 pi / T0).
 * 2. Computes trigonometric coefficients via symmetry rules:
 *    - Even symmetry (x(-t) = x(t)): b_n = 0, a_n = (4/T0) \int_0^{T0/2} x(t) \cos(n w0 t) dt.
 *    - Odd symmetry (x(-t) = -x(t)): a_0 = 0, a_n = 0, b_n = (4/T0) \int_0^{T0/2} x(t) \sin(n w0 t) dt.
 *    - Half-wave / Full-wave rectified sines: DC term a_0 = A / pi, even harmonics a_n = 2A / (pi (1 - n^2)).
 * 3. Converts to exponential Fourier series coefficients F_n = (a_n - j b_n) / 2.
 * 4. Synthesizes 7-step ITS metadata for interactive step-by-step guidance.
 *
 * @param {FourierSeriesWaveformType} [waveformType="square"] Selected waveform category
 * @param {FourierSeriesGenerationOptions} [options={}] Deterministic generation controls
 * @returns {FourierSeriesProblem} FourierSeriesProblem instance containing LaTeX representations and steps
 */
export function generateFourierSeriesProblem(
	waveformType: FourierSeriesWaveformType = "square",
	options: FourierSeriesGenerationOptions = {},
): FourierSeriesProblem {
	const seed = Number.isFinite(options.seed)
		? Math.trunc(options.seed ?? 0) >>> 0
		: createRandomSeed();
	const random = createSeededPrng(seed);
	const aValues = [1, 2, 3, 5, 10];
	const t0Values = [2, 4];
	const A = options.A ?? randomChoice(random, aValues);
	const T0 = options.T0 ?? randomChoice(random, t0Values);

	const coeffs = computeFourierSeriesCoefficients(waveformType, { A, T0 });
	const id = `fs_${waveformType}_${seed}`;
	const itsData = generateFourierSeriesItsData(coeffs, random);
	const w0Latex = formatFourierFrequency(T0);
	const periodLatex = formatFourierNumber(T0);
	const derivation = buildFourierSeriesSymbolicDerivation(coeffs, w0Latex);
	const alternateForm: FourierSeriesPrimaryForm =
		itsData.step4.correctForm === "trig" ? "exp" : "trig";
	const alternateLatex =
		alternateForm === "trig"
			? derivation.finalTrigLatex
			: derivation.finalExpLatex;
	const primaryName = formNames[itsData.step4.correctForm];
	const alternateName = formNames[alternateForm];
	const compactLatex = buildCompactSeriesLatex(coeffs, w0Latex);
	const conversionChallenge: FourierSeriesConversionChallenge = {
		parts: [
			{
				id: "alternate",
				title: `Convert to ${alternateName} Form`,
				prompt: `Convert the completed ${primaryName.toLowerCase()} series to its equivalent ${alternateName.toLowerCase()} representation.`,
				resultLatex: alternateLatex,
				options: shuffleWithRandom(
					buildPrimarySeriesOptions(alternateLatex, alternateForm),
					random,
				),
				hints: [
					"Use $F_0=a_0/2$ and $F_n=(a_n-jb_n)/2$ for positive indices.",
					"For a real signal, pair $F_n$ with $F_{-n}=F_n^*$ when returning to trigonometric form.",
					`The equivalent ${alternateName.toLowerCase()} representation is $${alternateLatex}$.`,
				],
			},
			{
				id: "compact",
				title: "Convert to Compact Harmonic Form",
				prompt: "Convert the harmonic coefficients to nonnegative amplitudes $c_n$ and phases $\\theta_n$.",
				resultLatex: compactLatex,
				options: shuffleWithRandom(
					buildPrimarySeriesOptions(compactLatex, "trig"),
					random,
				),
				hints: [
					"Use $c_0=a_0=2F_0$ for the constant coefficient.",
					"For $n>0$, use $c_n=2|F_n|=\\sqrt{a_n^2+b_n^2}$.",
					"Assign phase only to nonzero harmonics with $\\theta_n=\\operatorname{atan2}(-b_n,a_n)=\\angle F_n$.",
				],
			},
		],
	};

	const steps: SolutionStep[] = [
		{
			title: "Period and Fundamental Frequency",
			description:
				"Read one complete repetition from the waveform and convert its period to angular frequency.",
			latex: `T_0=${periodLatex}\\text{ s},\\qquad \\omega_0=\\frac{2\\pi}{T_0}=\\frac{2\\pi}{${periodLatex}}=${w0Latex}\\text{ rad/s}`,
		},
		{
			title: "Symmetry and Vanishing Terms",
			description:
				"Test origin parity and half-wave symmetry independently, then remove coefficient families that must vanish.",
			latex: `\\begin{gathered}\\text{origin parity: }${coeffs.originParity},\\qquad \\text{half-wave symmetry: }${coeffs.hasHalfWaveSymmetry ? "\\text{yes}" : "\\text{no}"}\\\\${coeffs.originParity === "odd" ? "a_0=a_n=0" : coeffs.originParity === "even" ? "b_n=0" : "a_n\\text{ and }b_n\\text{ must both be evaluated}"}\\end{gathered}`,
		},
		{
			title: "Representation Selection",
			description:
				coeffs.originParity === "none"
					? "Without centered parity, the exponential form evaluates both real and imaginary parts in one integral."
					: "Centered parity leaves one real coefficient family, so the trigonometric form is most efficient.",
			latex:
				coeffs.originParity === "none"
					? "F_n=\\frac{1}{T_0}\\int_{T_0}x(t)e^{-jn\\omega_0t}\\,dt"
					: "x(t)=\\frac{a_0}{2}+\\sum_{n=1}^{\\infty}[a_n\\cos(n\\omega_0t)+b_n\\sin(n\\omega_0t)]",
		},
		{
			title: "Piecewise Integral Setup",
			description:
				"Substitute the waveform on each non-zero interval, retaining the normalization and Fourier kernel.",
			latex: derivation.integralLatex,
		},
		{
			title: "Definite Integral Evaluation",
			description:
				"Apply the bounds and simplify parity factors such as $(-1)^n$ and $\\sin(n\\pi/2)$.",
			latex: derivation.evaluationLatex,
		},
		{
			title: "DC Offset Derivation",
			description:
				"Evaluate the average separately; the constant appearing in the trigonometric series is $a_0/2$.",
			latex: `a_0=\\frac{2}{T_0}\\int_{T_0}x(t)\\,dt=${derivation.a0Latex},\\qquad F_0=\\frac{a_0}{2}`,
		},
		{
			title: `${primaryName} Synthesis`,
			description:
				"Insert only the evaluated non-zero coefficients into the selected primary Fourier representation.",
			latex:
				itsData.step4.correctForm === "trig"
					? derivation.finalTrigLatex
					: derivation.finalExpLatex,
		},
	];

	const signalLatex = buildSignalLatex(waveformType, A, T0);

	return {
		id,
		seed,
		waveformType,
		title: "Practice Problem: Periodic Waveform",
		periodLatex: `T_0 = ${periodLatex}\\text{ s}`,
		omega0Latex: `\\omega_0 = \\frac{2\\pi}{${periodLatex}} = ${w0Latex}\\text{ rad/s}`,
		signalLatex,
		a0Latex: derivation.a0Latex,
		anLatex: derivation.anLatex,
		bnLatex: derivation.bnLatex,
		FnLatex: derivation.FnLatex,
		solutionSteps: steps,
		coeffs,
		itsData,
		conversionChallenge,
		conversionSolutionSteps: [
			{
				title: `${alternateName} Form Conversion`,
				description:
					"Convert the primary coefficients without re-integrating the waveform.",
				latex: alternateLatex,
			},
			{
				title: "Compact Harmonic Form Conversion",
				description:
					"Use nonnegative harmonic amplitudes and define phase only where the amplitude is nonzero.",
				latex: compactLatex,
			},
		],
	};
}
