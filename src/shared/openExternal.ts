/** 用系统浏览器打开外部链接（Tauri 走 opener 插件；浏览器里调试退回新标签页） */
export async function openExternal(url: string): Promise<void> {
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
  } catch {
    window.open(url, '_blank', 'noopener')
  }
}

/** GitHub 表情短代码全表（emoji-cheat-sheet，数据来自 gemoji） */
export const EMOJI_SHEET_URL = 'https://github.com/ikatyang/emoji-cheat-sheet'
