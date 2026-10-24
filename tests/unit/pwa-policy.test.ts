/** Development must not install a worker implicitly; production retains offline support. */
import { describe, expect, it } from "vitest";
import { shouldRegisterServiceWorker } from "$lib/pwa-policy";

describe("service worker policy", () => {
	/** Only an exact opt-in enables workers while serving development modules. */
	it("requires explicit development opt-in", () => {
		for (const value of [undefined, "", "0", "true"])
			expect(shouldRegisterServiceWorker(true, value)).toBe(false);
		expect(shouldRegisterServiceWorker(true, "1")).toBe(true);
	});
	/** Production offline behavior is independent of the development preference. */
	it("always retains production registration", () => {
		for (const value of [undefined, "0", "1"])
			expect(shouldRegisterServiceWorker(false, value)).toBe(true);
	});
});
