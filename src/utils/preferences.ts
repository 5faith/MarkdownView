import type { Preferences } from '../types'
import { DEFAULT_PREFERENCES } from '../types'

const STORAGE_KEY = 'markdownview-preferences'
const OLD_KEY_FILETREE_WIDTH = 'markdownview-filetree-width'

export function loadPreferences(): Preferences {
  try {
    const oldWidth = localStorage.getItem(OLD_KEY_FILETREE_WIDTH)
    if (oldWidth !== null) {
      localStorage.removeItem(OLD_KEY_FILETREE_WIDTH)
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        ...DEFAULT_PREFERENCES,
        fileTreeWidth: oldWidth ? Number(oldWidth) : DEFAULT_PREFERENCES.fileTreeWidth,
      }
    }
    const parsed = JSON.parse(raw) as Partial<Preferences>
    const merged = {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      fileTreeWidth: oldWidth ? Number(oldWidth) : (parsed.fileTreeWidth ?? DEFAULT_PREFERENCES.fileTreeWidth),
    }
    // theme 和 contentTheme 保持一致：dark UI 配 dark 内容
    if (merged.theme === 'dark' && merged.contentTheme === 'light') {
      merged.contentTheme = 'dark'
    } else if (merged.theme === 'light' && merged.contentTheme === 'dark') {
      merged.contentTheme = 'light'
    }
    return merged
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
