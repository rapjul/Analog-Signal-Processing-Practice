import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createPagesServer,
	normalizePagesBasePath,
} from "$lib/testing/pages-static-server";

/** Generated artifact fixture directory. */
let directory: string;
/** Server closed after each scenario. */
let server: Server | undefined;

/** Generates an artifact independently of Vite. */
beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), "signallab-pages-"));
	await mkdir(join(directory, "build", "folder"), { recursive: true });
	for (const [file, body] of [
		["index.html", "dashboard"],
		["odes.html", "solver"],
		["folder/index.html", "directory"],
		["404.html", "error shell"],
		["sw.js", "worker"],
	]) {
		await writeFile(join(directory, "build", file!), body!);
	}
	await writeFile(join(directory, "private.txt"), "outside artifact");
	await symlink(
		join(directory, "private.txt"),
		join(directory, "build", "escape.txt"),
	);
});

/** Releases the port and removes generated fixture files. */
afterEach(async () => {
	const running = server;
	if (running) {
		await new Promise<void>(
			/** @param done - Completes after the server closes. */
			(done) => {
				running.close(
					/** Completes fixture teardown. */
					() => done(),
				);
				running.closeAllConnections();
			},
		);
		server = undefined;
	}
	await rm(directory, { recursive: true, force: true });
});

/** @param basePath - Hosting mount selected by the matrix. */
describe.each(["", "/project"])("Pages mount %s", (basePath) => {
	/** Exercises file lookup, HTTP semantics, and filesystem isolation. */
	it("serves only its mounted artifact with genuine 404 responses", async () => {
		server = await createPagesServer(join(directory, "build"), basePath);
		const running = server;
		await new Promise<void>(
			/** @param done - Completes when the port is listening. */
			(done) => {
				running.listen(0, "127.0.0.1", done);
			},
		);
		const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
		for (const [path, body] of [
			["/", "dashboard"],
			["/odes?seed=10", "solver"],
			["/folder/", "directory"],
		]) {
			const response = await fetch(`${origin}${basePath}${path}`);
			expect(response.status).toBe(200);
			expect(await response.text()).toBe(body);
		}
		const missing = await fetch(`${origin}${basePath}/missing`);
		expect(missing.status).toBe(404);
		expect(await missing.text()).toBe("error shell");
		const worker = await fetch(`${origin}${basePath}/sw.js`, {
			method: "HEAD",
		});
		expect(worker.headers.get("content-type")).toBe(
			"application/javascript",
		);
		expect(await worker.text()).toBe("");
		expect(
			(await fetch(`${origin}${basePath}/sw.js`, { method: "POST" }))
				.status,
		).toBe(405);
		expect((await fetch(`${origin}${basePath}/%ZZ`)).status).toBe(400);
		expect(
			(await fetch(`${origin}${basePath}/%2e%2e%2fprivate.txt`)).status,
		).toBe(403);
		expect(
			await (await fetch(`${origin}${basePath}/escape.txt`)).text(),
		).toBe("error shell");
		if (basePath) {
			expect((await fetch(`${origin}/odes`)).status).toBe(404);
			const redirect = await fetch(`${origin}${basePath}?seed=10`, {
				redirect: "manual",
			});
			expect(redirect.status).toBe(308);
			expect(redirect.headers.get("location")).toBe(
				`${basePath}/?seed=10`,
			);
		}
	});
});

/** Ensures even the error fallback cannot expose a file outside the artifact. */
it("rejects an error shell symlink outside the build", async () => {
	await rm(join(directory, "build", "404.html"));
	await symlink(
		join(directory, "private.txt"),
		join(directory, "build", "404.html"),
	);
	await expect(
		createPagesServer(join(directory, "build"), ""),
	).rejects.toThrow("inside the artifact");
});

/** Documents accepted mount syntax and rejects URL components or traversal. */
it("normalizes root and project mounts and rejects ambiguous paths", () => {
	expect(normalizePagesBasePath("/")).toBe("");
	expect(normalizePagesBasePath("project/")).toBe("/project");
	for (const invalid of [
		"//project",
		"/../project",
		"/project?query",
		"/project#hash",
		"/project\\file",
	]) {
		expect(
			/** Rejects the invalid mount supplied by this case. */
			() => normalizePagesBasePath(invalid),
		).toThrow("BASE_PATH");
	}
});
