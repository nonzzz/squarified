//  I won't consider rolldown dts plugin, isolation declaration isn't match for me.
// I have no time to change my code to fit with isolation declaration.
// I'll create a simple dts gen to my current need.
import { Extractor, ExtractorConfig, ExtractorLogLevel } from '@microsoft/api-extractor'
import fs from 'fs'
import { builtinModules } from 'module'
import path from 'path'
import { defineConfig } from 'rolldown'
import ts from 'typescript'
const external = [...builtinModules, 'vite']

export default defineConfig([
  {
    input: {
      index: 'src/index.ts',
      plugin: 'src/plugins/index.ts'
    },
    external,
    platform: 'node',
    output: [
      { dir: 'dist', format: 'esm', exports: 'named', entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs' },
      { dir: 'dist', format: 'cjs', exports: 'named', entryFileNames: '[name].js' }
    ],
    plugins: [
      {
        name: 'dts',
        closeBundle() {
          generateDTS()
          fs.rmSync(path.join(process.cwd(), 'dist/src'), { recursive: true })
        }
      }
    ]
  }
])

// refer https://github.com/microsoft/rushstack/issues/5106
// We should define a config only work for dts generation.

function generateDTS() {
  const files: Record<string, string> = {}
  const compilerOptions: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
    baseUrl: '.',
    moduleResolution: ts.ModuleResolutionKind.Node10,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    lib: ['lib.esnext.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    types: ['./global.d.ts'],
    strict: true,
    typeRoots: ['.'],
    esModuleInterop: true,
    skipLibCheck: true
  }
  const host = ts.createCompilerHost(compilerOptions)
  host.writeFile = (fileName, data) => {
    files[fileName] = data
  }
  console.log('Generating dts...')

  const rootFiles = [
    'src/index.ts',
    'src/plugins/index.ts'
  ]

  const program = ts.createProgram(rootFiles, compilerOptions, host)
  const emitResult = program.emit()

  const outputDir = 'dist'

  if (emitResult.emitSkipped) {
    console.error('TypeScript compilation failed')
    return
  }

  fs.mkdirSync(outputDir, { recursive: true })

  for (const filePath in files) {
    const relativePath = path.relative(process.cwd(), filePath)
    const outputPath = path.join(outputDir, relativePath)
    const outputDirname = path.dirname(outputPath)

    fs.mkdirSync(outputDirname, { recursive: true })

    fs.writeFileSync(outputPath, files[filePath])
  }

  const destFiles = [
    { input: 'dist/src/index.d.ts', output: 'dist/index.d.ts' },
    { input: 'dist/src/plugins/index.d.ts', output: 'dist/plugin.d.ts' }
  ]

  for (const { input, output } of destFiles) {
    const inputPath = path.join(process.cwd(), input)
    const outputPath = path.join(process.cwd(), output)
    const config = ExtractorConfig.prepare({
      configObject: {
        mainEntryPointFilePath: inputPath,
        projectFolder: process.cwd(),
        compiler: {
          tsconfigFilePath: path.join(process.cwd(), 'tsconfig.build.json')
        },
        dtsRollup: {
          enabled: true,
          untrimmedFilePath: outputPath,
          publicTrimmedFilePath: outputPath
        },
        messages: {
          extractorMessageReporting: {
            'ae-missing-release-tag': { logLevel: ExtractorLogLevel.None },
            'ae-unresolved-link': { logLevel: ExtractorLogLevel.None }
          }
        }
      },
      packageJsonFullPath: path.join(process.cwd(), 'package.json'),
      configObjectFullPath: undefined
    })

    const extractorResult = Extractor.invoke(config, {
      localBuild: true,
      showVerboseMessages: false
    })

    if (extractorResult.succeeded) {
      const dtsPath = outputPath
      const dmtsPath = dtsPath.replace('.d.ts', '.d.mts')
      const globalDTS = fs.readFileSync('./global.d.ts', 'utf8').replace(
        /declare module ['"]html\.mjs['"] \{[\s\S]*?export function html.*?\n\}/g,
        ''
      )
      if (fs.existsSync(dtsPath)) {
        fs.copyFileSync(dtsPath, dmtsPath)
        // then copy global.d.ts into
        for (const file of [dtsPath, dmtsPath]) {
          const c = fs.readFileSync(file, 'utf-8')
          fs.writeFileSync(file, globalDTS + '\n\n' + c)
        }
        console.log('Generated bundled declaration files successfully')
      }
    } else {
      console.error(
        `API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings`
      )
    }
  }
}
