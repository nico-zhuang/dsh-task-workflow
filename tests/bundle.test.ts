import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const yaml = require('js-yaml') as { load(text: string): unknown }
const root = new URL('../', import.meta.url)

test('installable bundle declares and includes its own plugin entry and client', () => {
  const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert(manifest.files.includes('cordis.patch.yml'))
  assert(manifest.files.includes('lib/client.js'))
  assert.equal(manifest.exports['./client'], './lib/client.js')
  const patch = yaml.load(readFileSync(new URL(manifest.dsh.bundle.patch, root), 'utf8'))
  assert.deepEqual(patch, [{ insert: [{ id: 'task-workflow', name: manifest.name }] }])
  assert.match(readFileSync(new URL(manifest.main, root), 'utf8'), /export function apply/)
})
