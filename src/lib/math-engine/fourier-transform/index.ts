/** Public mathematics, lesson, presentation, and grading boundary for CTFT. */

export {
	buildCtftDerivation,
	formatCtftHalfWidth,
} from "$lib/math-engine/fourier-transform/its-scaffolding/derivation";
export { guideCtftLesson } from "$lib/math-engine/fourier-transform/its-scaffolding/guidance";
export type {
	CtftChoice,
	CtftLesson,
	CtftLessonPart,
	CtftLessonStage,
	CtftPartKind,
	CtftPracticeMode,
	CtftStageId,
} from "$lib/math-engine/fourier-transform/its-scaffolding/lesson";
export {
	buildCtftLesson,
	CTFT_COURSE_FAMILIES,
	CTFT_FAMILIES,
} from "$lib/math-engine/fourier-transform/its-scaffolding/lesson";
export type {
	CtftPair,
	CtftParameters,
	CtftProblem,
	CtftSignalType,
	CtftSolutionStep,
	CtftSpectrumPoint,
	GeneratedCtftProblem,
} from "./engine";
export {
	createCtftProblem,
	evaluateCtftSpectrum,
	evaluateEnergySpectrum,
	generateCtftProblem,
	getCtftPairLatex,
	validateCtftAnswer,
} from "./engine";
export {
	completedCtftParts,
	ctftCheckLabel,
	displayCtftInput,
	exactCtftSolution,
	summarizeCtftInput,
} from "./presentation";
export type { CtftPlotPoint, CtftSpectrumData } from "./spectrum";
export {
	buildCtftSpectrum,
	evaluateCtftRegular,
	selectCtftSpectrumSamples,
} from "./spectrum";
export {
	validateCtftCalculation,
	validateCtftConstant,
	validateCtftImpulseRows,
	validateCtftPhase,
	withCtftCalculationDiagnostics,
} from "./tutor-validation";
