import { describe, expect, it } from "vitest";
import { FOURIER_WAVEFORM_TYPES } from "$lib/math-engine/fourier-series";
import {
	parseFourierSeriesFilters,
	resolveFourierWaveformSelection,
	serializeFourierSeriesFilters,
} from "$lib/problems/fourier-series-filters";

describe("Fourier Series URL Filters", () => {
	it("parses every supported waveform variant safely", () => {
		const filters = parseFourierSeriesFilters(
			new URLSearchParams("waveform=triangle_odd&seed=123"),
			999,
		);

		expect(filters).toEqual({ waveform: "triangle_odd", seed: 123 });
	});

	it("preserves random selection in canonical URL state", () => {
		const filters = parseFourierSeriesFilters(
			new URLSearchParams("waveform=random&seed=123"),
			999,
		);
		const params = serializeFourierSeriesFilters(filters);

		expect(filters).toEqual({ waveform: "random", seed: 123 });
		expect(params.toString()).toBe("waveform=random&seed=123");
	});

	it("resolves random waveforms deterministically from the seed", () => {
		const first = resolveFourierWaveformSelection("random", 42);
		const second = resolveFourierWaveformSelection("random", 42);

		expect(second).toBe(first);
		expect(FOURIER_WAVEFORM_TYPES).toContain(first);
		expect(resolveFourierWaveformSelection("full_wave_sine", 42)).toBe(
			"full_wave_sine",
		);
	});

	it("falls back for unsupported waveform values and malformed seeds", () => {
		const filters = parseFourierSeriesFilters(
			new URLSearchParams("waveform=%3Cscript%3E&seed=-1"),
			456,
		);

		expect(filters).toEqual({ waveform: "square", seed: 456 });
	});

	it("serializes canonical shareable query parameters", () => {
		const params = serializeFourierSeriesFilters({
			waveform: "full_wave_sine",
			seed: 0xffff_ffff,
		});

		expect(params.toString()).toBe(
			"waveform=full_wave_sine&seed=4294967295",
		);
	});
});
