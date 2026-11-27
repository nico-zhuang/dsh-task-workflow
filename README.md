# Task workflow canvas (mock MVP)

Browser-only local plugin for the existing Workbench shell. It registers `main` / `sidebar.panellist` with panel id `dsh-task-workflow`, next to Workbench. It does not reuse or start the real `dsh-workflow` engine: that service orchestrates real model/subagent runs and is outside this preview's authority. A task graph is not a Bot, Session, Project, or Subagent. This standalone experimental repository was extracted from the Workbench task-workflow plugin. It is not an official DSH release or part of default product composition.

## Open now

Open `preview-zh.html` or `preview-en.html` directly in a browser. Both files embed the built editor, need no HTTP server or external resources, and offer language and theme selectors. Theme/language switching remounts the editor: save a draft first, then use Reopen. In DSH the page follows the injected locale and surrounding DSH theme tokens. Browser security policies may block localStorage on file URLs; save/reopen failures are visible and retain the current canvas.

Use **Load example → Enable plugin → Save draft → Create workflow → Reopen → Mock execute → Execute next node**. The example takes four steps to reach human confirmation; choose **Simulate accept**, then step to the output. Use **Pause**, **Save draft**, reopen, then **Resume** to recover the exact mock cursor. The execution is intentionally step-driven; no background scheduler runs while the page is closed.

## Local build and installation

From this repository root (Node 24.9 or later):

```sh
npm install --ignore-scripts
npm run check
npm pack --ignore-scripts --pack-destination /tmp
```


The tarball includes a bundle patch, the no-op Host entry and the self-contained `./client` ModuleLoader artifact. In a separately authorized disposable DSH profile, use the existing Plugins local-package installation flow with that tarball; installation selects the bundle by default. The bundle patch inserts the `task-workflow` plugin row, and the `dsh.client` manifest declares `lib/client.js`. Bundle selection and individual plugin toggles are managed by DSH; without HMR changes may require a restart. No provider, Agent, credential or real workflow service is injected. Actual DSH install/enable has not been exercised because this task prohibits starting Host. The artifact and manifest are verified with local packing and an isolated ModuleLoader registration fixture; this is not live Desktop acceptance.

The page's **Enable/Disable plugin** is a browser-local mock admission switch, distinct from the outer DSH plugin manager's load/unload toggle. Disabling freezes running/waiting work to paused. Re-enabling never resumes it implicitly; **Resume** restores the previous running/waiting state, retaining pending human confirmation. Save before unloading the plugin; explicit Reopen restores the saved graph, enable setting, cursor, values and step history. Edits/new workflows are blocked during pending runs. After a terminal run, editing invalidates its old result.

## Node and run models

`src/model.ts` owns schema version 1, graph validation and lifecycle. Nodes have draft-local `id`, `kind`, `label`, `value`, `x`, `y`. Supported kinds are input, agent/model placeholder, condition, human confirmation and output. Edges connect node ids through `next` or condition `true`/`false` ports. Cycles, unreachable nodes, duplicate inputs, invalid ports and missing exits are rejected before execution. Conditions test whether the current text contains the configured literal; no user code is evaluated. Nodes are positioned through editable X/Y fields; pointer dragging is not implemented.

Mock run states are idle, running, paused, waiting, completed and failed. One explicit step executes one node. Human confirmation waits until a simulated decision. The `TaskRuntimeAdapter` is a narrow mock task seam; future Bot orchestration would need a separate authorized adapter, not reinterpretation of draft ids as live DSH entity ids. No extension currently permits a real provider.

A single named browser-local draft/checkpoint uses `dsh.task-workflow.mock.v1`. Save is explicit and replaces only this key. No DSH filesystem, business JSONL, Session corpus or production profile is read or changed. Failed saves/reopens retain the current in-memory graph. The UI escapes labels via textContent, limits imported draft counts, and shows disabled/loading-free local states, validation errors, mock results and a preview receipt. Receipt `executed=false` describes real operations, not the local mock stepping.

## Verification

Fixtures exercise graph save/reopen, true/false branches, confirmation/rejection, disabled execution, pause/resume across saved checkpoints, invalid graphs, storage failures, adapter failures, DOM interaction, light/dark and zh/en markup, script-label escaping and the built ModuleLoader registration. The standalone preview has no network resource or execution-service call. DOM/static tests do not establish browser layout/contrast or a live Workbench installation.

## Model Experience

Model requests: zero. Model-visible tokens and KV-cache effects: none. Agent/model nodes only format deterministic `[mock]` text; they never invoke DSH agents or providers.

## Known Limitations and Deferred Work

Live DSH installation, plugin unload/remount integration, actual rendered browser review, official shared-component migration, multi-draft library, drag/zoom, parallel graph execution, automatic scheduling and real adapters remain unverified or deferred. No real Request/Run/Attempt/Session is created. Real execution controls remain disabled. Do not present the mock plugin as live workflow execution.

## Compatibility status

The current integration target is DSH `0.2.2-rc.3`, Cordis `4.1.0`, and the Web client ModuleLoader, slots and locale APIs. The manifest currently declares only the Cordis peer range; it does not enforce a DSH version. Client context interfaces are local declarations rather than an official generated SDK typecheck. Matching version labels alone do not establish compatibility. Actual isolated-profile installation, panel mounting, enable/disable and uninstall/reinstall recovery are pending. Do not install into a production profile based on these fixtures.

## Publication scope

This repository contains only the mock task-workflow plugin, local fixtures and built browser previews. It contains no original monorepo history, runtime payload, profiles, credentials or diagnostic logs. `real_dsh_provider_request=false`, `real_write=false` and `production_data_untouched=true` describe business operations; builds, fixture files and explicit browser-local draft saves are local development operations.

## Continue in DSH

Use [the Chinese handoff prompt](HANDOFF.zh-CN.md) for version checks, isolated installation and lifecycle acceptance before further mock-only improvements.

## Blocking identity gate

The handoff installation target is strictly `dsh-task-workflow@0.2.2-rc.3` from a local tarball. This repository currently declares `@deepseek-ai/dsh-task-workflow`, so that gate fails before installation. Do not treat the names as equivalent or omit the installer's expected-name check. Report the mismatch for user confirmation before changing identity or installing. See HANDOFF.zh-CN.md for client delivery and persistence gates.
