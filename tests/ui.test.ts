import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { mountWorkflow } from '../src/view.ts'
import { DRAFT_KEY } from '../src/model.ts'
const root = new URL('../', import.meta.url)
function setup(locale='zh',theme='light') {
  const dom=new JSDOM('<div id="app"></div>',{ url:'https://mock.invalid' })
  const container=dom.window.document.querySelector('#app') as HTMLElement
  const cleanup=mountWorkflow(container,dom.window.localStorage,locale,theme)
  const click=(id:string):void=>{ const b=container.querySelector<HTMLButtonElement>(`[data-action="${id}"]`);assert(b);assert(!b.disabled,`${id} disabled`);b.click() }
  const status=():string|undefined=>container.querySelector<HTMLElement>('[data-status]')?.dataset.status
  return { dom,container,click,status,cleanup }
}
test('actual editor sample save reopen execute pause resume confirmation output',()=>{
  const f=setup();f.click('sample');assert.equal(f.container.querySelectorAll('[data-node-id]').length,5);assert.equal(f.container.querySelectorAll('svg line').length,5)
  f.click('enable');f.click('save');assert(f.dom.window.localStorage.getItem(DRAFT_KEY));f.click('new');assert.equal(f.container.querySelectorAll('[data-node-id]').length,0);f.click('open');f.click('run');f.click('step');f.click('pause');assert.equal(f.status(),'paused');assert(f.container.querySelector<HTMLButtonElement>('[data-action=step]')?.disabled)
  f.click('save');f.cleanup();const cleanup=mountWorkflow(f.container,f.dom.window.localStorage,'zh');f.click('open');assert.equal(f.status(),'paused');f.click('resume');f.click('step');f.click('step');f.click('step');assert.equal(f.status(),'waiting');f.click('accept');f.click('step');assert.equal(f.status(),'completed');assert.match(f.container.querySelector('[data-result]')!.textContent!,/mock/);cleanup();f.dom.window.close()
})
for(const locale of ['zh','en']) for(const theme of ['light','dark']) test(`static DOM contract ${locale}/${theme}`,()=>{
  const f=setup(locale,theme);assert.equal(f.container.querySelector('main')?.dataset.theme,theme)
  assert.match(f.container.textContent!,/Workbench v0.2-dev/);assert.match(f.container.textContent!,/DSH plugin v0.1/);assert.match(f.container.textContent!,/executed=false/);assert.match(f.container.textContent!,/redacted=true/);assert(f.container.querySelector<HTMLButtonElement>('[data-action=real]')?.disabled)
  f.click('sample');const node=f.container.querySelector<HTMLButtonElement>('[data-node-id]')!;node.click()
  const field=f.container.querySelector<HTMLInputElement>('aside label input')!;field.value='很长的节点标题 Long task workflow title <script>unsafe</script>';f.click('update');assert.match(f.container.textContent!,/Long task workflow title/);assert.equal(f.container.querySelectorAll('script').length,0);assert(f.container.querySelector('input[aria-label]'));f.cleanup();f.dom.window.close()
})
test('UI creates and connects nodes, surfaces storage errors without losing canvas',()=>{
  const f=setup('en');f.click('add');let kind=f.container.querySelector<HTMLSelectElement>('.toolbar select')!;kind.value='output';f.click('add')
  const selects=f.container.querySelectorAll<HTMLSelectElement>('.toolbar select');selects[1].value='node-1';selects[3].value='node-2';f.click('connect');assert.equal(f.container.querySelectorAll('svg line').length,1)
  f.click('open');assert.match(f.container.querySelector('[role=status]')!.textContent!,/No saved draft/);assert.equal(f.container.querySelectorAll('[data-node-id]').length,2);f.cleanup();f.dom.window.close()
})
test('built client registers locale, panel, and disposes dictionary through ctx.effect',()=>{
  const source=readFileSync(new URL('lib/client.js',root),'utf8');const dom=new JSDOM('',{ runScripts:'outside-only' });let plugin:{ inject:string[];apply(ctx:unknown):void }|undefined;const registrations:{ name:string;key?:string;id?:string;label?:()=>string }[]=[];const dispose:(()=>void)[]=[];let dictionaries=0
  Object.assign(dom.window,{ __ModuleLoader__:{ load:({ id,factory }:{ id:string;factory:(require:()=>object)=>typeof plugin })=>{assert.equal(id,'@deepseek-ai/dsh-task-workflow');plugin=factory(()=>({ createElement:()=>null }))} } })
  dom.window.eval(source);assert(plugin);assert.deepEqual([...plugin.inject],['slots','locale'])
  plugin.apply({ effect:(effect:()=>()=>void)=>dispose.push(effect()),locale:{ register:()=>{dictionaries++;return()=>{dictionaries--}},bind:()=>()=> 'Task workflows' },slots:{ inject:(_name:string,fn:()=>void)=>fn(),register:(options:typeof registrations[number])=>{registrations.push(options);return()=>{registrations.splice(registrations.indexOf(options),1)}} } })
  assert.equal(dictionaries,1);assert(registrations.some(r=>r.name==='main'&&r.key==='dsh-task-workflow'));assert.equal(registrations.find(r=>r.id==='dsh-task-workflow')?.label?.(),'Task workflows');dispose.forEach(fn=>fn());assert.equal(dictionaries,0);dom.window.close()
})
test('built standalone HTML includes executable local UI with no network resources',()=>{
  for(const locale of ['zh','en']) {
    const text=readFileSync(new URL(`preview-${locale}.html`,root),'utf8');assert(!/src="https?:|fetch\(|WebSocket|EventSource|\.agents\./.test(text));assert.match(text,/mountWorkflow/);assert.match(text,/preview-theme/)
  }
})
