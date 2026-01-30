import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const savedTheme = localStorage.getItem('synchub_theme')
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
