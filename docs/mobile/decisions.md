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
| CJK IME（合成事件） | ✅ 已通过 | e2e：4 场景 |
| 触屏交互 | ❌ 0 处触屏代码 | 全量 grep |
| CJK IME（真机输入法） | ❌ 未执行 | 需真机 |
| 键盘遮挡 | ❌ 未执行 | 需真机 |
| Android 宿主 | ❌ 未建（本机无 Android SDK） | — |
| 文件读写 SAF | ⚠️ 端口已定，实现未接 | — |
| Rust sidecar 移动版 | ⚠️ 已可绕过（走纯 TS 路径） | — |

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

## 怎么跑这些验收

```bash
# 1. 起渲染层（模拟移动宿主：无 preload）
cd apps/docs && npx vite --config vite.renderer.config.ts --host 127.0.0.1 --port 5199

# 2. 跑移动端验收
npm run test:mobile

# 3. 单测
npx vitest run --root packages/host-contract
npx vitest run --root packages/host
```

## 下一步（按依赖顺序）

1. 真机验证 IME 与键盘几何（阻塞项：没有通过就不该动触屏代码）；
2. `FileHost` 的 SAF 实现 —— 把 `saveDocx` 一族的签名从 path 改成 handle；
3. 触屏交互层（从 sheets 的拖选与 slides 的手柄开始，它们退化最严重）；
4. Android 宿主工程（需要本机装 Android SDK）。

### 关于 Rust sidecar：可以不交叉编译

原计划是给 `xlsx-sidecar` 做 `aarch64-linux-android` 交叉编译。现在**不必要了**：纯 TS 的 `xlsx-gateway` 路径已经在浏览器里跑通了完整的编辑-保存-回读闭环（见上文验证）。sidecar 只是大文件的流式优化路径，移动端先走纯 TS 路径即可，交叉编译可以推迟到确实遇到大文件性能瓶颈时再评估。

这降低了一个曾经被认为是「三个硬骨头之一」的风险：不是解决了它，而是绕过了它。

## 已知的文档冲突

`docs/platforms/chromeos.md:54` 写着「Android 不在计划内、架构无法翻译」。该结论已由 ADR 1 取代，需改写并指向本文档。
