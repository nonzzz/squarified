import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import { swc } from 'rollup-plugin-swc3'

export default defineConfig([
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.mjs', format: 'esm', exports: 'named' },
      { file: 'dist/index.js', format: 'cjs', exports: 'named' }
    ],
    plugins: [
      swc()
    ]
  },
  {
    input: 'src/plugins/index.ts',
    output: [
      { file: 'dist/plugins/index.mjs', format: 'esm', exports: 'named' },
      { file: 'dist/plugins/index.js', format: 'cjs', exports: 'named' }
    ],
    plugins: [
      swc()
    ]
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts' },
    plugins: [dts()]
  },
  {
    input: 'src/plugins/index.ts',
    output: { file: 'dist/plugins/index.d.ts' },
    plugins: [
      dts()
    ]
  }
])
