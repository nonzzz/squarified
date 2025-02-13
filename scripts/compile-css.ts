/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// All of result should pipe into memory and declare a global vars

import * as babel from '@babel/core'
import stylexBabelPlugin from '@stylexjs/babel-plugin'
import type { Rule } from '@stylexjs/babel-plugin'
import fs from 'fs'
import path from 'path'

const rootDir = process.cwd()

const unstable_moduleResolution = { type: 'commonJS', rootDir }

export function produceCSS(rules: Array<Rule>) {
  return stylexBabelPlugin.processStylexRules(rules, false)
}

function pickupTheme(code: string): { theme: [Rule, Rule], code: string, css: string } {
  const res = babel.transform(code, {
    plugins: [['@stylexjs/babel-plugin', {
      unstable_moduleResolution
    }]],
    babelrc: false,
    filename: path.join(process.cwd(), 'scripts/var.stylex.ts').replace(/\\/g, '/')
  })
  // @ts-expect-error safe to assume that metadata is present
  if (res.metadata.stylex) {
    return {
      // @ts-expect-error safe to assume that metadata is present
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      theme: res.metadata.stylex.slice(-2),
      // @ts-expect-error safe to assume that metadata is present
      code: res?.code,
      // @ts-expect-error safe to assume that metadata is present
      css: produceCSS(res.metadata.stylex)
    }
  }
  throw new Error('No stylex metadata found')
}

export function transfromStyleX(code: string) {
  const res = babel.transform(code, {
    plugins: [['@stylex-extend/babel-plugin', {
      transport: 'attrs',
      unstable_moduleResolution
    }], ['@stylexjs/babel-plugin', {
      unstable_moduleResolution
    }]],
    babelrc: false,
    // Format it to ensure that the result is consistent with the rollup result
    filename: path.join(process.cwd(), 'scripts/style.ts').replace(/\\/g, '/')
  })

  if (!res) { throw new Error('No stylex metadata found') }
  return {
    code: res.code,
    // @ts-expect-error safe to assume that metadata is present
    css: produceCSS(res.metadata.stylex) + '\n' + res.metadata.globalStyle
  }
}

const style = fs.readFileSync(path.join(rootDir, 'scripts/style.ts'), 'utf-8')

const theme = fs.readFileSync(path.join(rootDir, 'scripts/var.stylex.ts'), 'utf-8')

function main() {
  const { css, code } = transfromStyleX(style)
  const { theme: [[light], [dark]], code: code2, css: css2 } = pickupTheme(theme)

  const data = {
    light,
    dark,
    code,
    css: css2 + '\n' + css,
    code2
  }
  process.stdout.write(JSON.stringify(data, null, 2))
}

main()
