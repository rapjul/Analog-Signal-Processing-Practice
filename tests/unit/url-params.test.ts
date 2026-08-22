import { describe, expect, it } from "vitest";
import {
	parseBooleanParam,
	parseEnumParam,
	parseIntegerParam,
	parseSafeSeedParam,
	sanitizeParamString,
} from "$lib/problems/url-params";

describe("url-params utility", () => {
	describe("sanitizeParamString", () => {
		it("handles null and undefined gracefully", () => {
			expect(sanitizeParamString(null)).toBe("");
			expect(sanitizeParamString(undefined)).toBe("");
		});

		it("strips control characters (ASCII & Unicode C0/C1 control blocks)", () => {
			const contaminated =
				"valid\u0000text\u001Fwith\u007Fcontrol\u009Fchars";
			expect(sanitizeParamString(contaminated)).toBe(
				"validtextwithcontrolchars",
			);
		});

		it("trims leading and trailing whitespace", () => {
			expect(sanitizeParamString("   hello world   ")).toBe(
				"hello world",
			);
		});

		it("preserves legitimate mathematical and standard ASCII characters", () => {
			const text = "distinct_real-123_test";
			expect(sanitizeParamString(text)).toBe(text);
		});
	});

	describe("parseEnumParam", () => {
		const allowedValues = ["first", "second", "third"] as const;

		it("returns matched enum value when valid", () => {
			const params = new URLSearchParams("choice=second");
			const result = parseEnumParam(params, {
				key: "choice",
				allowedValues,
				fallback: "first",
			});

			expect(result).toEqual({
				value: "second",
				isFallback: false,
				rawValue: "choice=second".split("=")[1],
			});
		});

		it("returns fallback when key is missing", () => {
			const params = new URLSearchParams();
			const result = parseEnumParam(params, {
				key: "choice",
				allowedValues,
				fallback: "first",
			});

			expect(result).toEqual({
				value: "first",
				isFallback: true,
				rawValue: null,
			});
		});

		it("returns fallback for unrecognized enum values", () => {
			const params = new URLSearchParams("choice=unknown_option");
			const result = parseEnumParam(params, {
				key: "choice",
				allowedValues,
				fallback: "first",
			});

			expect(result).toEqual({
				value: "first",
				isFallback: true,
				rawValue: "unknown_option",
			});
		});

		it("safely neutralizes XSS and HTML script injection payloads", () => {
			const attackPayloads = [
				"<script>alert('xss')</script>",
				"<img src=x onerror=alert(1)>",
				"javascript:alert(1)",
				"<svg/onload=alert(1)>",
				'"><script>alert(1)</script>',
				"';alert(1);//",
			];

			for (const payload of attackPayloads) {
				const params = new URLSearchParams();
				params.set("choice", payload);

				const result = parseEnumParam(params, {
					key: "choice",
					allowedValues,
					fallback: "first",
				});

				expect(result.value).toBe("first");
				expect(result.isFallback).toBe(true);
			}
		});

		it("safely rejects SQL and template injection strings", () => {
			const attackPayloads = [
				"' OR '1'='1",
				"1; DROP TABLE users;--",
				"{{7*7}}",
				// biome-ignore lint/suspicious/noTemplateCurlyInString: Intentional template injection test payload.
				"${7*7}",
				// biome-ignore lint/suspicious/noTemplateCurlyInString: Intentional template injection test payload.
				"\\${7*7}",
				"<%= 7*7 %>",
			];

			for (const payload of attackPayloads) {
				const params = new URLSearchParams();
				params.set("choice", payload);

				const result = parseEnumParam(params, {
					key: "choice",
					allowedValues,
					fallback: "first",
				});

				expect(result.value).toBe("first");
				expect(result.isFallback).toBe(true);
			}
		});

		it("handles extremely long string payloads without hanging", () => {
			const params = new URLSearchParams();
			params.set("choice", "a".repeat(20000));

			const result = parseEnumParam(params, {
				key: "choice",
				allowedValues,
				fallback: "first",
			});

			expect(result.value).toBe("first");
			expect(result.isFallback).toBe(true);
		});
	});

	describe("parseSafeSeedParam", () => {
		const fixedFallback = () => 123456789;

		it("parses valid unsigned 32-bit integer seeds", () => {
			const testCases = [0, 1, 42, 999999, 0xffff_ffff];

			for (const expected of testCases) {
				const params = new URLSearchParams(`seed=${expected}`);
				const result = parseSafeSeedParam(params, {
					fallbackGenerator: fixedFallback,
				});

				expect(result.value).toBe(expected);
				expect(result.isFallback).toBe(false);
				expect(result.rawValue).toBe(String(expected));
			}
		});

		it("triggers fallback on missing seed", () => {
			const params = new URLSearchParams();
			const result = parseSafeSeedParam(params, {
				fallbackGenerator: fixedFallback,
			});

			expect(result.value).toBe(123456789);
			expect(result.isFallback).toBe(true);
			expect(result.rawValue).toBeNull();
		});

		it("triggers fallback on negative integers", () => {
			const params = new URLSearchParams("seed=-1");
			const result = parseSafeSeedParam(params, {
				fallbackGenerator: fixedFallback,
			});

			expect(result.value).toBe(123456789);
			expect(result.isFallback).toBe(true);
		});

		it("triggers fallback on floating point numbers", () => {
			const params = new URLSearchParams("seed=123.456");
			const result = parseSafeSeedParam(params, {
				fallbackGenerator: fixedFallback,
			});

			expect(result.value).toBe(123456789);
			expect(result.isFallback).toBe(true);
		});

		it("triggers fallback on numbers exceeding unsigned 32-bit range (4294967296+)", () => {
			const testCases = ["4294967296", "99999999999999999999", "1e10"];

			for (const raw of testCases) {
				const params = new URLSearchParams(`seed=${raw}`);
				const result = parseSafeSeedParam(params, {
					fallbackGenerator: fixedFallback,
				});

				expect(result.value).toBe(123456789);
				expect(result.isFallback).toBe(true);
			}
		});

		it("triggers fallback on non-numeric / injection strings", () => {
			const attackPayloads = [
				"NaN",
				"Infinity",
				"-Infinity",
				"null",
				"undefined",
				"0x10",
				"123abc",
				"<script>alert(1)</script>",
				"Robert'); DROP TABLE Students;--",
			];

			for (const payload of attackPayloads) {
				const params = new URLSearchParams();
				params.set("seed", payload);

				const result = parseSafeSeedParam(params, {
					fallbackGenerator: fixedFallback,
				});

				expect(result.value).toBe(123456789);
				expect(result.isFallback).toBe(true);
			}
		});

		it("generates default random seed fallback when options argument is omitted", () => {
			const params = new URLSearchParams("");
			const result = parseSafeSeedParam(params);

			expect(result.isFallback).toBe(true);
			expect(result.rawValue).toBeNull();
			expect(result.value).toBeGreaterThanOrEqual(0);
			expect(result.value).toBeLessThanOrEqual(4294967295);
		});
	});

	describe("parseIntegerParam", () => {
		it("parses valid integers within bounds", () => {
			const params = new URLSearchParams("val=25");
			const result = parseIntegerParam(params, {
				key: "val",
				min: 10,
				max: 50,
				fallback: 20,
			});

			expect(result).toEqual({
				value: 25,
				isFallback: false,
				rawValue: "25",
			});
		});

		it("clamps values below min bound", () => {
			const params = new URLSearchParams("val=5");
			const result = parseIntegerParam(params, {
				key: "val",
				min: 10,
				max: 50,
				fallback: 20,
			});

			expect(result.value).toBe(10);
			expect(result.isFallback).toBe(true);
		});

		it("clamps values above max bound", () => {
			const params = new URLSearchParams("val=100");
			const result = parseIntegerParam(params, {
				key: "val",
				min: 10,
				max: 50,
				fallback: 20,
			});

			expect(result.value).toBe(50);
			expect(result.isFallback).toBe(true);
		});

		it("falls back on invalid non-integer string", () => {
			const params = new URLSearchParams("val=not_a_number");
			const result = parseIntegerParam(params, {
				key: "val",
				min: 10,
				max: 50,
				fallback: 20,
			});

			expect(result.value).toBe(20);
			expect(result.isFallback).toBe(true);
		});

		it("falls back when integer parameter key is missing", () => {
			const params = new URLSearchParams("");
			const result = parseIntegerParam(params, {
				key: "val",
				fallback: 30,
			});

			expect(result.value).toBe(30);
			expect(result.isFallback).toBe(true);
			expect(result.rawValue).toBeNull();
		});

		it("falls back when integer exceeds safe integer bounds", () => {
			const params = new URLSearchParams("val=9007199254740992999");
			const result = parseIntegerParam(params, {
				key: "val",
				fallback: 40,
			});

			expect(result.value).toBe(40);
			expect(result.isFallback).toBe(true);
		});
	});

	describe("parseBooleanParam", () => {
		it("falls back when boolean parameter key is missing", () => {
			const params = new URLSearchParams("");
			const result = parseBooleanParam(params, {
				key: "flag",
				fallback: true,
			});

			expect(result.value).toBe(true);
			expect(result.isFallback).toBe(true);
			expect(result.rawValue).toBeNull();
		});

		it("parses truthy values correctly", () => {
			for (const val of ["true", "1", "yes", "on", "TRUE", "Yes"]) {
				const params = new URLSearchParams(`flag=${val}`);
				const result = parseBooleanParam(params, {
					key: "flag",
					fallback: false,
				});

				expect(result.value).toBe(true);
				expect(result.isFallback).toBe(false);
			}
		});

		it("parses falsy values correctly", () => {
			for (const val of ["false", "0", "no", "off", "FALSE", "No"]) {
				const params = new URLSearchParams(`flag=${val}`);
				const result = parseBooleanParam(params, {
					key: "flag",
					fallback: true,
				});

				expect(result.value).toBe(false);
				expect(result.isFallback).toBe(false);
			}
		});

		it("falls back on invalid strings", () => {
			const params = new URLSearchParams("flag=maybe");
			const result = parseBooleanParam(params, {
				key: "flag",
				fallback: false,
			});

			expect(result.value).toBe(false);
			expect(result.isFallback).toBe(true);
		});
	});
});
