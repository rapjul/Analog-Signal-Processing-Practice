/**
 * Commitlint configuration for SignalLab.
 *
 * Enforces conventional commit standards, domain scopes, body list formatting,
 * and strict path sanitization (disallowing raw macOS, Linux, or Windows home paths).
 *
 * @type {import('@commitlint/types').UserConfig}
 */
const Configuration = {
	extends: ["@commitlint/config-conventional"],
	plugins: [
		{
			rules: {
				/**
				 * Enforces that any commit body uses unordered list items starting with '- '
				 * and ending with a period '.'.
				 *
				 * @param {import('@commitlint/types').Commit} parsed - The parsed commit object.
				 * @returns {[boolean, string?]} Validation result tuple.
				 */
				"body-list-format": (parsed) => {
					if (!parsed.body) return [true];
					const lines = parsed.body
						.split("\n")
						.map((line) => line.trim())
						.filter(Boolean);

					for (const line of lines) {
						if (!line.startsWith("- ")) {
							return [
								false,
								'each line in the commit body must be a list item starting with "- "',
							];
						}
						if (!line.endsWith(".")) {
							return [
								false,
								'each list item in the commit body must end with a period "."',
							];
						}
					}
					return [true];
				},

				/**
				 * Enforces that commit messages never contain raw absolute home directory paths
				 * for macOS (/Users/...), Linux (/home/... or /root/...), or Windows (C:\Users\...).
				 *
				 * @param {import('@commitlint/types').Commit} parsed - The parsed commit object.
				 * @returns {[boolean, string?]} Validation result tuple.
				 */
				"no-absolute-paths": (parsed) => {
					const forbiddenPathPatterns = [
						/\/Users\//i,
						/\/home\//i,
						/\/root\//i,
						/file:\/\/\/(?:Users|home|root)/i,
						/[A-Z]:\\Users\\/i,
					];

					for (const pattern of forbiddenPathPatterns) {
						if (pattern.test(parsed.raw)) {
							return [
								false,
								"commit message must not contain raw absolute home directory paths (use relative paths, '~', or '$HOME' instead)",
							];
						}
					}
					return [true];
				},
			},
		},
	],
	rules: {
		"header-max-length": [2, "always", 100],
		"body-max-line-length": [0], // Disable body max length to accommodate detailed list items
		"body-list-format": [2, "always"],
		"no-absolute-paths": [2, "always"],
		"scope-enum": [
			2,
			"always",
			[
				// Core domain and solver scopes
				"solvers",
				"solvers/ode",
				"solvers/fourier-series",
				"solvers/fourier-transform",
				"solvers/laplace",
				"solvers/convolution",
				"solvers/circuits",
				"its",

				// Math engine scopes
				"math-engine",
				"math-engine/ode",
				"math-engine/fourier-series",
				"math-rendering",
				"math-input",
				"evaluator",
				"math",
				"problems",

				// UI and design scopes
				"ui",
				"ui/nav",
				"ui/canvas",
				"ui/components",
				"theme",
				"typography",
				"fonts",
				"style",
				"css",
				"a11y",
				"visual",

				// Testing scopes
				"test",
				"tests",
				"e2e",
				"testing",

				// Docs scopes
				"docs",
				"adr",
				"docs/adr",
				"license",
				"roadmap",

				// Tooling, config, and infrastructure scopes
				"config",
				"deps",
				"tooling",
				"tools",
				"formatting",
				"format",
				"biome",
				"prettier",
				"dev",
				"git",
				"svelte",
				"pwa",
				"security",
			],
		],
	},
};

export default Configuration;
