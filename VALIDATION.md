# Validation

Standalone extraction checked on 2026-11-27 using Node 24.16.0. The DSH integration target remains 0.2.2-rc.3; no prepared runtime was upgraded or launched.

- `npm install --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000 --registry=https://registry.npmjs.org`: passed after the initial unbounded attempt was stopped and an offline attempt reported ENOTCACHED.
- `npm run check`: build, source TypeScript check, lint and 19 fixture/DOM tests passed.
- No Electron, real Host, provider or Agent launched.
- Live DSH installation, actual panel rendering, outer lifecycle and uninstall/reinstall acceptance: pending.
- Compatibility inventory: DSH 0.2.2-rc.3, Cordis 4.1.0 and slots/locale source interfaces inspected. Manifest has no DSH engine restriction; local client types do not establish runtime compatibility. Runtime client resolution must still be checked in isolation.

Business safety: real_dsh_provider_request=false, real_write=false, production_data_untouched=true, created_entities=0, append_events=0, jsonl_writes=0, provider_agent_calls=0. Local development/build writes and public GitHub publication are authorized separately.
