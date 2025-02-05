export type Theme = 'light' | 'dark'
;(() => {
  const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const doc = document.documentElement
  const docDataset = doc.dataset

  const themeButton = document.querySelector<HTMLButtonElement>('#theme-toggle')

  const preferredDark = darkMediaQuery.matches || localStorage.getItem('theme') === 'dark'

  if (themeButton) {
    themeButton.addEventListener('click', toggleTheme)
  }

  function updateTeme(theme: Theme) {
    localStorage.setItem('theme', theme)
    docDataset.theme = theme
    console.log(`Theme set to ${theme}`, docDataset)
  }

  function toggleTheme() {
    const theme = docDataset.theme === 'light' ? 'dark' : 'light'
    updateTeme(theme)
  }

  updateTeme(preferredDark ? 'dark' : 'light')
})()
