import { computed } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'

export interface OutlineItem {
  level: number
  text: string
  slug: string
}

export function useOutline() {
  const store = useMarkdownStore()

  const outline = computed<OutlineItem[]>(() => {
    const lines = store.content.split('\n')
    const items: OutlineItem[] = []

    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        const level = match[1]!.length
        const text = match[2]!.trim()
        const slug = text
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fff]+/g, '-')
          .replace(/^-|-$/g, '')
        items.push({ level, text, slug })
      }
    }

    return items
  })

  return { outline }
}
