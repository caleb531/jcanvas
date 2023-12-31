import path from 'node:path';
import { globSync } from 'glob';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const inputPaths = globSync('src/*.js');

export default inputPaths.map((inputPath) => {
  const inputFilenameWithoutExtension = path.basename(inputPath, '.js');
  return {
    input: [inputPath],
    external: ['jquery'],
    output: [
      {
        file: `dist/umd/${inputFilenameWithoutExtension}.min.js`,
        format: 'umd',
        name: 'jCanvas',
        sourcemap: true,
        globals: {
          jquery: '$'
        }
      },
      {
        file: `dist/esm/${inputFilenameWithoutExtension}.min.js`,
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
