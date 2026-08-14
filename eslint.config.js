/**
 * ESLint flat configuration for the project.
 * Enforces prefer-exponentiation-operator rule across JavaScript and TypeScript files.
 */
export default [
	{
		files: ['src/**/*.{js,ts,svelte}', 'tests/**/*.{js,ts}', 'scripts/**/*.{js,ts}'],
		rules: {
			'prefer-exponentiation-operator': 'error',
		},
	},
];
