export type Theme = 'light' | 'dark'
;(() => {
  const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const doc = document.documentElement
  const docDataset = doc.dataset

  function updateTeme(theme: Theme) {
    localStorage.setItem('theme', theme)
    docDataset.theme = theme
    console.log(`Theme set to ${theme}`, docDataset)
  }

  if (darkMediaQuery.matches) {
    if (docDataset.theme !== 'light') {
      //   updateTeme('dark')
    }
  }
})()
