import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { globSync } from "glob";
import path from "node:path";

const inputPaths = globSync("src/*.{js,ts}");

export default inputPaths.map((inputPath) => {
	const inputFilenameWithoutExtension = path.basename(inputPath, ".js");
	return {
		input: [inputPath],
		external: ["jquery", "jcanvas"],
		output: [
			{
				file: `dist/umd/${inputFilenameWithoutExtension}.min.js`,
				format: "umd",
				name: "jCanvas",
				sourcemap: true,
				globals: {
					jquery: "$",
				},
			},
			{
				file: `dist/esm/${inputFilenameWithoutExtension}.min.js`,
				format: "esm",
				sourcemap: true,
				globals: {
					jquery: "$",
				},
			},
		],
		plugins: [commonjs(), typescript(), terser()],
	};
});
