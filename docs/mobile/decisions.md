# GenOffice 移动端架构决策（ADR 集）

状态：已生效 · 最后更新 2026-11-14

背景：用户拍板走**完整编辑器**路线，目标平台**只有 Android**，桌面端与移动端**长期并行维护**，当前**单人 + AI**推进，不做阉割版。
本文档记录支撑这个路线的四项决策，以及已经落地/尚未落地的边界。

---

## ADR 1：抽公共内核 + 新建移动宿主，不改造现有渲染层

**决策**：不把 Electron 宿主"移植"成 Android，而是把渲染层当作一个纯 Web 应用复用到新的宿主里。

**依据（已验证）**：

| 事实 | 数据 | 验证方式 |
|---|---|---|
| 渲染层对 `node:` 内置模块的引用 | **0 处** | 全量 grep `apps/*/src/renderer` |
| 触屏事件代码 | 0 处（`touchstart`/`pointerType==='touch'`/`isMobile`） | 全量 grep |
| 鼠标事件 vs 指针事件 | `onMouseDown` 385 : `onPointerDown` 138 | 全量 grep |
| docs 渲染层能否脱离 Electron 启动 | **能**（2026-11-14 实测） | 无 preload 的 390×844 视口下完整渲染出 Ribbon、页面、状态栏 |

**后果**：移动端的工作量集中在「交互层重做 + 宿主 API 重实现」，而不是「解析引擎重写」。引擎侧 `docx-engine`、`pptx-engine` 是纯 TS，可原样复用。

---

## ADR 2：渲染层只认 `@genoffice/host`，路径一律换成 `FileHandle`

**决策**：新建 `packages/host-contract`（只有 interface，不 import Electron）与 `packages/host`（门面 + 各宿主实现）。渲染层禁止直接读 `window.desktop`。

**问题陈述**：当前桥是**九个全局变量、六份互不相同的契约**：

| 应用 | 契约文件 | 行数 | 全局名 |
|---|---|---|---|
| sheets | `shared/desktop-api.ts` | 3675 | `window.desktopApi` |
| slides | `shared/ipc.ts` | 1938 | `window.slidesApi` |
| pdf | `shared/ipc.ts` | 1272 | `window.pdfApi` |
| docs | `shared/ipc.ts` | 768 | `window.desktop` |
| markdown | `shared/ipc.ts` | 528 | `window.markdownApi` |
| html | `shared/ipc.ts` | 341 | `window.htmlApi` |

docs 的 `DesktopApi` 一个接口就有 **109 个方法**；渲染层里 `filePath`/`savedPath`/`absolute` 形态的参数出现 **407 处**。浏览器看不到路径，Android SAF 只给 `content://` URI 与 fd，所以路径语义是移动端最硬的一道墙。

**已落地**：
- `packages/host-contract`：能力位（`HostCapabilities`，13 项）、`FileHandle`、六个领域分组（file/dialog/settings/ai/print/cli）。7 个单测通过。
- `packages/host`：`getHost()` 三级解析（注入 → Electron preload → 浏览器）、浏览器宿主（File System Access API）、localStorage 设置存储、`installLegacyDesktopBridge()` 过渡垫片。10 个单测通过。
- docs 入口改用 `getHost()` 读语言/主题/作者，不再直接调 `window.desktop.getLanguage()`。

**待办**：剩下的 109 个方法按领域逐组搬。**过渡垫片是有意为之**——`installLegacyDesktopBridge()` 让旧调用点在浏览器里返回安全默认值而不是崩溃，这样移动宿主能先跑起来，再一组组收口。垫片里每一行都是迁移标记，搬完即删。

---

## ADR 3：文件写入走"句柄 + 整份字节"，不假设原子 rename

**决策**：`saveDocx(path, buf)` 这类签名一律改为 `saveDocx(handle, buf)`，`handle` 对宿主不透明。

**风险（已验证位置）**：`packages/xlsx-gateway` 的 `mkdtemp` + `rename` 原子写在 Android SAF 下没有等价能力——SAF 拿到的是流，没有 `rename`。

**降级策略**：
1. 首选 `DocumentsContract.renameDocument`；
2. 不支持时退化为"写临时文档 → 删旧 → 改名"，并在保存结果里标记 `atomic: false`；
3. 崩溃恢复依赖的 `writeRecoveryCopy` 必须比正式保存更早落盘，不能等保存成功。

---

## ADR 4：先证伪触屏与输入法，再谈 6 个月排期

