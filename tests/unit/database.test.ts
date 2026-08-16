import { describe, expect, it } from "vitest";
import {
	formatAttemptHistory,
	getModuleProgress,
	recordAttempt,
} from "$lib/db/database";

describe("IndexedDB & Progress Tracker (database.ts)", () => {
	it("should record problem attempt and compute module mastery score", () => {
		const attempt = recordAttempt({
			problemId: "odes-1",
			moduleId: "odes",
			isCorrect: true,
			timestamp: Date.now(),
		});

		expect(attempt.problemId).toBe("odes-1");
		const progress = getModuleProgress("odes");
		expect(progress.attemptsCount).toBeGreaterThanOrEqual(1);
		expect(progress.masteryPercent).toBeGreaterThanOrEqual(0);
	});

	it("should format attempt history cleanly for UI breakdown", () => {
		const history = formatAttemptHistory("odes");
		expect(Array.isArray(history)).toBe(true);
	});
});
