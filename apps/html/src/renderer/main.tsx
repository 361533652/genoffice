// side-effect import, and deliberately first: installs the `window.desktop`
// fallback before any other module can read it (see host-install.ts)
import './host-install'
import { getHost } from '@genoffice/host'
import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang, type Lang } from '@genoffice/i18n'
import App from './App'
import { PresentView } from './PresentView'
import { LocaleProvider } from './i18n/locale'
import type { UiTheme } from '../shared/ipc'
import { applyAiPanelPrefs, installScreenTips } from '@genoffice/ui'
import '@genoffice/ui/tokens.css'
import '@genoffice/ui/screentip.css'
import '@genoffice/ui/ai-model-picker.css'
import '@genoffice/ui/ai-queue-strip.css'
import '@genoffice/ui/ai-usage.css'
import '@genoffice/ui/ai-skills.css'
import '@genoffice/ui/dropdown.css'
import '@genoffice/ui/find-panel.css'
import '@genoffice/ui/color-picker.css'
import '@genoffice/ui/ribbon-collapse.css'
import '@genoffice/ui/ai-panel-prefs.css'
import '@genoffice/ui/ai-scope-quote.css'
import '@genoffice/ui/image-dialogs.css'
import './styles.css'
// after the app's own stylesheet: these rules intentionally override desktop
// base rules such as `body { min-width: 720px }` at narrow widths
import '@genoffice/ui/mobile.css'

installScreenTips()

function applyTheme(theme: UiTheme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

void (async () => {
  // through the host facade: a browser or WebView host has no preload
  const [lang, theme] = await Promise.all([
    getHost().language().catch(() => 'zh' as const),
    getHost().theme().catch(() => 'system' as const),
  ])
  document.documentElement.lang = htmlLang(lang as Lang)
  document.documentElement.dir = htmlDir(lang)
  applyTheme(theme)
  getHost().onThemeChanged(applyTheme)
  await window.htmlApi
    ?.getAiPanelPrefs?.()
    .then(applyAiPanelPrefs)
    .catch(() => {})
  window.htmlApi?.onAiPanelPrefsChanged?.(applyAiPanelPrefs)
  // a present tab/window (opened by Present → New tab) renders only its owner's preview
  const params = new URLSearchParams(location.search)
  const present = params.has('present')
  createRoot(document.getElementById('root')!).render(
    <LocaleProvider initial={lang}>
      {present ? <PresentView title={params.get('title') ?? ''} /> : <App />}
    </LocaleProvider>,
  )
})()