import { test as base, expect } from "@playwright/test";

/** Mount shared by the build, static host, and browser assertions. */
const basePath = (process.env.BASE_PATH ?? "").replace(/\/$/, "");
/** Browser origin reserved for the isolated static host. */
const origin = "http://127.0.0.1:33211";
/** All dashboard modules and their visible page titles. */
const modules = [
	{ route: "/odes", title: /Linear Constant-Coefficient ODEs/ },
	{ route: "/fourier-series", title: /Fourier Series Analysis/ },
	{ route: "/fourier-transform", title: /Continuous-Time Fourier Transform/ },
	{ route: "/convolution", title: /Continuous-Time Convolution/ },
	{ route: "/laplace", title: /Laplace Transform/ },
	{ route: "/circuits", title: /Circuit Analysis/ },
];

/**
 * Builds a seeded URL using the convolution module's versioned Share contract.
 * @param route - Module pathname without the hosting prefix.
 * @returns A URL with the seed retained by that module's normalizer.
 */
function seededModuleURL(route: string): string {
	const shared = route === "/convolution" ? "share=1&v=2&" : "";
	return `${basePath}${route}?${shared}seed=10`;
}

/** Icon resource emitted by the web manifest. */
interface ManifestIcon {
	/** Resource URL resolved against the manifest URL. */
	src: string;
}

/** Module launch shortcut emitted by the web manifest. */
interface ManifestShortcut {
	/** Module launch URL. */
	url: string;
	/** Icons displayed beside the shortcut. */
	icons: ManifestIcon[];
}

/** Resource references emitted by the PWA plugin. */
interface Manifest {
	/** Launch URL. */
	start_url: string;
	/** Navigation scope. */
	scope: string;
	/** Installed application identity. */
	id: string;
	/** Installation icons. */
	icons: ManifestIcon[];
	/** Module launch shortcuts. */
	shortcuts: ManifestShortcut[];
}

/** Automatic audit attached to each browser scenario. */
interface AuditFixtures {
	/** Verifies requests and application exceptions. */
	audit: void;
}

const test = base.extend<AuditFixtures>({
	audit: [
		/**
		 * Audits browser and worker traffic while the scenario runs.
		 * @param fixtures - Browser context and page.
		 * @param use - Executes the scenario.
		 */
		async ({ context, page }, use) => {
			const failures: string[] = [];
			context.on(
				"request",
				/** @param request - Browser or worker request. */ (
					request,
				) => {
					const url = new URL(request.url());
					if (!url.protocol.startsWith("http")) return;
					if (
						url.origin !== origin ||
						!url.pathname.startsWith(`${basePath}/`)
					) {
						failures.push(`Request escaped Pages: ${url.href}`);
					}
				},
			);
			context.on(
				"response",
				/** @param response - Browser or worker response. */ (
					response,
				) => {
					const expected404 =
						new URL(response.url()).pathname ===
						`${basePath}/missing-pages-smoke`;
					if (response.status() >= 400 && !expected404) {
						failures.push(`${response.status()} ${response.url()}`);
					}
				},
			);
			page.on(
				"pageerror",
				/** @param error - Application exception. */ (error) => {
					failures.push(error.message);
				},
			);
			context.on(
				"requestfailed",
				/** @param request - Failed resource request. */ (request) => {
					if (request.failure()?.errorText !== "net::ERR_ABORTED") {
						failures.push(`Failed request: ${request.url()}`);
					}
				},
			);
			await use();
			expect(failures).toEqual([]);
		},
		{ auto: true },
	],
});

