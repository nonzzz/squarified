import { defineVars } from '@stylexjs/stylex'

const DARK = '@media (prefers-color-scheme: dark)'

export const font = defineVars({
  sans: '"Inter", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  mono: 'ui-monospace, "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace'
})

const lightColors = {
  background: '#fff',
  foreground: '#000',
  accents_1: '#fafafa',
  display_dark: 'none',
  display_light: 'block',
  anchor: '#000',
  menu_bg: '#fafafa',
  menu_opacity: '0.25'
}

const darkColros = {
  background: '#000',
  foreground: '#ddd',
  accents_1: '#111',
  display_dark: 'block',
  display_light: 'none',
  anchor: '#ddd',
  menu_bg: '#222',
  menu_opacity: '0.65'
}

export const colors = defineVars({
  background: {
    default: lightColors.background,
    [DARK]: darkColros.background
  },
  foreground: {
    default: lightColors.foreground,
    [DARK]: darkColros.foreground
  },
  accents_1: {
    default: lightColors.accents_1,
    [DARK]: darkColros.accents_1
  },
  display_light: {
    default: lightColors.display_light,
    [DARK]: darkColros.display_dark
  },
  display_dark: {
    default: lightColors.display_dark,
    [DARK]: darkColros.display_light
  },
  anchor: {
    default: lightColors.anchor,
    [DARK]: darkColros.anchor
  },
  menu_bg: {
    default: lightColors.menu_bg,
    [DARK]: darkColros.menu_bg
  },
  menu_opacity: {
    default: lightColors.menu_opacity,
    [DARK]: darkColros.menu_opacity
  }
})
