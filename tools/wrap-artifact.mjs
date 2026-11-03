// Turns dist/index.html into dist/artifact.html: the artifact host adds its own <html>/<head>/<body>,
// so we keep only the title, styles and the inlined game script.
import { readFileSync, writeFileSync } from 'node:fs'
const html = readFileSync('dist/index.html', 'utf8')
const pick = (re) => (html.match(re) || [''])[0]
const title = pick(/<title>[\s\S]*?<\/title>/)
const font = pick(/<link rel="stylesheet"[^>]*>/)
const style = pick(/<style>[\s\S]*?<\/style>/)
const script = pick(/<script type="module"[^>]*>[\s\S]*<\/script>/)
const out = `${title}\n${font}\n${style}\n<div id="game"></div>\n${script}\n`
writeFileSync('dist/artifact.html', out)
console.log('artifact.html', (out.length / 1024).toFixed(0) + ' KB')
