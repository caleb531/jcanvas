import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { globSync } from "glob";
import path from "node:path";

const inputPaths = globSync(["src/jcanvas.ts", "src/jcanvas-*.ts"]);

export default inputPaths.map((inputPath) => {
	const inputFilenameWithoutExtension = path.basename(inputPath, ".ts");
	return {
		input: [inputPath],
		external: ["jquery", "jcanvas"],
		output: [
			{
				file: `dist/umd/${inputFilenameWithoutExtension}.min.js`,
				format: "umd",
				name: `jCanvas_${inputFilenameWithoutExtension}`,
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
