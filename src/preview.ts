/** Standalone local preview using the same production editor; no HTTP server required. */
import { mountWorkflow } from './view.js'
const root = document.querySelector<HTMLElement>('#app')!
const locale = document.querySelector<HTMLSelectElement>('#preview-locale')!
const theme = document.querySelector<HTMLSelectElement>('#preview-theme')!
const storage = {
  getItem: (key: string): string | null => localStorage.getItem(key),
  setItem: (key: string, value: string): void => localStorage.setItem(key,value),
}
let dispose = mountWorkflow(root,storage,locale.value,theme.value)
const update = (): void => { dispose(); dispose = mountWorkflow(root,storage,locale.value,theme.value) }
locale.addEventListener('change', update); theme.addEventListener('change', update)
