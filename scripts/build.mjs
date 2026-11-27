/** Build only this browser-only local plugin and standalone fixture; never build or launch DSH. */
import { mkdir, writeFile, readFile, rename } from 'node:fs/promises'
import { resolve } from 'node:path'
import ts from 'typescript'
import { build } from 'tsdown'
const root = resolve(import.meta.dirname, '..')
await mkdir(`${root}/lib`, { recursive: true })
for (const name of ['model', 'view']) {
  const source = await readFile(`${root}/src/${name}.ts`, 'utf8')
  const esm = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
  await writeFile(`${root}/lib/${name}.mjs`, esm.replaceAll("'./model.js'", "'./model.mjs'"))
}
for (const name of ['client', 'preview']) {
  await build({ entry: { [name]: `${root}/src/${name}.ts` }, outDir: `${root}/lib`, format: 'iife', platform: 'browser', target: 'es2022', dts: false, clean: false, config: false })
  await rename(`${root}/lib/${name}.iife.js`, `${root}/lib/${name}.js`)
}
const preview = await readFile(`${root}/lib/preview.js`, 'utf8')
for (const locale of ['zh','en']) await writeFile(`${root}/preview-${locale}.html`, `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workbench · ${locale === 'zh' ? '任务工作流' : 'Task workflows'}</title><style>body{margin:0}#preview-tools{padding:8px;font:13px system-ui;display:flex;gap:8px;align-items:center}</style><body><div id="preview-tools"><span>Mock preview only</span><select id="preview-locale" aria-label="Language"><option value="zh"${locale==='zh'?' selected':''}>中文</option><option value="en"${locale==='en'?' selected':''}>English</option></select><select id="preview-theme" aria-label="Theme"><option value="light">Light / 浅色</option><option value="dark">Dark / 深色</option></select></div><div id="app"></div><script>${preview.replaceAll('</script', '<\\/script')}</script></body></html>\n`)
console.log('Built local task-workflow client and zh/en previews; no Host/provider execution.')
