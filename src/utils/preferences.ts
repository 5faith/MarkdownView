import type { Preferences } from '../types'
import { DEFAULT_PREFERENCES } from '../types'
import { sanitizeImageDir } from './localImage'

const STORAGE_KEY = 'markdownview-preferences'
const OLD_KEY_FILETREE_WIDTH = 'markdownview-filetree-width'

/** 旧版内置字体的偏好值迁移：maple / system 都归到系统默认 */
const LEGACY_FONT_VALUES: Record<string, string> = { maple: '', system: '' }

/** 手改 localStorage 或旧版本数据可能带非法值，读入时统一收敛 */
function normalize(prefs: Preferences): Preferences {
  const font = typeof prefs.font === 'string'
    ? (LEGACY_FONT_VALUES[prefs.font] ?? prefs.font)
    : DEFAULT_PREFERENCES.font
  const fontSize = Number.isFinite(prefs.fontSize)
    ? Math.min(20, Math.max(12, Math.round(prefs.fontSize)))
    : DEFAULT_PREFERENCES.fontSize
  const searchDebounceMs = Number.isFinite(prefs.searchDebounceMs)
    ? Math.min(2000, Math.max(0, Math.round(prefs.searchDebounceMs)))
    : DEFAULT_PREFERENCES.searchDebounceMs
  const searchIntervalMs = Number.isFinite(prefs.searchIntervalMs)
    ? Math.min(5000, Math.max(0, Math.round(prefs.searchIntervalMs)))
    : DEFAULT_PREFERENCES.searchIntervalMs
  const imageDir = typeof prefs.imageDir === 'string'
    ? sanitizeImageDir(prefs.imageDir)
    : DEFAULT_PREFERENCES.imageDir
  return { ...prefs, font, fontSize, searchDebounceMs, searchIntervalMs, imageDir }
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
