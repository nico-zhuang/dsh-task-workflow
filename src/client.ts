/** DSH ModuleLoader browser entry: contributes a Workbench-adjacent task panel. */
import { mountWorkflow } from './view.js'
interface ReactRuntime {
  createElement(component: string | (() => unknown), props: Record<string, unknown> | null, ...children: unknown[]): unknown
  useRef<T>(value: T): { current: T }
  useEffect(effect: () => void | (() => void), dependencies: readonly unknown[]): void
}
interface PluginContext {
  effect(effect: () => () => void, name: string): void
  locale: {
    bind(namespace: string): (key: string) => string
    register(namespace: string, dictionaries: Record<string, Record<string, string>>): () => void
  }
  slots: {
    inject(name: string, register: () => unknown): void
    register(options: Record<string, unknown>, component: (props: { t?: (key: string) => string }) => unknown): unknown
  }
}
interface ModuleLoader {
  load(module: {
    id: string
    factory: (require: (name: string) => ReactRuntime) => { inject: string[]; apply(ctx: PluginContext): void }
  }): void
}
declare const window: Window & { __ModuleLoader__: ModuleLoader }
window.__ModuleLoader__.load({
  id: '@deepseek-ai/dsh-task-workflow',
  factory: (require) => {
    const React = require('react'); const h = React.createElement
    function Page({ t }: { t?: (key: string) => string }): unknown {
      const ref = React.useRef<HTMLElement | null>(null)
      const locale = t?.('locale') === 'zh' ? 'zh' : 'en'
      React.useEffect(() => {
        if (!ref.current) return
        return mountWorkflow(ref.current, {
          getItem: key => window.localStorage.getItem(key),
          setItem: (key, value) => window.localStorage.setItem(key, value),
        }, locale)
      }, [locale])
      return h('div', { ref })
    }
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register('taskWorkflow', { zh: { title: '任务工作流', locale: 'zh' }, en: { title: 'Task workflows', locale: 'en' } }), 'task-workflow: dictionaries')
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'dsh-task-workflow', locale: 'taskWorkflow' }, Page))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'dsh-task-workflow', locale: 'taskWorkflow', label: () => ctx.locale.bind('taskWorkflow')('title'), order: 2 }, () => h('span', { 'aria-hidden': true }, '◇')))
      },
    }
  },
})
