// Aplica o tema escuro antes do app carregar, pra não piscar claro ao abrir.
;(function () {
  try {
    var t = localStorage.getItem('streak:tema') || 'claro'
    var dark = t === 'escuro' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (!dark) return
    var h = document.documentElement
    h.setAttribute('data-theme', 'dark')
    h.style.background = '#121314'
    var m = document.querySelector('meta[name="theme-color"]')
    if (m) m.setAttribute('content', '#121314')
  } catch (e) {
    /* sem armazenamento: fica no claro */
  }
})()
