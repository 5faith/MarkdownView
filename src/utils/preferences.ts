import type { AppFont, Preferences } from '../types'
import { DEFAULT_PREFERENCES } from '../types'

const STORAGE_KEY = 'markdownview-preferences'
const OLD_KEY_FILETREE_WIDTH = 'markdownview-filetree-width'
const FONTS: AppFont[] = ['maple', 'system', 'mono']

/** 手改 localStorage 或旧版本数据可能带非法值，读入时统一收敛 */
function normalize(prefs: Preferences): Preferences {
  const font = FONTS.includes(prefs.font) ? prefs.font : DEFAULT_PREFERENCES.font
  const fontSize = Number.isFinite(prefs.fontSize)
    ? Math.min(20, Math.max(12, Math.round(prefs.fontSize)))
    : DEFAULT_PREFERENCES.fontSize
  return { ...prefs, font, fontSize }
}

export function loadPreferences(): Preferences {
  try {
    const oldWidth = localStorage.getItem(OLD_KEY_FILETREE_WIDTH)
    if (oldWidth !== null) {
      localStorage.removeItem(OLD_KEY_FILETREE_WIDTH)
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return normalize({
        ...DEFAULT_PREFERENCES,
        fileTreeWidth: oldWidth ? Number(oldWidth) : DEFAULT_PREFERENCES.fileTreeWidth,
      })
    }
    const parsed = JSON.parse(raw) as Partial<Preferences>
    return normalize({
      ...DEFAULT_PREFERENCES,
      ...parsed,
      fileTreeWidth: oldWidth ? Number(oldWidth) : (parsed.fileTreeWidth ?? DEFAULT_PREFERENCES.fileTreeWidth),
    })
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // quota exceeded — silent
  }
}