**决策**：在投入移动宿主开发之前，先用可执行探针验证三件事。任何一件不通过，先停下来重新决策，而不是"边做边修"。

**已验证的事实**（2026-11-14，headless Edge，390×844，`isMobile:true`）：

- docs 渲染层在**没有 preload**的情况下能完整启动：标题 `未命名文档.docx`、Ribbon 全部页签、`第 1 页,共 1 页 / 0 个字 / 修订:关`、缩放 `43%` 都正常渲染。
- `window.desktop` 读属性即抛错，实测三处崩溃：`armContextMenu`、`onLanguageChanged`、`onViewImage`。已由 ADR 2 的垫片解决。
- **版面曾经是 660px 宽、塞进 390px 视口**（`innerWidth=660` 而 `visualViewport.width=390`），Ribbon 的「插入/绘图/设计/审阅/视图」被裁到屏幕外。**根因不是页面版式**，而是两层叠加：
  1. `.ribbon-tabs-win { padding-right: 150px }` —— 这是给 Electron 无边框窗口右上角系统按钮留的位置，浏览器/WebView 里根本没有这个按钮，纯浪费。已改为由 `getHost().kind === 'electron'` 决定是否加这个类。
  2. 页签行本身宽度固定、不可收缩，在 390px 屏上必然溢出。已在 `packages/ui/src/mobile.css` 里改为横向滚动（`@media (max-width: 720px)`），并给触屏设备（`@media (pointer: coarse)`）36px 最小点击高度。
