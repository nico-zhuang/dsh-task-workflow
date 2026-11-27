import test from 'node:test'
import assert from 'node:assert/strict'
import { addNode, connect, createDraft, saveDraft, reopen, start, step, pause, resume, setEnabled, confirmMock, parseDraft, validateGraph } from '../src/model.ts'
function graph() {
  const d=createDraft(); d.graph.name='Test task'
  const a=addNode(d,'input','Input'), b=addNode(d,'agent','Mock'), c=addNode(d,'condition','Contains'), f=addNode(d,'confirmation','Review'), z=addNode(d,'output','Output')
  d.graph.nodes[0].value='yes';d.graph.nodes[1].value='Mock';d.graph.nodes[2].value='yes'
  connect(d,a,b,'next');connect(d,b,c,'next');connect(d,c,f,'true');connect(d,c,z,'false');connect(d,f,z,'next');setEnabled(d,true)
  return d
}
function memory() {
  const values=new Map<string,string>()
  return { getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)} }
}
test('create connect save reopen mock branch confirmation output closed loop',()=>{
  const d=graph(),storage=memory();saveDraft(storage,d);const reopened=reopen(storage);assert.deepEqual(reopened,d)
  start(reopened);for(let i=0;i<4;i++)step(reopened);assert.equal(reopened.run.status,'waiting');confirmMock(reopened,true);step(reopened)
  assert.equal(reopened.run.status,'completed');assert.match(reopened.run.value,/\[mock\]/);assert.equal(reopened.run.steps.length,5)
})
test('false condition skips simulated human confirmation',()=>{const d=graph();d.graph.nodes[2].value='absent';start(d);for(let i=0;i<4;i++)step(d);assert.equal(d.run.status,'completed');assert.equal(d.run.steps.length,4)})
test('disable freezes state, re-enable requires explicit resume, checkpoint preserves pending approval',()=>{
  const d=graph();start(d);step(d);const cursor=d.run.cursor;setEnabled(d,false);assert.equal(d.run.status,'paused');assert.equal(d.run.cursor,cursor);assert.throws(()=>step(d));setEnabled(d,true);assert.equal(d.run.status,'paused');resume(d)
  step(d);step(d);step(d);assert.equal(d.run.status,'waiting');pause(d);const storage=memory();saveDraft(storage,d);const r=reopen(storage);resume(r);assert.equal(r.run.status,'waiting');assert.deepEqual(r.graph,d.graph)
})
test('confirmation refusal fails without executing output',()=>{const d=graph();start(d);for(let i=0;i<4;i++)step(d);confirmMock(d,false);assert.equal(d.run.status,'failed');assert.equal(d.run.error,'MOCK_REJECTED')})
test('invalid graph, disconnected node, duplicate input, and cycles reject',()=>{
  const d=graph();assert.throws(()=>connect(d,'node-3','node-2','true'),/CYCLE/);assert.throws(()=>connect(d,'node-1','node-2','true'),/INVALID_PORT/)
  addNode(d,'output','Orphan');assert.throws(()=>validateGraph(d.graph),/UNREACHABLE_NODE/);const empty=createDraft();assert.throws(()=>start(empty),/PLUGIN_DISABLED/)
})
test('editing a pending run is denied and paused step does not advance',()=>{const d=graph();start(d);pause(d);const before=JSON.stringify(d);assert.throws(()=>addNode(d,'output','No'));assert.throws(()=>step(d));assert.equal(JSON.stringify(d),before)})
test('draft parse rejects untrusted and corrupt versions, positions, cursor, and edges',()=>{
  for(const value of ['{}','null','bad',JSON.stringify({ ...createDraft(),schemaVersion:2 })])assert.throws(()=>parseDraft(value))
  const d=graph();d.graph.nodes[0].x=NaN;assert.throws(()=>parseDraft(JSON.stringify(d)))
  const e=graph();start(e);e.run.cursor='missing';assert.throws(()=>parseDraft(JSON.stringify(e)))
})
test('storage failures propagate, missing draft does not manufacture state',()=>{const d=graph();assert.throws(()=>saveDraft({ getItem:()=>null,setItem:()=>{throw Error('Quota exceeded')} },d),/Quota/);assert.throws(()=>reopen(memory()),/NO_SAVED_DRAFT/)})
test('adapter failure is retained as failed result; adapter is never called while disabled',()=>{
  const d=graph();let calls=0;const adapter={ mode:'mock' as const,invoke:()=>{calls++;throw Error('MOCK_FAILED')} };setEnabled(d,false);assert.throws(()=>step(d,adapter));assert.equal(calls,0);setEnabled(d,true);start(d);step(d,adapter);step(d,adapter);assert.equal(calls,1);assert.equal(d.run.status,'failed')
})

test('editing after completion invalidates old mock output, invalid persisted pause does not load', async()=>{
  const { updateNode, removeNode, disconnect }=await import('../src/model.ts')
  const d=graph();d.graph.nodes[2].value='absent';start(d);for(let i=0;i<4;i++)step(d)
  assert.equal(d.run.status,'completed');updateNode(d,d.graph.nodes[0].id,{ label:'New task input',value:'new',x:40,y:40 })
  assert.equal(d.run.status,'idle');assert.equal(d.run.steps.length,0)
  disconnect(d,d.graph.edges[0]);assert.throws(()=>validateGraph(d.graph));removeNode(d,d.graph.nodes[0].id);assert(!d.graph.edges.some(e=>e.from==='node-1'))
  const r=graph();r.run.status='paused';assert.throws(()=>parseDraft(JSON.stringify(r)),/INVALID_DRAFT/)
})
