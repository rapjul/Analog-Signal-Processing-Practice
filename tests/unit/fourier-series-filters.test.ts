import { describe, expect, it } from "vitest";
import {
	isPrimaryFourierDrillWaveform,
	parseFourierSeriesFilters,
	serializeFourierSeriesFilters,
} from "$lib/problems/fourier-series-filters";

describe("Fourier Series URL Filters", () => {
	it("parses every supported hidden waveform variant safely", () => {
		const filters = parseFourierSeriesFilters(
			new URLSearchParams("waveform=triangle_odd&seed=123"),
			999,
		);

		expect(filters).toEqual({ waveform: "triangle_odd", seed: 123 });
		expect(isPrimaryFourierDrillWaveform(filters.waveform)).toBe(false);
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
