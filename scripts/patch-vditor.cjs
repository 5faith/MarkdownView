const fs = require('fs')
const path = require('path')

const src = path.resolve(__dirname, '..', 'node_modules', 'vditor', 'dist')
const dest = path.resolve(__dirname, '..', 'public', 'vditor', 'dist')

if (!fs.existsSync(src)) {
  console.error('node_modules/vditor/dist not found, run "pnpm install" first')
  process.exit(1)
}

fs.rmSync(dest, { recursive: true, force: true })
fs.cpSync(src, dest, { recursive: true })

const patchFiles = ['index.js', 'index.min.js', 'method.js', 'method.min.js']

for (const file of patchFiles) {
  const filePath = path.join(dest, file)
  if (!fs.existsSync(filePath)) continue
  let content = fs.readFileSync(filePath, 'utf8')
  let replaced = content
  replaced = replaced.replace(/"https?:\/\/unpkg\.com\/vditor@[^"]*"\.concat\("[^"]*"\)/g, '"/vditor"')
  replaced = replaced.replace(/https?:\/\/unpkg\.com\/vditor[^'")\s\\]*/g, '/vditor')
  if (content !== replaced) {
    fs.writeFileSync(filePath, replaced)
    console.log(`Patched ${file}`)
  }
}

console.log('Vditor dist copied and patched to public/vditor/dist')
