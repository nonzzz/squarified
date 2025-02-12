export type Theme = 'light' | 'dark'
;(() => {
  const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const doc = document.documentElement
  const docDataset = doc.dataset

  const themeButton = document.querySelector<HTMLButtonElement>('#theme-toggle')

  const menuButton = document.querySelector<HTMLButtonElement>('#menu-toggle')

  const shadow = document.querySelector<HTMLDivElement>('#shadow')

  const sideMenu = document.querySelector<HTMLElement>('#menu')

  const preferredDark = darkMediaQuery.matches || localStorage.getItem('theme') === 'dark'

  if (themeButton) {
    themeButton.addEventListener('click', toggleTheme)
  }

  if (menuButton) {
    menuButton.addEventListener('click', toggleMenu)
  }

  if (shadow) {
    shadow.addEventListener('click', toggleMenu)
  }

  function updateTeme(theme: Theme) {
    localStorage.setItem('theme', theme)
    docDataset.theme = theme
  }

  function toggleTheme() {
    const theme = docDataset.theme === 'light' ? 'dark' : 'light'
    updateTeme(theme)
  }

  function toggleMenu() {
    if (!sideMenu) { return }
    sideMenu.classList.toggle('open')
    toggleShadow()
  }

  function toggleShadow() {
    if (!shadow) { return }
    shadow.classList.toggle('open')
  }

  updateTeme(preferredDark ? 'dark' : 'light')
})()
