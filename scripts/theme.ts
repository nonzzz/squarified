export type Theme = 'light' | 'dark'
;(() => {
  const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const doc = document.documentElement
  const docDataset = doc.dataset

  const themeButton = document.querySelector<HTMLButtonElement>('#theme-toggle')

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

  if (darkMediaQuery.matches) {
    if (docDataset.theme !== 'light') {
      updateTeme('dark')
    }
  }
})()
