/** Test-only adversarial families shared by unit and production browser verification. */
export interface TransformAdversary {
	/** Regression category for failure diagnostics. */ name: string;
	/** Additive term expressed in the requested independent variable. */ expression: string;
}

/**
 * Produces equivalent attack spellings for both grading surfaces.
 * @param variable - Time or angular-frequency symbol.
 * @returns A reproducible matrix of unsupported or structurally wrong terms.
 */
export function transformAdversaries(
	variable: "t" | "omega",
): TransformAdversary[] {
	const v = variable === "omega" ? String.raw`\omega` : "t";
	return [
		{
			name: "malformed-sized-command",
			expression: String.raw`\leftpi/pi-1`,
		},
		{
			name: "rounded-pi-step",
			expression: String.raw`u((3.14159265358979323843-\pi)${v})-u(${v})`,
		},
		{
			name: "rounded-pi-divisor",
			expression: String.raw`\frac{0}{3.14159265358979323843-\pi}`,
		},
		{
			name: "rounded-root-index",
			expression: String.raw`e^{(\sqrt[\sqrt{2}/1.4142135623730951]{2}-2)${v}}-1`,
		},
		{
			name: "rounded-root-rate",
			expression: String.raw`e^{(\sqrt{2}-1.4142135623730951)${v}}-1`,
		},
		{
			name: "rounded-log-rate",
			expression: String.raw`e^{(\ln(2)-0.6931471805599453)${v}}-1`,
		},
		{
			name: "rounded-e-rate",
			expression: `e^{(e-2.718281828459045)${v}}-1`,
		},
		{
			name: "rounded-e-base",
			expression: `2.718281828459045^{-4${v}}-e^{-4${v}}`,
		},
		{
			name: "undefined-root-constant",
			expression: String.raw`\frac{0}{\sqrt{2}\sqrt{2}-2}`,
		},
		{
			name: "rounded-root-pole",
			expression: String.raw`\frac{10^{-20}}{${v}-\sqrt{10000.000000000001}}`,
		},
		{ name: "step", expression: `u(${v}-100)` },
		{ name: "absolute", expression: `|${v}-100|+${v}-100` },
		{
			name: "square-root",
			expression: String.raw`\sqrt{(${v}-100)^2}+${v}-100`,
		},
		{
			name: "fourth-root",
			expression: String.raw`\sqrt[4]{(${v}-100)^4}+${v}-100`,
		},
		{
			name: "fractional-power",
			expression: `(( ${v}-100)^2)^{1/2}+${v}-100`,
		},
		{
			name: "log-exponential",
			expression: String.raw`e^{0.5\ln((${v}-100)^2)}+${v}-100`,
		},
		{
			name: "log-fourth-power",
			expression: String.raw`e^{\ln((${v}-100)^4)/4}+${v}-100`,
		},
		{
			name: "alternate-base",
			expression: String.raw`2^{\ln((${v}-100)^4)/(4\ln(2))}+${v}-100`,
		},
		{
			name: "log-command",
			expression: String.raw`e^{0.5\log((${v}-100)^2)}+${v}-100`,
		},
		{ name: "distant-gaussian", expression: `e^{-(${v}-100)^2}` },
		{
			name: "tiny-pole",
			expression: String.raw`\frac{10^{-20}}{${v}-100}`,
		},
		{ name: "tiny-linear", expression: `10^{-20}${v}` },
		{ name: "tiny-basis", expression: `10^{-20}e^{-${v}^2}` },
		{
			name: "nested-root",
			expression: String.raw`(\sqrt{(${v}-100)^2}+${v}-100)^2`,
		},
		{ name: "masked-log", expression: String.raw`0\ln(${v}-100)` },
		{ name: "masked-singularity", expression: "0(1/0)" },
		{ name: "masked-unknown", expression: "0z" },
		{ name: "tangent", expression: String.raw`\tan(${v})` },
	];
}
