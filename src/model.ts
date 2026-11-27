/** Browser-local task graphs. This module never imports DSH execution services. */
export type NodeKind = 'input' | 'agent' | 'condition' | 'confirmation' | 'output'
export type RunStatus = 'idle' | 'running' | 'paused' | 'waiting' | 'completed' | 'failed'
export interface TaskNode { id: string; kind: NodeKind; label: string; value: string; x: number; y: number }
export interface TaskEdge { from: string; to: string; branch: 'next' | 'true' | 'false' }
export interface TaskGraph { name: string; nodes: TaskNode[]; edges: TaskEdge[] }
export interface MockRun {
  status: RunStatus
  cursor: string | null
  value: string
  steps: { nodeId: string; value: string }[]
  error: string | null
  pausedFrom: 'running' | 'waiting' | null
}
export interface WorkflowDraft { schemaVersion: 1; enabled: boolean; graph: TaskGraph; run: MockRun }
export interface DraftStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
/** A task adapter is deliberately separate from Bots, Sessions, Projects, and Subagents. */
export interface TaskRuntimeAdapter { readonly mode: 'mock'; invoke(value: string, instruction: string): string }
const adapter: TaskRuntimeAdapter = { mode: 'mock', invoke: (value, instruction) => `[mock] ${instruction}: ${value}` }
export const DRAFT_KEY = 'dsh.task-workflow.mock.v1'
export const nodeKinds: readonly NodeKind[] = ['input', 'agent', 'condition', 'confirmation', 'output']
/** New workflows start empty, with no scheduled work or business entity. */
export function createDraft(): WorkflowDraft {
  return { schemaVersion: 1, enabled: false, graph: { name: '', nodes: [], edges: [] }, run: idle() }
}
function idle(): MockRun { return { status: 'idle', cursor: null, value: '', steps: [], error: null, pausedFrom: null } }
function requireEditing(draft: WorkflowDraft): void {
  if (['running', 'paused', 'waiting'].includes(draft.run.status)) throw new Error('RUN_LOCKED')
}
/** Add a node only when no mock run is pending. Returns its stable draft-local id. */
export function addNode(draft: WorkflowDraft, kind: NodeKind, label: string): string {
  requireEditing(draft)
  const id = `node-${Math.max(0, ...draft.graph.nodes.map(n => Number(n.id.slice(5)) || 0)) + 1}`
  draft.graph.nodes.push({ id, kind, label, value: '', x: 40 + (draft.graph.nodes.length % 3) * 235, y: 40 + Math.floor(draft.graph.nodes.length / 3) * 150 })
  draft.run = idle()
  return id
}
/** Connect graph nodes; replacement of the same output port is explicit. */
export function connect(draft: WorkflowDraft, from: string, to: string, branch: TaskEdge['branch']): void {
  requireEditing(draft)
  const source = draft.graph.nodes.find(n => n.id === from)
  const target = draft.graph.nodes.find(n => n.id === to)
  if (!source || !target || from === to || target.kind === 'input' || source.kind === 'output') throw new Error('INVALID_EDGE')
  if ((source.kind === 'condition') !== (branch !== 'next')) throw new Error('INVALID_PORT')
  const edges = [...draft.graph.edges.filter(e => !(e.from === from && e.branch === branch)), { from, to, branch }]
  if (hasCycle(draft.graph.nodes, edges)) throw new Error('CYCLE')
  draft.graph.edges = edges
  draft.run = idle()
}
/** Edit local node properties and invalidate previous completed results. */
export function updateNode(draft: WorkflowDraft, id: string, changes: Pick<TaskNode, 'label' | 'value' | 'x' | 'y'>): void {
  requireEditing(draft)
  const node = draft.graph.nodes.find(n => n.id === id)
  if (!node || !Number.isFinite(changes.x) || !Number.isFinite(changes.y)) throw new Error('INVALID_GRAPH')
  Object.assign(node, changes)
  draft.run = idle()
}
/** Remove a node and its incident edges without touching other drafts. */
export function removeNode(draft: WorkflowDraft, id: string): void {
  requireEditing(draft)
  draft.graph.nodes = draft.graph.nodes.filter(n => n.id !== id)
  draft.graph.edges = draft.graph.edges.filter(e => e.from !== id && e.to !== id)
  draft.run = idle()
}
/** Remove one edge; pending runs are immutable. */
export function disconnect(draft: WorkflowDraft, edge: TaskEdge): void {
  requireEditing(draft)
  draft.graph.edges = draft.graph.edges.filter(e => e !== edge)
  draft.run = idle()
}
function hasCycle(nodes: TaskNode[], edges: TaskEdge[]): boolean {
  const visiting = new Set<string>(); const visited = new Set<string>()
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    for (const edge of edges.filter(e => e.from === id)) if (visit(edge.to)) return true
    visiting.delete(id); visited.add(id); return false
  }
  return nodes.some(n => visit(n.id))
}
/** Validate before execution; both condition outputs must be wired and every node reachable. */
export function validateGraph(graph: TaskGraph): void {
  const inputs = graph.nodes.filter(n => n.kind === 'input')
  if (!graph.name.trim() || inputs.length !== 1 || !graph.nodes.some(n => n.kind === 'output')) throw new Error('GRAPH_INCOMPLETE')
  const ids = new Set(graph.nodes.map(n => n.id))
  if (ids.size !== graph.nodes.length || graph.nodes.some(n => !nodeKinds.includes(n.kind))) throw new Error('INVALID_GRAPH')
  const ports = new Set<string>()
  for (const edge of graph.edges) {
    const source = graph.nodes.find(n => n.id === edge.from); const target = graph.nodes.find(n => n.id === edge.to)
    if (!source || !target || source.kind === 'output' || target.kind === 'input' || !['next', 'true', 'false'].includes(edge.branch) || ((source.kind === 'condition') !== (edge.branch !== 'next')) || ports.has(`${edge.from}:${edge.branch}`)) throw new Error('INVALID_EDGE')
    ports.add(`${edge.from}:${edge.branch}`)
  }
  if (hasCycle(graph.nodes, graph.edges)) throw new Error('CYCLE')
  for (const node of graph.nodes) {
    const branches = node.kind === 'output' ? [] : node.kind === 'condition' ? ['true', 'false'] : ['next']
    if (branches.some(branch => !graph.edges.some(e => e.from === node.id && e.branch === branch))) throw new Error('GRAPH_INCOMPLETE')
  }
  const seen = new Set<string>()
  const walk = (id: string): void => {
    if (seen.has(id)) return
    seen.add(id)
    graph.edges.filter(e => e.from === id).forEach(e => walk(e.to))
  }
  walk(inputs[0].id)
  if (seen.size !== ids.size) throw new Error('UNREACHABLE_NODE')
}
/** Disabling freezes a pending run; enabling never automatically resumes it. */
export function setEnabled(draft: WorkflowDraft, enabled: boolean): void {
  if (!enabled && ['running', 'waiting'].includes(draft.run.status)) pause(draft)
  draft.enabled = enabled
}
/** Start a new mock execution without creating a DSH Request, Run, Attempt, or Session. */
export function start(draft: WorkflowDraft): void {
  if (!draft.enabled) throw new Error('PLUGIN_DISABLED')
  requireEditing(draft); validateGraph(draft.graph)
  draft.run = { ...idle(), status: 'running', cursor: draft.graph.nodes.find(n => n.kind === 'input')!.id }
}
/** Pause without changing the cursor, graph, values, or approval state. */
export function pause(draft: WorkflowDraft): void {
  if (!['running', 'waiting'].includes(draft.run.status)) throw new Error('INVALID_STATE')
  draft.run.pausedFrom = draft.run.status as 'running' | 'waiting'; draft.run.status = 'paused'
}
/** Resume returns an approval wait to waiting, never silently approves it. */
export function resume(draft: WorkflowDraft): void {
  if (!draft.enabled) throw new Error('PLUGIN_DISABLED')
  if (draft.run.status !== 'paused' || !draft.run.pausedFrom) throw new Error('INVALID_STATE')
  draft.run.status = draft.run.pausedFrom; draft.run.pausedFrom = null
}
function advance(draft: WorkflowDraft, node: TaskNode, branch: TaskEdge['branch']): void {
  draft.run.steps.push({ nodeId: node.id, value: draft.run.value })
  if (node.kind === 'output') { draft.run.status = 'completed'; draft.run.cursor = null; return }
  const edge = draft.graph.edges.find(e => e.from === node.id && e.branch === branch)
  if (!edge) throw new Error('MISSING_EDGE')
  draft.run.cursor = edge.to
}
/** Execute exactly one mock node; approval nodes require a separate explicit simulated decision. */
export function step(draft: WorkflowDraft, runtime: TaskRuntimeAdapter = adapter): void {
  if (!draft.enabled) throw new Error('PLUGIN_DISABLED')
  if (draft.run.status !== 'running') throw new Error('INVALID_STATE')
  const node = draft.graph.nodes.find(n => n.id === draft.run.cursor)
  try {
    if (!node) throw new Error('MISSING_NODE')
    if (node.kind === 'confirmation') { draft.run.status = 'waiting'; return }
    if (node.kind === 'input') draft.run.value = node.value
    if (node.kind === 'agent') {
      if (runtime.mode !== 'mock') throw new Error('MOCK_ONLY')
      draft.run.value = runtime.invoke(draft.run.value, node.value)
    }
    advance(draft, node, node.kind === 'condition' ? (draft.run.value.includes(node.value) ? 'true' : 'false') : 'next')
  } catch (error) { draft.run.status = 'failed'; draft.run.error = error instanceof Error ? error.message : 'MOCK_FAILED' }
}
/** Simulated approval never crosses a Host or provider boundary. */
export function confirmMock(draft: WorkflowDraft, accepted: boolean): void {
  if (!draft.enabled || draft.run.status !== 'waiting') throw new Error('INVALID_STATE')
  const node = draft.graph.nodes.find(n => n.id === draft.run.cursor)
  if (!node || node.kind !== 'confirmation') throw new Error('MISSING_NODE')
  if (!accepted) { draft.run.status = 'failed'; draft.run.error = 'MOCK_REJECTED'; return }
  advance(draft, node, 'next'); draft.run.status = 'running'
}
/** Serialize a browser-local draft/checkpoint. No DSH persistence or filesystem access. */
export function saveDraft(storage: DraftStorage, draft: WorkflowDraft): void { storage.setItem(DRAFT_KEY, JSON.stringify(draft)) }
/** Parse imported browser data; invalid versions and fields fail visibly, never partially load. */
export function parseDraft(text: string): WorkflowDraft {
  if (text.length > 1000000) throw new Error('DRAFT_TOO_LARGE')
  const data: WorkflowDraft = JSON.parse(text)
  if (data?.schemaVersion !== 1 || typeof data.enabled !== 'boolean' || typeof data.graph?.name !== 'string' || !Array.isArray(data.graph.nodes) || !Array.isArray(data.graph.edges) || !data.run) throw new Error('INVALID_DRAFT')
  if (data.graph.nodes.length > 100 || data.graph.edges.length > 200) throw new Error('DRAFT_TOO_LARGE')
  for (const node of data.graph.nodes) if (typeof node.id !== 'string' || !nodeKinds.includes(node.kind) || typeof node.label !== 'string' || typeof node.value !== 'string' || !Number.isFinite(node.x) || !Number.isFinite(node.y)) throw new Error('INVALID_DRAFT')
  const ids = new Set(data.graph.nodes.map(n => n.id))
  if (ids.size !== data.graph.nodes.length) throw new Error('INVALID_DRAFT')
  for (const edge of data.graph.edges) if (!ids.has(edge.from) || !ids.has(edge.to) || !['next', 'true', 'false'].includes(edge.branch)) throw new Error('INVALID_DRAFT')
  const run = data.run
  if (!['idle', 'running', 'paused', 'waiting', 'completed', 'failed'].includes(run.status) || typeof run.value !== 'string' || !Array.isArray(run.steps) || ![null, 'running', 'waiting'].includes(run.pausedFrom) || (run.error !== null && typeof run.error !== 'string') || (run.cursor !== null && !ids.has(run.cursor))) throw new Error('INVALID_DRAFT')
  for (const entry of run.steps) if (!entry || !ids.has(entry.nodeId) || typeof entry.value !== 'string') throw new Error('INVALID_DRAFT')
  if ((run.status === 'paused') !== (run.pausedFrom !== null)) throw new Error('INVALID_DRAFT')
  if (['running', 'waiting', 'paused'].includes(run.status)) { validateGraph(data.graph); if (!run.cursor) throw new Error('INVALID_DRAFT') }
  return data
}
/** Reopen only this plugin's namespaced browser-local checkpoint. */
export function reopen(storage: DraftStorage): WorkflowDraft {
  const text = storage.getItem(DRAFT_KEY)
  if (text === null) throw new Error('NO_SAVED_DRAFT')
  return parseDraft(text)
}
