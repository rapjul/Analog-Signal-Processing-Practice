/**
 * IndexedDB & In-Memory Practice History & Progress Tracker.
 * Manages user attempt history, module mastery scores, and bookmarks for SignalLab.
 */

export interface ProblemAttempt {
	/** Problem ID */
	problemId: string;
	/** Module ID e.g. 'odes', 'convolution', 'fourier-series', etc. */
	moduleId: string;
	/** Whether attempt was correct */
	isCorrect: boolean;
	/** Epoch timestamp in ms */
	timestamp: number;
}

export interface ModuleProgress {
	/** Module ID */
	moduleId: string;
	/** Total attempts */
	attemptsCount: number;
	/** Correct attempts */
	correctCount: number;
	/** Mastery percentage 0 to 100 */
	masteryPercent: number;
}

// In-memory store fallback for node/vitest environment
const inMemoryAttempts: ProblemAttempt[] = [];

/**
 * Records a new problem attempt.
 *
 * @param attempt Attempt details object
 * @returns Recorded ProblemAttempt
 */
export function recordAttempt(attempt: ProblemAttempt): ProblemAttempt {
	inMemoryAttempts.push(attempt);
	return attempt;
}

/**
 * Calculates current progress and mastery percentage for a module.
 *
 * @param moduleId Target module ID
 * @returns ModuleProgress object
 */
export function getModuleProgress(moduleId: string): ModuleProgress {
	const moduleAttempts = inMemoryAttempts.filter((a) => a.moduleId === moduleId);
	const attemptsCount = moduleAttempts.length;
	const correctCount = moduleAttempts.filter((a) => a.isCorrect).length;
	const masteryPercent = attemptsCount > 0 ? Math.round((correctCount / attemptsCount) * 100) : 0;

	return {
		moduleId,
		attemptsCount,
		correctCount,
		masteryPercent,
	};
}

/**
 * Formats attempt history list for UI display.
 *
 * @param moduleId Target module ID
 * @returns Array of ProblemAttempt
 */
export function formatAttemptHistory(moduleId: string): ProblemAttempt[] {
	return inMemoryAttempts
		.filter((a) => a.moduleId === moduleId)
		.sort((a, b) => b.timestamp - a.timestamp);
}
