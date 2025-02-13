/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { injectGlobalStyle, inline } from '@stylex-extend/core'
import { attrs } from '@stylexjs/stylex'
import { colors, font } from './var.stylex'

export default injectGlobalStyle({
  body: {
    fontSize: '16px',
    fontFamily: font.sans,
    lineHeight: 1.5,
    '@media (min-width: 800px)': {
      position: 'relative',
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '50px 50px 500px 250px'
    }
  },
  // '*,*:before,*:after': {
  //   boxSizing: 'inherit',
  //   textRendering: 'geometricPrecision',
  //   WebkitTapHighlightColor: 'transparent'
  // },
  a: {
    color: 'inherit'
  },
  'p,small': {
    fontWeight: 400,
    color: 'inherit',
    letterSpacing: '-0.005625em'
  },
  p: {
    margin: '1em 0',
    fontSize: '1em',
    lineHeight: '1.625em'
  },
  small: {
    margin: '0',
    fontSize: '0.875em',
    lineHeight: '1.5em'
  },
  'nav a': {
    textDecoration: 'none'
  },
  'b,strong': {
    color: colors.foreground,
    fontWeight: 600
  },
  'ul,ol': {
    padding: 0,
    color: colors.foreground,
    margin: '8px 8px 8px 16px',
    listStyleType: 'none'
  },
  ol: {
    listStyleType: 'decimal'
  },
  li: {
    marginBottom: '0.625em',
    fontSize: '1em',
    lineHeight: '1.625em'
  },
  'h1,h2,h3,h4,h5,h6': {
    color: 'inherit',
    margin: '0 0 0.7rem 0'
  },
  h1: {
    fontSize: '3rem',
    letterSpacing: '-0.02em',
    lineHeight: 1.5,
    fontWeight: 700
  },
  h2: {
    fontSize: '2.25rem',
    letterSpacing: '-0.02em',
    fontWeight: 600
  },
  h3: {
    fontSize: '1.5rem',
    letterSpacing: '-0.02em',
    fontWeight: 600
  },
  h4: {
    fontSize: '1.25rem',
    letterSpacing: '-0.02em',
    fontWeight: 600
  },
  h5: {
    fontSize: '1rem',
    letterSpacing: '-0.01em',
    fontWeight: 600
  },
  h6: {
    fontSize: '0.875rem',
    letterSpacing: '-0.005em',
    fontWeight: 600
  },
  'button,input,select,textarea': {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    color: 'inherit',
    margin: 0,
    '&:focus': {
      outline: 'none'
    }
  },
  code: {
    fontFamily: font.mono,
    fontSize: '0.9em',
    whiteSpace: 'pre-wrap',
    '&:before,&:after': {
      content: "'`'"
    }
  },
  pre: {
    padding: '14px 16px',
    backgroundColor: colors.accents_1,
    margin: '16px 0',
    fontFamily: font.mono,
    whiteSpace: 'pre',
    lineHeight: 1.5,
    textAlign: 'left',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
    fontSize: '14px'
  }
})

export const menu = attrs(inline({
  position: 'fixed',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  maxWidth: '1300px',
  margin: {
    default: '0',
    '@media (min-width: 800px)': '0 auto'
  },
  transform: {
    default: 'none',
    '@media (min-width: 800px)': 'translateX(-220px)'
  },
  width: {
    default: '220px',
    '@media (min-width: 800px)': 'initial'
  },
  boxShadow: 'none',
  display: {
    default: 'none',
    '@media (min-width: 800px)': 'block'
  },
  backgroundColor: {
    default: colors.menu_bg,
    '@media (min-width: 800px)': 'transparent'
  },
  ':not(#__) .open': {
    padding: '30px 0 0 30px',
    transform: 'translateX(0)',
    boxSizing: 'border-box',
    zIndex: 4,
    boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)'
  }
}))

export const menuContent = attrs(inline({
  marginTop: '20px',
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  padding: '50px 0 30px 30px'
}))

export const menuBadge = attrs(inline({
  display: {
    default: 'block',
    '@media (min-width: 800px)': 'none'
  },
  position: 'fixed',
  left: '-20px',
  top: 0,
  right: '-20px',
  height: '50px',
  padding: '0 20px',
  zIndex: 2,
  boxShadow: `0 0 10px rgba(0,0,0, ${colors.menu_opacity})`,
  backgroundColor: colors.menu_bg,
  color: colors.foreground,
  ':not(#__) svg': {
    height: '50px',
    width: '25px',
    paddingLeft: '12px'
  }
}))

export const shadow = attrs(inline({
  position: 'fixed',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  zIndex: 3,
  visibility: 'hidden',
  backgroundColor: '#000',
  transition: 'visibility 0.25s, background-color 0.25s',
  ':not(#__) .open': {
    visibility: 'visible',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  }
}))

export const main = attrs(inline({
  padding: {
    default: '60px 20px 0 20px',
    '@media (min-width: 800px)': '0'
  },
  boxSizing: 'border-box',
  zIndex: 1,
  position: 'relative'
}))