- **修复后 `innerWidth / scrollWidth / visualViewport.width 三者都是 390**，无横向溢出。

**已通过的自动化验收**（`e2e/mobile-docs.spec.ts`，5 个用例全绿）：

| 用例 | 结果 |
|---|---|
| 无 preload 启动、零 pageerror | ✅ |
| 布局不超出视口（三项宽度均 390） | ✅ |
| IME composition 提交字符精确（拼音缓冲→选词上屏） | ✅ |
| 组合中途取消不留残字 | ✅ |
| 状态栏字数统计跟随（2 个 CJK 字符 → 「2 个字」） | ✅ |

**仍然是"待验证"的部分**（必须在真机执行，headless 模拟不能替代）：

1. **真实输入法多样性**：上述测的是 CDP 合成的 composition 事件，不是真实输入法。系统拼音与第三方输入法的 `compositionend` 时机差异只能在真机上验。
2. **键盘几何遮挡**：headless 没有软键盘，`visualViewport` 不会因键盘改变。
3. **手势首次成功率**：sheets 拖选、slides 手柄、markdown 拖拽柄，≥80%。

**判定为"不通过"的客观标准**：输入 `nihao` 选词后字符增量 ≠ 2；连续 20 词出现 ≥1 次乱序；光标落入键盘区概率 >0；切换输入法后字体重建失效。

---

### 触屏实测结论：专家的悲观预测没有成立

ADR 4 原本把「触屏交互」列为最可能推翻整个计划的风险，依据是仓库里 0 处触屏代码、385 处鼠标事件对 138 处指针事件。**实测结果相反**：

用 CDP 派发真实 touchStart/touchMove/touchEnd（不是合成 click）在 390x844 视口下验证：

| 交互 | 结果 |
|---|---|
| sheets 触摸单击 | 选区从 A1 移到 A4 |
| sheets 触摸拖选 | 得到区域 A6:B11 |
| sheets 触摸 tap + 键入中文 | 单元格正确显示「触摸77」 |
| docs 触摸放置光标 + 中文输入 | 光标落位，文字进文档 |
| slides 画布渲染 | 3 个 canvas、2 个 Konva 舞台 |

也就是说 **Univer 的触摸选区、拖选与键入本来就是工作的**，「拖选和滚动抢同一个手势」这个担心在 390px 下没有发生。

这条更正很重要：如果按原计划先花几周做触屏改造，改的是本来就能用的东西。

**这里还有一次自我纠错值得记下来**：第一次测「双击进编辑」时我断言它失败了（没有生成 textarea），并写进了状态表。后来用像素对比才发现，纯触摸 tap 选中 A1 后键入「触摸77」+ Enter，单元格里正确显示了中文。

误判的根因：**Univer 把单元格内容画在 canvas 上，`document.body.innerText` 永远读不到**。用文本断言去验证 canvas 渲染的界面，得到的必然是假失败。现在的 e2e 改成对单元格区域做截图比对，并用 DOM 里的名称框（`[data-u-comp="defined-name"] input`）确认选中状态。

教训有两层：一是 canvas 界面不能用文本断言；二是**「不可用」的结论必须用多种手段交叉验证**，否则会把探测方法的缺陷记成产品的缺陷。

## 当前状态一览

| 层 | 状态 | 验证方式 |
|---|---|---|
| 渲染层启动（无 Electron），六个应用 | ✅ 已跑通 | e2e：零 pageerror × 6 |
| 宿主抽象（contract + facade） | ✅ 已建 | 23 个单测通过 |
| 旧桥过渡垫片（8 个全局名） | ✅ 已生效 | e2e：无桥可启动 |
| 移动视口版式 | ✅ 已修（390 ↔ 390 × 6） | e2e：宽度断言 |
| docx 引擎可移植 | ✅ 字节级往返一致 | e2e：SHA-256 相等 |
| pptx 引擎可移植 | ✅ 语义往返一致 | e2e：页数/形状数相等 |
| xlsx 引擎可移植 | ✅ 编辑-保存-回读闭环 | e2e：A1 值回读成功 |
| pdf.js 渲染 | ✅ 真实输出可见文字 | e2e：暗像素计数 |
| 打开真实文档（File > Open） | ✅ 正文进入编辑器 | e2e：内容断言 |
| 编辑后保存 | ✅ 输出合法 ZIP 包 | e2e：魔数 + 字节数 |
| CJK IME（合成事件） | ✅ 已通过 | e2e：4 场景 |
| 触屏：sheets 点击/拖选 | ✅ 实测可用 | e2e：真实 touch 事件 |
| 触屏：docs 光标/输入 | ✅ 实测可用 | e2e：真实 touch 事件 |
| 触屏：slides 画布 | ✅ 已渲染 | e2e：Konva 舞台数 |
| 触屏：sheets tap + 键入 | ✅ 单元格正确显示中文 | e2e：单元格像素对比 |
| CJK IME（真机输入法） | ❌ 未执行 | 需真机 |
| 键盘遮挡 | ❌ 未执行 | 需真机 |
| Android 宿主 | ❌ 未建（本机无 Android SDK） | — |
| 文件访问契约（FileAccess） | ✅ 已定义 + 浏览器实现 | e2e：3 用例 + 4 单测 |
| 文件读写 SAF | ⚠️ 契约已定，Android 侧未接 | — |
| sheets 打开文件 | ❌ 缺宿主 workbook session（打开即失败） | 见 limitations.ts |
| sheets 保存回文件 | ❌ 同一缺口的下游 | 见 limitations.ts |
| Rust sidecar 移动版 | ❌ 打开工作簿仍然依赖它 | 见下方更正 |
| 文档字节传输 | ✅ blob URL（非 base64） | e2e：20MB → <200 字符 URL |
| handle 语义 | ✅ 末段为文件名 | 4 个单测 |
| 完整手机流程 | ✅ 触摸打开-编辑-保存 | e2e：组合流程 |

### 引擎可移植化：实际改了什么

三个引擎都声称「纯 TS」，但真正搬进 WebView 时各自卡在不同的地方。记录在此，避免下次重复踩。

**docx**：只依赖 `Buffer` 这一个全局。装了 `buffer` 包即解决。往返验证是**字节级**的——未修改的文档保存回来 SHA-256 完全相同。

**pptx**：卡在 `node:crypto`（`createHash`、`randomUUID`）和 `node:zlib`（`deflateSync`）。
- 哈希改 WebCrypto（`open` 本来就是 async，零成本）；
- UUID 改全局 `crypto.randomUUID`（Node 19+ 与所有浏览器都有）；
- `deflateSync` 只用来生成占位 PNG 的 IDAT 块，而 `solidPng` 是同步导出的。用 zlib **stored block**（不压缩的合法 deflate）重写，保持同步、零依赖，并用 `node:zlib` 解压双向验证过（7 字节和 200 KB 都通过）。
- 注意：pptx 是**重建**式保存，字节必然变化（32 KB → 45 KB），所以验证的是语义等价（5 页、每页形状数一致），不是字节相等。

**xlsx**：最难。它通过临时目录 + 原子 rename 落盘，这在 WebView 里根本不存在。
- 抽出 `FileSystemPort`，Node 实现保留原语义（真临时目录、原子 rename、fsync）；
- 内存实现（`fs-memory.ts`）用 Map 承载，`replaceFile` 诚实报告 `atomic: false`；
- Node 实现改为**动态导入**——静态导入会把 `node:fs` 拖进依赖图，使整个包在浏览器里无法导入，即使一行文件系统代码都不执行；
- `sha256` 改成同步纯 JS 实现（调用方在规划阶段行内比较哈希，改成异步会把整条规划链路 async 化）；
- JSZip 的 `nodebuffer` 全部换 `uint8array`（浏览器不支持前者，四处）。
- 验证到闭环：打开 blank.xlsx → 改 A1 → 保存 → 重新读出来得到 `genoffice-mobile`，`touchedEntries` 正好是 `['xl/worksheets/sheet1.xml']`。

### 性能基线（实测，非估算）

在 390×844 视口、生产构建下打开一份 313KB / 5 页的 .docx：

| 指标 | 值 | 说明 |
|---|---|---|
| 应用加载 | ~1.0s | 生产构建 |
| 首屏（文档出现） | ~3.5s | A4 分页成本 |
| 引擎解析 | 48ms | 不是瓶颈 |
| JS 堆峰值 | ~25MB | 平稳，无逐页累积 |

两个关键判断：

1. **不是内存问题**。堆稳定在 25MB，没有随页数增长。手机上打开大文档不会因内存崩溃——之前担心的那条不成立。
2. **开发模式的慢是假象**。同一操作在 dev 下要 8.6 秒，因为浏览器要逐个抓取几百个模块（每个约 300ms）；生产构建把这部分完全消除。**评估性能必须用构建产物**，否则会把开发服务器的开销误判成应用的性能问题。

已固化为 `e2e/mobile-perf.spec.ts`（自建构建、自起服务）：断言打开耗时在 30 秒内、堆峰值低于 300MB。阈值刻意宽松——目的是抓数量级劣化，不是压某个具体数字，手机只会比这台容器慢。
### 真机验证怎么跑（给用户的操作说明）

唯一还没验证的阻塞项是**真机上的中文输入法**。一条命令把两个页面开在局域网上：

```bash
npm run serve:mobile-checks        # 用上次的构建
npm run serve:mobile-checks -- --build   # 先重新构建
```

它会打印本机所有局域网地址，手机（同一 Wi-Fi）打开对应端口：

| 端口 | 页面 | 用途 |
|---|---|---|
| 5390 | 输入法自检 | 打字即判定通过/失败，并显示键盘高度与遮挡 |
| 5391 | 文档编辑器 | GenOffice 真实编辑器的生产构建 |

**输入法自检页**：用平时的输入法打「你好世界」（不复制粘贴），页面自己判定字符数、顺序、拼音转换，并单独报告软键盘高度和输入框是否被键盘遮住。四类故障（重复上屏/漏字/乱序/拼音未转换）都验证过能被识别。

**注意区分**：自检页验的是 WebView 的输入法行为，编辑器页验的是 GenOffice 本身。中文键入在编辑器里已用合成事件测过（`e2e/mobile-touch.spec.ts`）。若自检页通过而编辑器出问题，问题在编辑器层而非平台层。

开发服务器（5199-5205）只绑 `127.0.0.1`，手机访问不到——这是为什么另起这两个服务。
#### 为什么手机上「滚动」不是问题：文档被缩放到一屏内

我试着验证「手指滚动文档」这个操作，测了三轮都没成功——`.editor-scroll` 的 `scrollHeight` 恒等于 `clientHeight`。

原因不是手势被拦截，而是**默认缩放让内容永远不溢出**：A4 页宽按可用宽度适配（390px 屏上是 43%），一份五页文档整份压进了一屏。没有可滚动的区域，手势自然无可观察。

所以对当前设计而言，值得断言的不是「能不能滚」，而是：

- 文档**整份可达**（无需滚动即可看到），
- 页面**永不超出屏幕宽度**（横向溢出才是真缺陷），
- 手指拖动**不会把文档横向拖走**，也不报错。

已固化为 `e2e/mobile-reading.spec.ts`。这三条都是真缺陷时会失败的断言。

**注意**：43% 这个默认值本身是不是好的产品选择，是另一回事（见下方待定项）。但如果将来改成「放大到可读字号」，滚动就会出现——那时这份测试要跟着改，因为前提变了。
#### 深色模式：六个应用都通过，而且验证了检查本身会失败

此前所有测试都跑在默认（浅色）配色下。手机常跟随系统深色模式，而主题 token 前不久才改过（CLAUDE.md 里有专门的 CI 检查），深色路径一次都没走过。

实测（`colorScheme: 'dark'` 模拟）：六个应用的背景亮度都足够低、文字对比度合格、零页面错误。

更有意思的是**怎么确认这个检查有意义**：注入 `body { background: #fff }` 后亮度为 1.0，注入暗底暗字后对比度 1.09——两种缺陷都会让断言失败。这两条反向验证已固化为 `e2e/mobile-dark-mode-guard.spec.ts`。

这一步不是多余的。一个永远通过的检查比没有检查更糟：它会让人以为这块有人守着。


## 怎么跑这些验收

**一条命令，零手工准备**：

```bash
npm run test:mobile        # 58 个移动端 e2e
```

六个开发服务器由 Playwright 的 `webServer` 自动拉起（配置在 `e2e/playwright.mobile.config.ts`），测试结束自动关闭。以前这些服务要手工起，忘了一个就会在某个测试里报 `connection refused`，看起来像测试坏了而不是环境没准备好。

声称“请求消费方成功”的部分（`vite preview`、构建验证）自带启动逻辑，也不依赖外部进程。

```bash
# 单测
npx vitest run --root packages/host-contract
npx vitest run --root packages/host

# 生产构建能否运行（六个应用，逐个 build + preview）
npm run verify:mobile-builds

# 真机自检：把两个页面开在局域网上
npm run serve:mobile-checks
```

## 下一步（按依赖顺序）

1. **真机验证 IME 与软键盘几何** —— 唯一还没做的阻塞项，headless 测不出来；
2. FileHost 的 SAF 实现 —— FileHandle 与端口都已就位，缺的是 Android 侧的绑定；
3. ~~sheets 双击进编辑~~（已证伪：触摸 tap + 键入即可，原判断是探测方法错误）；
4. Android 宿主工程（需要本机装 Android SDK）；
5. ~~docs/platforms/chromeos.md:54 的结论改写~~（已完成）。

### 一个修正：sheets 目前还不能保存

前一轮我说「六个应用都能打开真实文件并编辑」，对 sheets 这句话只对一半。

它能打开 .xlsx、能改单元格（触摸 tap + 键入都验证过），但**写不回文件**：`saveWorkbookEdits` 需要主进程持有的 `sessionId`，主进程负责把 patch 应用到包上再落盘。浏览器/WebView 宿主没有这层 session，所以保存会失败。

这不是 bug，是**尚未实现的结构**。已把它连同其余五项一起写进 `packages/host/src/limitations.ts` 的 `BROWSER_HOST_LIMITATIONS`，每条都写明「用户不能做什么」和「需要什么才能做」。

#### 评估过并否决的方案：在渲染层直接给表格存盘

想过让 sheets 绕开主进程 session，在渲染层用 `xlsx-gateway` 直接算新包再写回。**实际评估后否决了**，原因是耦合比我预估的深：

1. `WorkbookFile` 这个类型本身就是 session 驱动的——单元格读、公式、查找、编辑全部以 `sessionId` 为索引去主进程取。`state.file` 里根本没有源字节，也没有 `fileHandle`。
2. 编辑日志（`staged.edits`）是应用自己的语言，不是网关的 `ChangePlan`；转换层要做，而且结构编辑（插删行列、工作表重排）、条件格式、数据验证、透视表都不在纯单元格变更的范围内。
3. 保存后还要重开会话（`openLazyWorkbook`）并恢复视图位置（`viewAtSave` 那一段），这套流程是为「主进程写完文件后重新加载」设计的。

硬做的话，得到一个只能保存纯单元格改动、丢掉格式和结构编辑的半成品——**比明确不支持更糟**，因为用户会以为保存成功了。

正确的做法是给移动宿主实现一个**对齐桌面语义的 workbook session**（宿主侧持有源字节、按 session 提供读与 patch 写），而不是在渲染层绕过它。这需要 Android 宿主一起设计，已归入 `BROWSER_HOST_LIMITATIONS` 的第一条。
同时改了垫片的失败语义：`splitPdf()`、`saveWorkbookEdits()` 这类**动作**，以前返回 `undefined` 让界面以为成功，现在明确 reject 并说明只在桌面版可用；而 `getRecentFiles()` 这类**探测**仍返回空值。把动作和探测混为一谈，会让用户以为自己完成了一个其实没发生的文件操作。
#### 观察到但未改的取舍：A4 页面在手机上的默认缩放

390px 视口下打开一份 A4 文档，应用给出 43% 缩放——页面宽度 341px 恰好填满可视区（实测可见率 1.0）。**这是正确的「适配宽度」，不是缺陷**。

代价是 A4 页面压到手机宽度后文字偏小。桌面 Word 手机版的做法是默认放大到可读字号，让用户横向滚动或双击缩放。要不要改成那样是**产品取舍**，取决于你更看重「一眼看全版式」还是「先看清楚字」。已记在这里，等你决定，我没有擅改。
### 一处需要下调的说法：sheets 在移动端打不开文件

之前我写「sheets 能打开、能改单元格，但存不回」。**前半句是错的。**

sheets 不自己读字节解析，它向主进程要 `selectWorkbook()`，拿回一个带 `sessionId` 的 `WorkbookFile`；后续的单元格读、公式、编辑、保存全部按这个 session 寻址。移动端宿主没有 session，所以**连打开这一步都过不去**——点「打开」按钮什么也不会发生，界面没有任何变化。

这个缺口在保存缺口**之前**。能力缺口清单已按「用户会先撞到哪个」排序：`selectWorkbook` 在前，`saveWorkbookEdits` 在后，两者其实由同一件工作解决（宿主侧 workbook session + FileAccess 保存路径）。

顺带把 `selectWorkbook` 加进了桌面专属动作清单：它以前返回 `undefined`，点按钮静默无反应；现在会明确报错说明需要桌面版。

### 评估过并暂缓：用渲染层映射兜住 sheets 的打开

想过在渲染层用 `xlsx-gateway` 的解析结果构造 `WorkbookFile`，让表格在没有主进程 session 时也能打开。**评估后暂缓**，原因是两套模型不对等：

| 侧 | 提供/需要的字段 |
|---|---|
| xlsx-gateway 的 `readBasicWorkbook` | 仅 `{ revision, sheets: [{ id, name, cells }] }` |
| 应用需要的 `WorkbookFile` | **26 个字段** |

缺的 20 多个不是可有可无的装饰：`styles`/`dxfStyles`（单元格样式与条件格式）、`themeColors`/`themeFonts`（主题配色与字体）、`date1904`/`shortDateFormat`（日期系统）、`workbookProtection`、`definedNames`、`visuals`、`sheets[].columnWidths`/`rowCount`……这些直接决定表格**显示成什么样**。

硬凑的后果不是打不开，而是**打得开但显示错误**——单元格没有格式、日期差 4 年、列宽全是一律默认值。这种错比打不开更难被发现，也更难被信任。

正确做法仍是宿主侧实现 `selectWorkbook()`：复用主进程已有的解析（那里已经有完整的 `WorkbookFile` 构造逻辑），而不是在渲染层重写一遍。这也是为什么它和 SAF 一起做更合理——两者都是"宿主替渲染层做它做不到的事"。
### 更正：「sidecar 可以绕过」只对保存成立，打开不行

前面写过「纯 TS 的 xlsx-gateway 路径已在浏览器跑通闭环，Rust sidecar 交叉编译不需要」。**这句话要收窄。**

重新查了主进程的打开路径 `openWorkbookSession()`：它第一件事就是 `client.open(snapshotPath, lang, shortDate)`，而 `XlsxSidecarClient` 就是那个 Rust 可执行文件。所以：

| 操作 | 是否依赖 sidecar |
|---|---|
| 渲染层内解析单元格（`readBasicWorkbook` / `applyPlanToXlsx`） | 否，纯 TS，已验证 |
| **应用真正打开工作簿（`selectWorkbook`）** | **是** |
| 渲染层内保存补丁 | 否，纯 TS，已验证 |

我把「xlsx-gateway 能在浏览器解析并写出」当成了「表格应用不需要 sidecar」，这是把**库的能力**当成了**应用的能力**。应用要的 `WorkbookFile` 那 26 个字段（样式、主题、日期系统、保护、定义名、可视化对象）是 sidecar 的 `open()` 一次吐出来的；网关的 `readBasicWorkbook` 只给 `{ revision, sheets: [{id,name,cells}] }`。

**影响**：Android 端要么交叉编译 sidecar（`aarch64-linux-android`），要么在宿主侧用纯 TS 重建那 26 个字段的提取逻辑。两条都不轻，之前划进「已排除」过于乐观。

## 已解决的文档冲突

`docs/platforms/chromeos.md` 原先写着「Android 不在计划内、架构无法翻译」。该结论已由 ADR 1 取代，页面已改写为「尚未发布，但移植正在进行中」并指向本文档。
