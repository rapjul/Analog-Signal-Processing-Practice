import { readFile, realpath, stat } from "node:fs/promises";
import { createServer, type Server, type ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** MIME types needed by the generated Pages artifact. */
const contentTypes: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "application/javascript",
	".css": "text/css",
	".json": "application/json",
	".webmanifest": "application/manifest+json",
	".svg": "image/svg+xml",
	".png": "image/png",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
	".txt": "text/plain",
};

/**
 * Normalizes the same optional leading/trailing slash accepted by the build.
 * @param value - Root or project mount supplied through BASE_PATH.
 * @returns A mount without a trailing slash.
 */
export function normalizePagesBasePath(value: string): string {
	const trimmed = value.replace(/\/$/, "");
	const base = trimmed && !trimmed.startsWith("/") ? `/${trimmed}` : trimmed;
	if (base.includes("..") || /[?#\\]|\/\//.test(base)) {
		throw new Error("BASE_PATH must be a root or project pathname.");
	}
	return base;
}

/**
 * Finds a regular artifact file without following symlinks outside its root.
 * @param root - Canonical artifact directory.
 * @param target - Candidate path already checked against the artifact mount.
 * @returns The canonical static file, or undefined for the error fallback.
 */
async function findStaticFile(
	root: string,
	target: string,
): Promise<string | undefined> {
	const candidates = [target];
	if (!extname(target)) candidates.push(`${target}.html`);
	candidates.push(resolve(target, "index.html"));
	for (const candidate of candidates) {
		try {
			const canonical = await realpath(candidate);
			if (
				canonical.startsWith(`${root}${sep}`) &&
				(await stat(canonical)).isFile()
			) {
				return canonical;
			}
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code !== "ENOENT" && code !== "ENOTDIR") throw error;
		}
	}
	return undefined;
}

/**
 * Writes one artifact response with the appropriate MIME type and HEAD behavior.
 * @param response - Outgoing HTTP response.
 * @param file - Canonical file to send.
 * @param status - Success or fallback HTTP status.
 * @param headOnly - Whether to omit the response body.
 */
async function writeArtifact(
	response: ServerResponse,
	file: string,
	status: number,
	headOnly: boolean,
): Promise<void> {
	const body = await readFile(file);
	response.writeHead(status, {
		"Content-Type":
			status === 404
				? "text/html; charset=utf-8"
				: (contentTypes[extname(file)] ?? "application/octet-stream"),
		"Cache-Control": "no-store",
	});
	response.end(headOnly ? undefined : body);
}

/**
 * Serves only the mounted artifact, with HTML lookup and a real 404 response.
 * @param directory - Completed static build directory.
 * @param basePath - Root or project pathname used by that build.
 * @returns An unbound server; callers choose the listening port.
 */
export async function createPagesServer(
	directory: string,
	basePath: string,
): Promise<Server> {
	const root = await realpath(directory);
	const base = normalizePagesBasePath(basePath);
	const fallback = await realpath(resolve(root, "404.html"));
	if (!fallback.startsWith(`${root}${sep}`)) {
		throw new Error(
			"The Pages error shell must remain inside the artifact.",
		);
	}
	return createServer(
		/**
		 * Resolves requests within the artifact and never exposes sibling files.
		 * @param request - Incoming HTTP request.
		 * @param response - Response carrying the artifact or host error.
		 */
		async (request, response) => {
			try {
				if (request.method !== "GET" && request.method !== "HEAD") {
					response.writeHead(405, { Allow: "GET, HEAD" });
					response.end();
					return;
				}
				const url = new URL(request.url ?? "/", "http://localhost");
				const pathname = decodeURIComponent(url.pathname);
				if (base && pathname === base) {
					response.writeHead(308, {
						Location: `${base}/${url.search}`,
					});
					response.end();
					return;
				}
				if (!pathname.startsWith(`${base}/`)) {
					response.writeHead(404);
					response.end("Outside the Pages site.");
					return;
				}
				const relative = pathname.slice(base.length + 1);
				const target = resolve(root, relative || "index.html");
				if (target !== root && !target.startsWith(`${root}${sep}`)) {
					response.writeHead(403);
					response.end();
					return;
				}
				const file = await findStaticFile(root, target);
				await writeArtifact(
					response,
					file ?? fallback,
					file ? 200 : 404,
					request.method === "HEAD",
				);
			} catch (error) {
				response.writeHead(error instanceof URIError ? 400 : 500);
				response.end("Unable to serve the Pages artifact.");
			}
		},
	);
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const server = await createPagesServer(
		"./build",
		process.env.BASE_PATH ?? "",
	);
	server.listen(33211, "127.0.0.1");
}
