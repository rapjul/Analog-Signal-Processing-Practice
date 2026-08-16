/**
 * @file Unit tests for UpdateToast.svelte PWA notification component.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import UpdateToast from "$lib/components/ui/UpdateToast.svelte";

describe("UpdateToast.svelte", () => {
	afterEach(() => {
		cleanup();
	});
	it("does not render when show is false", () => {
		const { container } = render(UpdateToast, {
			props: {
				show: false,
			},
		});

		expect(container.querySelector(".update-toast")).toBeNull();
	});

	it("renders update prompt with proper ARIA attributes when mode is 'update'", () => {
		const { container } = render(UpdateToast, {
			props: {
				show: true,
				mode: "update",
			},
		});

		const toast = container.querySelector(".update-toast");
		expect(toast).not.toBeNull();
		expect(toast?.getAttribute("role")).toBe("status");
		expect(toast?.getAttribute("aria-live")).toBe("polite");
		expect(toast?.getAttribute("aria-label")).toBe(
			"Application update available",
		);

		expect(screen.getByText("New version available")).toBeDefined();
		expect(
			screen.getByRole("button", {
				name: "Update and refresh application",
			}),
		).toBeDefined();
		expect(
			screen.getByRole("button", { name: "Dismiss notification" }),
		).toBeDefined();
	});

	it("renders offline ready prompt without update button when mode is 'offline'", () => {
		const { container } = render(UpdateToast, {
			props: {
				show: true,
				mode: "offline",
			},
		});

		const toast = container.querySelector(".update-toast");
		expect(toast).not.toBeNull();
		expect(toast?.getAttribute("aria-label")).toBe(
			"Application ready for offline use",
		);

		expect(screen.getByText("Offline ready")).toBeDefined();
		expect(
			screen.queryByRole("button", {
				name: "Update and refresh application",
			}),
		).toBeNull();
		expect(
			screen.getByRole("button", { name: "Dismiss notification" }),
		).toBeDefined();
	});

	it("calls onUpdate callback when Update button is clicked", async () => {
		const onUpdateMock = vi.fn();

		render(UpdateToast, {
			props: {
				show: true,
				mode: "update",
				onUpdate: onUpdateMock,
			},
		});

		const updateBtn = screen.getByRole("button", {
			name: "Update and refresh application",
		});
		await fireEvent.click(updateBtn);

		expect(onUpdateMock).toHaveBeenCalledTimes(1);
	});

	it("calls onDismiss callback when Dismiss button is clicked", async () => {
		const onDismissMock = vi.fn();

		render(UpdateToast, {
			props: {
				show: true,
				mode: "update",
				onDismiss: onDismissMock,
			},
		});

		const dismissBtn = screen.getByRole("button", {
			name: "Dismiss notification",
		});
		await fireEvent.click(dismissBtn);

		expect(onDismissMock).toHaveBeenCalledTimes(1);
	});
});