/** Static checks disable workers so cached HTML cannot hide host failures. */
test.describe("online Pages artifact", () => {
	test.use({ serviceWorkers: "block" });

	/** @param fixtures - Isolated browser page. */
	test("dashboard, modules, reloads, and error recovery stay within the mount", async ({
		page,
	}) => {
		for (const module of modules) {
			await page.goto(`${basePath}/`);
			await page
				.locator(`.module-card[href="${basePath}${module.route}"]`)
				.click();
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(
				module.title,
			);
			await expect(page.locator(".nav-link.active")).toHaveAttribute(
				"href",
				`${basePath}${module.route}`,
			);
			await page.goto(seededModuleURL(module.route));
			await page.reload();
			await expect(page).toHaveURL(
				/** @param url - Current URL with normalized module filters. */
				(url) =>
					url.origin === origin &&
					url.pathname === `${basePath}${module.route}` &&
					url.searchParams.get("seed") === "10",
			);
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(
				module.title,
			);
		}
		const response = await page.goto(`${basePath}/missing-pages-smoke`);
		expect(response?.status()).toBe(404);
		await expect(
			page.getByRole("heading", { name: "Signal Not Found" }),
		).toBeVisible();
		const recoveryLinks = page.locator(".quick-link");
		await expect(recoveryLinks).toHaveCount(3);
		for (const link of await recoveryLinks.all()) {
			expect(
				(await link.getAttribute("href"))?.startsWith(`${basePath}/`),
			).toBe(true);
		}
		await recoveryLinks.first().click();
		await expect(page).toHaveURL(
			/** @param url - Recovery target with optional generated filters. */
			(url) =>
				url.origin === origin && url.pathname === `${basePath}/odes`,
		);
		await page.goto(`${basePath}/missing-pages-smoke`);
		await page.locator(".home-button").click();
		await expect(page).toHaveURL(`${origin}${basePath}/`);
	});

	/** @param fixtures - Browser page and manifest HTTP client. */
	test("manifest launch URLs, shortcuts, and icons resolve within the mount", async ({
		page,
		request,
	}) => {
		await page.goto(`${basePath}/`);
		const manifestURL = await page
			.locator('link[rel="manifest"]')
			.first()
			.evaluate(
				/** @param element - Manifest link resolved against the document. */
				(element: HTMLLinkElement) => element.href,
			);
		const response = await request.get(manifestURL);
		expect(response.status()).toBe(200);
		const manifest: Manifest = await response.json();
		expect(manifest.start_url).toBe(`${basePath}/`);
		expect(manifest.scope).toBe(`${basePath}/`);
		expect(manifest.id).toBe("Analog-Signal-Processing-Practice/v1");
		expect(manifest.icons.length).toBeGreaterThan(0);
		expect(manifest.shortcuts.length).toBeGreaterThan(0);
		const resources = [manifest.start_url];
		for (const icon of manifest.icons) resources.push(icon.src);
		for (const shortcut of manifest.shortcuts) {
			resources.push(shortcut.url);
			for (const icon of shortcut.icons) resources.push(icon.src);
		}
		for (const resource of resources) {
			const url = new URL(resource, manifestURL);
			expect(url.origin).toBe(origin);
			expect(url.pathname.startsWith(`${basePath}/`)).toBe(true);
			expect((await request.get(url.href)).status(), url.href).toBe(200);
		}
	});
});

/** @param fixtures - Fresh page and context with workers enabled. */
test("worker activates at the mount and serves unvisited solvers offline", async ({
	page,
	context,
}) => {
	await page.goto(`${basePath}/`);
	const scope = await page.evaluate(
		/** Waits for the worker to finish precaching the artifact. */
		async () => (await navigator.serviceWorker.ready).scope,
	);
	expect(scope).toBe(`${origin}${basePath}/`);
	await page.reload();
	await expect
		.poll(
			/** Checks that navigation is controlled by the activated worker. */
			async () =>
				page.evaluate(
					/** Reports activation and control of the document. */
					() => navigator.serviceWorker.controller?.state,
				),
		)
		.toBe("activated");
	await context.setOffline(true);
	for (const { route, title } of modules) {
		if (!["/odes", "/fourier-series", "/convolution"].includes(route))
			continue;
		await page.goto(seededModuleURL(route));
		await page.reload();
		await expect(page).toHaveURL(
			/** @param url - Current URL with normalized module filters. */
			(url) =>
				url.origin === origin &&
				url.pathname === `${basePath}${route}` &&
				url.searchParams.get("seed") === "10",
		);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
		await expect(page.locator(".step-card.active")).toBeVisible();
		await expect(page.locator(".katex-error")).toHaveCount(0);
	}
});
