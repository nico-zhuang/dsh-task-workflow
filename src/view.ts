/** Task workflow canvas shared by the isolated HTML and the Workbench browser plugin. */
import { createDraft, addNode, connect, updateNode, removeNode, disconnect, saveDraft, reopen, start, step, pause, resume, confirmMock, setEnabled, nodeKinds, type NodeKind, type WorkflowDraft, type DraftStorage } from './model.js'
const dictionaries = {
  zh: { title: '任务工作流', note: 'Workbench v0.2-dev · DSH plugin v0.1 · Mock / 本地草稿', safety: '仅任务工作流；不连接 Bot、Session、Provider 或 Agent。保存仅写此浏览器草稿。', enable: '启用插件', disable: '停用插件', fresh: '创建工作流', name: '工作流名称', save: '保存草稿', open: '重新打开', add: '添加节点', input: '输入', agent: 'Agent / 模型占位', condition: '条件（包含文本）', confirmation: '人工确认', output: '输出', connect: '连线', from: '源节点', to: '目标节点', next: '下一步', true: '成立', false: '不成立', run: 'Mock 执行', step: '执行下一节点', pause: '暂停', resume: '恢复', accept: '模拟同意', reject: '模拟拒绝', idle: '未运行', running: '运行中', paused: '已暂停', waiting: '等待人工确认', completed: '已完成', failed: '失败', empty: '画布为空：添加输入节点开始，或载入示例', sample: '载入示例', node: '节点', label: '名称', value: '输入值 / 模拟指令 / 条件文本', position: '位置 X / Y', update: '更新节点', remove: '移除节点', disconnect: '断开连线', result: '运行结果', local: '本地保存成功', enabled: '插件已启用', disabled: '插件已停用', receipt: 'Preview receipt：wouldWrite=true · executed=false · redacted=true', preview: '任务草稿与模拟运行；真实操作不可用', real: '真实执行（不可用）', error: '操作未完成，数据已保留', errors: { RUN_LOCKED: '运行期间请先完成模拟；可随时保存当前状态', INVALID_EDGE: '请选择两个有效且不同的节点', INVALID_PORT: '条件节点需选择成立或不成立，其余节点选择下一步', CYCLE: '不支持循环连线', GRAPH_INCOMPLETE: '填写名称并连接一个输入、输出及各节点出口', UNREACHABLE_NODE: '有节点无法从输入到达', PLUGIN_DISABLED: '先启用插件', INVALID_STATE: '当前状态不能执行该操作', NO_SAVED_DRAFT: '尚无已保存草稿', INVALID_DRAFT: '草稿格式无效', MOCK_REJECTED: '模拟人工确认已拒绝', MISSING_EDGE: '节点缺少出口', MOCK_FAILED: '模拟执行失败' } },
  en: { title: 'Task workflows', note: 'Workbench v0.2-dev · DSH plugin v0.1 · Mock / local draft', safety: 'Task workflows only; no Bot, Session, Provider or Agent connection. Save writes only this browser draft.', enable: 'Enable plugin', disable: 'Disable plugin', fresh: 'Create workflow', name: 'Workflow name', save: 'Save draft', open: 'Reopen', add: 'Add node', input: 'Input', agent: 'Agent / model placeholder', condition: 'Condition (contains text)', confirmation: 'Human confirmation', output: 'Output', connect: 'Connect', from: 'Source node', to: 'Target node', next: 'Next', true: 'True', false: 'False', run: 'Mock execute', step: 'Execute next node', pause: 'Pause', resume: 'Resume', accept: 'Simulate accept', reject: 'Simulate reject', idle: 'Not started', running: 'Running', paused: 'Paused', waiting: 'Waiting for confirmation', completed: 'Completed', failed: 'Failed', empty: 'Empty canvas: add an input or load the example', sample: 'Load example', node: 'Node', label: 'Name', value: 'Input value / mock instruction / condition text', position: 'Position X / Y', update: 'Update node', remove: 'Remove node', disconnect: 'Disconnect', result: 'Run result', local: 'Local draft saved', enabled: 'Plugin enabled', disabled: 'Plugin disabled', receipt: 'Preview receipt: wouldWrite=true · executed=false · redacted=true', preview: 'Task draft and mock run; real actions unavailable', real: 'Real execution (unavailable)', error: 'Action failed; current data retained', errors: { RUN_LOCKED: 'Finish the pending mock run before editing; save is always available', INVALID_EDGE: 'Select two valid different nodes', INVALID_PORT: 'Use true/false for conditions and next for other nodes', CYCLE: 'Cycles are not supported', GRAPH_INCOMPLETE: 'Name the workflow and connect one input, output, and every output port', UNREACHABLE_NODE: 'A node is unreachable from the input', PLUGIN_DISABLED: 'Enable the plugin first', INVALID_STATE: 'Action is unavailable in this state', NO_SAVED_DRAFT: 'No saved draft', INVALID_DRAFT: 'Invalid draft format', MOCK_REJECTED: 'Simulated approval rejected', MISSING_EDGE: 'Missing node output', MOCK_FAILED: 'Mock execution failed' } },
}
export const workflowCss = `
.tw{font:13px/1.5 system-ui,sans-serif;color:var(--dsw-alias-text-primary,#202329);background:var(--dsw-alias-bg-layer-1,#fafafa);padding:24px;min-height:100%;box-sizing:border-box;letter-spacing:normal}.tw *{box-sizing:border-box}.tw h1{font-size:24px;font-weight:500;margin:0}.tw h2{font-size:16px;font-weight:500}.tw p{margin:8px 0}.tw header,.tw .toolbar,.tw .links{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.tw header{justify-content:space-between}.tw button,.tw input,.tw select{font:inherit;color:inherit;border:1px solid var(--dsw-alias-border-primary,#999);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#fff);padding:7px 10px;max-width:100%}.tw button{cursor:pointer}.tw button:disabled{cursor:default;opacity:.5}.tw :focus-visible{outline:2px solid #3678cf;outline-offset:2px}.tw .layout{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:16px}.tw .scroll{overflow:auto;min-width:0;border:1px solid var(--dsw-alias-border-primary,#aaa);border-radius:12px}.tw .canvas{position:relative;width:900px;min-height:560px;background:var(--dsw-alias-bg-layer-2,#fff)}.tw svg{position:absolute;inset:0;pointer-events:none}.tw line{stroke:var(--dsw-alias-text-primary,#333);stroke-width:2}.tw .node{position:absolute;width:200px;min-height:90px;text-align:left;overflow-wrap:anywhere;white-space:normal}.tw .node[aria-pressed=true]{outline:2px solid #3678cf}.tw .kind{display:block;font-size:12px}.tw .editor{min-width:0}.tw label{display:block;margin-bottom:10px}.tw label input,.tw label select{display:block;width:100%}.tw .status{padding:5px 10px;border:1px solid currentColor;border-radius:8px;overflow-wrap:anywhere}.tw .notice{min-height:30px;overflow-wrap:anywhere}.tw .receipt,.tw pre{white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%;margin:12px 0}.tw .edge{display:flex;gap:8px;align-items:center;margin:5px 0;overflow-wrap:anywhere}.tw .empty{padding:30px}.tw .run-list{padding-left:20px;overflow-wrap:anywhere}.tw .muted{color:var(--dsw-alias-text-secondary,#555)}
[data-ds-dark-theme] .tw,.tw[data-theme=dark]{color:var(--dsw-alias-text-primary,#ededed);background:var(--dsw-alias-bg-layer-1,#181a1f)}[data-ds-dark-theme] .tw .canvas,[data-ds-dark-theme] .tw button,[data-ds-dark-theme] .tw input,[data-ds-dark-theme] .tw select,.tw[data-theme=dark] .canvas,.tw[data-theme=dark] button,.tw[data-theme=dark] input,.tw[data-theme=dark] select{background:var(--dsw-alias-bg-layer-2,#24272e)}[data-ds-dark-theme] .tw .muted,.tw[data-theme=dark] .muted{color:var(--dsw-alias-text-secondary,#bfc4ce)}[data-ds-dark-theme] .tw line,.tw[data-theme=dark] line{stroke:var(--dsw-alias-text-primary,#ededed)}@media(max-width:760px){.tw{padding:12px}.tw .layout{grid-template-columns:minmax(0,1fr)}.tw .editor{order:-1}.tw h1{font-size:20px}}
`
/** Mount a self-contained local draft editor; returned cleanup removes all listeners. */
export function mountWorkflow(root: HTMLElement, storage: DraftStorage, locale = 'zh', theme = 'light'): () => void {
  const t = dictionaries[locale.startsWith('zh') ? 'zh' : 'en']
  let draft: WorkflowDraft = createDraft(); let selected = ''; let notice = ''; let disposed = false
  const doc = root.ownerDocument
  const initial = doc.createElement('style'); initial.textContent = workflowCss
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = ''): HTMLElementTagNameMap[K] { const e = doc.createElement(tag); e.textContent = text; return e }
  const busy = (): boolean => ['running', 'paused', 'waiting'].includes(draft.run.status)
  function errorText(code: string): string { return t.errors[code as keyof typeof t.errors] ?? code }
  function action(fn: () => void): void {
    try { notice = ''; fn() } catch (error) { notice = `${t.error}: ${errorText(error instanceof Error ? error.message : 'MOCK_FAILED')}` }
    render()
  }
  function button(text: string, fn: () => void, disabled = false, id = ''): HTMLButtonElement { const b = el('button', text); b.type = 'button'; b.disabled = disabled; b.dataset.action = id; b.addEventListener('click', () => action(fn)); return b }
  function label(text: string, input: HTMLElement): HTMLLabelElement { const l = el('label', text); l.append(input); return l }
  function input(value: string): HTMLInputElement { const e = el('input'); e.value = value; return e }
  function options(values: readonly string[], labels: (s: string) => string): HTMLSelectElement { const e = el('select'); for (const value of values) { const opt = el('option', labels(value)); opt.value = value; e.append(opt) }; return e }
  function sample(): void {
    if (busy()) throw new Error('RUN_LOCKED')
    draft = createDraft(); draft.graph.name = t.title
    const a = addNode(draft, 'input', t.input); const b = addNode(draft, 'agent', t.agent); const c = addNode(draft, 'condition', t.condition); const d = addNode(draft, 'confirmation', t.confirmation); const e = addNode(draft, 'output', t.output)
    draft.graph.nodes[0].value = 'sample'; draft.graph.nodes[1].value = 'mock'; draft.graph.nodes[2].value = 'sample'
    connect(draft, a, b, 'next'); connect(draft, b, c, 'next'); connect(draft, c, d, 'true'); connect(draft, c, e, 'false'); connect(draft, d, e, 'next'); selected = a
  }
  function render(): void {
    if (disposed) return
    const page = el('main'); page.className = 'tw'; page.dataset.theme = theme
    const header = el('header'); header.append(el('h1', t.title), el('span', draft.enabled ? t.enabled : t.disabled)); page.append(header, el('p', t.note), el('p', t.safety))
    const toolbar = el('div'); toolbar.className = 'toolbar'
    const name = input(draft.graph.name); name.disabled = busy(); name.setAttribute('aria-label', t.name); name.placeholder = t.name; name.oninput = () => { draft.graph.name = name.value }
    toolbar.append(name, button(t.fresh, () => { if (busy()) throw new Error('RUN_LOCKED'); draft = createDraft(); selected = '' }, busy(), 'new'), button(t.sample, sample, busy(), 'sample'), button(draft.enabled ? t.disable : t.enable, () => setEnabled(draft, !draft.enabled), false, 'enable'), button(t.save, () => { saveDraft(storage, draft); notice = t.local }, false, 'save'), button(t.open, () => { const loaded = reopen(storage); draft = loaded; selected = '' }, busy(), 'open'))
    page.append(toolbar)
    const controls = el('div'); controls.className = 'toolbar'
    const kind = options(nodeKinds, s => t[s as NodeKind]); kind.setAttribute('aria-label', t.add); kind.disabled = busy()
    controls.append(kind, button(t.add, () => { selected = addNode(draft, kind.value as NodeKind, t[kind.value as NodeKind]) }, busy(), 'add'))
    const ids = draft.graph.nodes.map(n => n.id); const text = (id: string): string => draft.graph.nodes.find(n => n.id === id)?.label ?? id
    const from = options(ids, text); from.setAttribute('aria-label', t.from)
    const to = options(ids, text); to.setAttribute('aria-label', t.to)
    const branch = options(['next','true','false'], s => t[s as 'next'|'true'|'false']); branch.setAttribute('aria-label', t.connect)
    controls.append(from, branch, to, button(t.connect, () => connect(draft, from.value, to.value, branch.value as 'next'|'true'|'false'), busy() || ids.length < 2, 'connect')); page.append(controls)
    const feedback = el('div', notice); feedback.className = 'notice'; feedback.setAttribute('role', 'status'); page.append(feedback)
    const layout = el('div'); layout.className = 'layout'
    const scroll = el('div'); scroll.className = 'scroll'; scroll.tabIndex = 0; scroll.setAttribute('aria-label',t.title)
    const canvas = el('div'); canvas.className = 'canvas'
    const canvasHeight = Math.max(560, ...draft.graph.nodes.map(n => n.y + 130))
    canvas.style.minHeight = `${canvasHeight}px`
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width','900'); svg.setAttribute('height',String(canvasHeight)); svg.setAttribute('aria-hidden','true')
    for (const edge of draft.graph.edges) {
      const a = draft.graph.nodes.find(n => n.id === edge.from)
      const b = draft.graph.nodes.find(n => n.id === edge.to)
      if (!a || !b) continue
      const line = doc.createElementNS('http://www.w3.org/2000/svg','line'); for (const [key,value] of Object.entries({ x1:a.x+100,y1:a.y+45,x2:b.x+100,y2:b.y+45 })) line.setAttribute(key,String(value)); svg.append(line)
    }
    canvas.append(svg)
    if (!ids.length) { const empty = el('p',t.empty); empty.className = 'empty'; canvas.append(empty) }
    for (const node of draft.graph.nodes) {
      const b = button(node.label, () => { selected = node.id }, false); b.className = 'node'; b.style.left = `${node.x}px`; b.style.top = `${node.y}px`; b.setAttribute('aria-pressed', String(node.id === selected)); b.dataset.nodeId = node.id
      const kind = el('span',t[node.kind]); kind.className = 'kind'; b.append(kind,el('span',node.id === draft.run.cursor ? t[draft.run.status] : node.value)); canvas.append(b)
    }
    scroll.append(canvas); layout.append(scroll)
    const editor = el('aside'); editor.className = 'editor'; editor.append(el('h2',t.node))
    const node = draft.graph.nodes.find(n => n.id === selected)
    if (node) {
      const name = input(node.label); const value = input(node.value); const x = input(String(node.x)); const y = input(String(node.y)); x.type = y.type = 'number'; x.min = y.min = '0'; x.max = '690'; y.max = '450'
      for (const i of [name,value,x,y]) i.disabled = busy()
      editor.append(label(t.label,name),label(t.value,value),label(`${t.position} X`,x),label(`${t.position} Y`,y),button(t.update, () => { updateNode(draft, node.id, { label: name.value, value: value.value, x: Math.max(0,Math.min(690,Number(x.value)||0)), y: Math.max(0,Math.min(450,Number(y.value)||0)) }) },busy(),'update'),button(t.remove, () => { removeNode(draft, selected); selected = '' },busy(),'remove'))
    }
    for (const edge of draft.graph.edges) { const row=el('div',`${text(edge.from)} → ${t[edge.branch]} → ${text(edge.to)}`); row.className='edge'; row.append(button(t.disconnect,()=>{disconnect(draft,edge)},busy())); editor.append(row) }
    layout.append(editor); page.append(layout)
    const runbar = el('div'); runbar.className = 'toolbar'
    const status = el('span',t[draft.run.status]); status.className='status'; status.dataset.status=draft.run.status
    runbar.append(status,button(t.run,()=>start(draft),!draft.enabled||busy(),'run'),button(t.step,()=>step(draft),!draft.enabled||draft.run.status!=='running','step'),button(t.pause,()=>pause(draft),!['running','waiting'].includes(draft.run.status),'pause'),button(t.resume,()=>resume(draft),!draft.enabled||draft.run.status!=='paused','resume'),button(t.accept,()=>confirmMock(draft,true),!draft.enabled||draft.run.status!=='waiting','accept'),button(t.reject,()=>confirmMock(draft,false),!draft.enabled||draft.run.status!=='waiting','reject'),button(t.real,()=>{},true,'real'))
    page.append(el('h2',t.result),runbar)
    if(draft.run.error) { const error=el('p',errorText(draft.run.error)); error.setAttribute('role','alert'); page.append(error) }
    const result=el('pre',draft.run.value); result.dataset.result='mock'; page.append(result)
    const steps=el('ol'); steps.className='run-list'; for(const entry of draft.run.steps) steps.append(el('li',`${text(entry.nodeId)}: ${entry.value}`)); page.append(steps)
    const receipt=el('p',t.receipt); receipt.className='receipt'; page.append(receipt,el('p',t.preview))
    root.replaceChildren(initial,page)
  }
  // Reopen is explicit: mounting never reads production data or silently starts pending work.
  render()
  return () => { disposed = true; root.replaceChildren() }
}
