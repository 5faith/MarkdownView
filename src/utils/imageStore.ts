import { basename, dirname, joinPath, sanitizeImageDir, encodeMdPath } from './localImage'

const EXT_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'image/avif': '.avif',
}

/**
 * 把剪贴板/上传的图片写到 md 同级的图片目录，返回写入 markdown 的相对 src
 * （如 assets/screenshot.png）。文件无落盘位置（未保存的新文件）由调用方兜底。
 */
export async function saveImageFile(
  file: File,
  mdPath: string,
  imageDirPref: string,
): Promise<string> {
  const { mkdir, writeFile, exists } = await import('@tauri-apps/plugin-fs')
  const dirName = sanitizeImageDir(imageDirPref)
  const dir = joinPath(dirname(mdPath), dirName)
  await mkdir(dir, { recursive: true })

  const extByMime = file.type ? (EXT_BY_MIME[file.type] ?? '') : ''
  let stem = (file.name || '').trim()
  let ext = extByMime
  if (stem) {
    stem = basename(stem).replace(/[\\/:*?"<>|]/g, '_')
    const dot = stem.lastIndexOf('.')
    const nameExt = dot > 0 ? stem.slice(dot).toLowerCase() : ''
    ext = extByMime || nameExt || '.png'
    stem = dot > 0 ? stem.slice(0, dot) : stem
  } else {
    ext = extByMime || '.png'
    stem = `image-${Date.now()}`
  }

  let target = joinPath(dir, stem + ext)
  if (await exists(target)) {
    // 重名不覆盖：加时间戳另存
    target = joinPath(dir, `${stem}-${Date.now()}${ext}`)
  }
  await writeFile(target, new Uint8Array(await file.arrayBuffer()))

  // markdown 里写相对路径（正斜杠 + 转义），md 移动时图片随目录一起走
  return encodeMdPath(`${dirName}/${basename(target)}`)
}
