import path from 'node:path';
import { globSync } from 'glob';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const inputPaths = globSync('src/*.js');

export default inputPaths.map((inputPath) => {
	const inputFilename = path.basename(inputPath);
	return {
    input: [inputPath],
    external: ['jquery'],
    output: [
      {
        file: `dist/umd/${inputFilename}`,
        format: 'umd',
				name: 'jCanvas',
        sourcemap: true,
				globals: {
					jquery: '$'
				}
      },
      {
        file: `dist/esm/${inputFilename}`,
        format: 'esm',
        sourcemap: true,
				globals: {
					jquery: '$'
				}
      }
    ],
    plugins: [commonjs(), terser()]
  };
});
