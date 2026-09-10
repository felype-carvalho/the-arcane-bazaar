import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/cinzel/latin-500.css'
import '@fontsource/cinzel/latin-600.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@/assets/styles/index.css'
import App from '@/app/App'

document.querySelectorAll<HTMLMetaElement>('meta[property="og:image"], meta[name="twitter:image"]').forEach((meta) => {
  meta.content = new URL('/og.png', window.location.origin).href
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
