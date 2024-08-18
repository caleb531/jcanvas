import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import ts from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	...ts.configs.recommended,
	prettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.jquery,
				...globals.node,
			},
		},
		rules: {
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-this-alias": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/triple-slash-reference": "off",
		},
	},
	{
		files: ["tests/**/*.js"],
		languageOptions: {
			globals: {
				...globals.qunit,
			},
		},
	},
	{
		ignores: [
			".DS_Store",
			"node_modules",
			"build",
			"dist",
			"coverage",
			".vercel",
			"package",
			".env",
			".env.*",
			"!.env.example",
			"pnpm-lock.yaml",
			"package-lock.json",
			"yarn.lock",
		],
	},
];
