import commonjs from "@rollup/plugin-commonjs";
import { globSync } from "glob";
import path from "node:path";
import esbuild from "rollup-plugin-esbuild";

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
		plugins: [commonjs(), esbuild({ minify: true })],
	};
});
