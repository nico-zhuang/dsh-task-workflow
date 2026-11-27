# DSH 接手提示词

继续推进此仓库的 DSH 节点式任务工作流插件。先阅读 README、package.json、cordis.patch.yml、src/ 和 tests/，以实际代码为准，不要转向 DS-Bot，不处理 GitHub PR，不混入其他项目或旧诊断任务。

## 目标与当前状态

已有五类节点：输入、mock Agent/模型、条件分支、人工确认、输出；支持添加、连线、编辑、保存、重新打开、mock 单步执行、暂停/恢复与本地启用/停用。独立 HTML 预览和 bundle patch 已存在。真实 DSH 安装、面板加载与卸载恢复尚未验收。页面内 mock 开关不是 DSH 外层插件管理器开关，两者要分别测试。

集成目标为 DSH 0.2.2-rc.3 / Cordis 4.1.0。插件同名版本号不是兼容性证明，当前 manifest 只声明 Cordis peer，客户端接口仍为本地类型声明。先查实际 DSH release、Node、Cordis、ModuleLoader、slots、locale、sidebar 与 plugin manager 版本和接口；不要擅自升级 runtime，不混用 alpha/rc，不绕过兼容性检查。此前正式 runtime 未在顶层找到 dsh-client-ui-slots；需要检查其真实解析/客户端依赖发布方式，不能据此直接判定缺包或盲目安装。

## 已授权自动执行的流程

1. 在独立工作目录检出此仓库，记录 commit。只检查版本、依赖、manifest、入口、客户端注入与打包文件。使用仓库公开的正常依赖安装流程，设置有界超时；不要读取 .env、凭证或生产配置。
2. 安装开发依赖，运行 npm run check 和 npm pack --ignore-scripts。若安装脚本必须获准，先列出包名、脚本和理由等用户确认；不得盲目开启所有安装脚本。依赖失败、类型/fixture 失败、版本不匹配都属于问题，先停止后续安装并汇总。
3. 兼容性与静态测试通过后，按当前 DSH 官方 profile 初始化和插件安装流程创建全新隔离 profile。独立 DSH_HOME、profile、项目目录、user-data、日志与端口；不得复用生产 profile、旧 session corpus 或历史 Electron 目录。只在隔离 profile 安装本仓库生成的本地 tarball，不安装 registry 上的同名包。不得猜 profile schema、补认证文件或伪造 token。
4. 使用官方 dsh profile 启动路径，仅启动已明确归属的隔离实例。记录 PID/端口、启动与退出证据，设置有界超时；首个真实错误立即停止，不自动反复重启。需要认证时只能走已有安全注入方式；若不可用就报告阻断，不读取或输出凭证。
5. 自动测试外层 bundle 安装/选中、task-workflow 插件启用/停用、侧栏入口和主面板加载、中文/英文、浅色/深色、五类节点添加/连线/编辑、保存后重新打开、mock 分支/人工确认/输出、暂停/恢复。禁止任何真实模型调用。
6. 保存 mock 画布和等待确认检查点，外层停用并重新启用，再执行卸载/重装恢复测试。区分“卸载会保留浏览器本地草稿”和“自动恢复”；只恢复到原先隔离 origin，检查是否需显式 Reopen。不得清除生产浏览器存储。记录外层生命周期、面板移除、重复注册/泄漏、草稿是否保留、错误/空状态。卸载只作用于此次隔离 profile。

## 问题处理与优化门槛

发现任何问题（包括安装失败、接口不兼容、面板缺失、卸载未清理、状态丢失或权限/认证阻断），不要静默修复或升级。先输出问题清单：复现步骤、预期/实际、脱敏证据、严重度、最小修复方案、影响范围和待确认事项，等待用户确认后再改。

只有兼容性和隔离安装/生命周期测试均通过，才自动进入 mock 范围内的可逆优化：优先改进明确的画布可用性、错误/空状态、恢复提示和测试覆盖；每个小改动后运行相关测试。保持 TaskRuntimeAdapter 为 mock-only，不引入真实 Agent/Bot/Session/Project/Subagent 操作。不要自行扩大到拖拽库替换、架构重建或真实服务接入。不自动 commit/push；先交付可审查 diff 和结果。

## 安全与报告

不调用真实 Provider、Agent、Codex；不创建真实 Request/Run/Attempt/Session；不 append、不写业务 JSONL；不调用真实写 endpoint；不读/输出 token、bearer、cookie、authorization header、Keychain 或 descriptor secret；不触碰生产 Desktop/Host、profile、业务数据或其他进程。源码、构建、独立 profile 配置与浏览器 mock 草稿是本任务授权的本地开发写入，单独记录，不冒充零文件写入。

报告：仓库 commit、版本兼容表、隔离路径、tarball hash、命令/真实结果、安装/面板/外层启停/页面暂停恢复/卸载重装各自状态、首错、测试证据、优化 diff、未完成项、隔离进程清理结果。未实际验证的项目标为未验证。

始终保持业务安全字段：real_dsh_provider_request=false、real_write=false、production_data_untouched=true、created_entities=0、append_events=0、jsonl_writes=0、provider_agent_calls=0。real_write=false 指无真实业务写入，不包含已授权的隔离开发文件和 mock 草稿。
