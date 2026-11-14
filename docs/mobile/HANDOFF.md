# GenOffice 安卓移植：交接总览

> 这份文件写给刚醒来的人。它回答三个问题：现在能做什么、做过什么、卡在哪。
> 技术细节在 [decisions.md](./decisions.md)，这里有 4 条 ADR 和逐轮记录。
> 数据截止：66 个本地提交、147 个移动端 e2e、43 个 host 单测，全部通过。
> **尚未推送到远端**——按你的要求，等你确认后再推。

---

## 一句话现状

**六个应用都能在没有 Electron 的手机浏览器里启动；docs / markdown / html / sheets / slides 能打开、编辑、保存。**
sheets 的工作簿会话跑在 WebView 内的 wasm sidecar 上（与桌面同一个 Rust 引擎）；
slides 的 deck session 是纯 TS 移植（pptx-engine/pptx-ops/pptx-render）。
Android 宿主工程已建成并在 Android 15 模拟器上端到端验证（SAF 打开→编辑→保存→原地保存→回读）。
pdf 能打开查看，页面手术仍需桌面。

---

## 现在能做什么（实测，不是推断）

| 应用 | 打开 | 编辑 | 保存回文件 | 说明 |
|---|:---:|:---:|:---:|---|
| **docs** | ✅ | ✅ | ⚠️ | 安卓无 picker → 走下载；见下方说明 |
| **pdf** | ✅ | 部分 | ❌ | 能渲染；新用户可从空状态直接点「打开」；页面手术需桌面 |
| **markdown** | ✅ | ✅ | ⚠️ | 保存走下载（安卓无 picker） |
| **html** | ✅ | ✅ | ⚠️ | 同上 |
| **sheets** | ✅ | ✅ | ⚠️ | wasm sidecar 会话（与桌面同引擎）；安卓走 SAF 可原地保存 |
| **slides** | ✅ | ✅ | ⚠️ | deck session 纯 TS 移植；60+ 编辑方法；master/3D/ink/旁白未移植 |

---

### 关于「保存」：一个已修复的真缺陷

这份文档最初写「docs 保存 ✅，字节级往返验证过」。追查后发现**那句话把引擎能力和用户能力混在了一起**，而且掩盖了一个更严重的问题：

| 事实 | 状态 |
|---|---|
| 引擎在浏览器里能无损往返 | ✅ `mobile-roundtrip.spec.ts` 直接调 `parseDocx`/`saveDocx`，5 份文档 SHA-256 一致 |
| 用户能保存 | 原本 **完全不能**（安卓没有 `showSaveFilePicker`），现已修复 |

**根因**：`hasFilePicker()` 要求 `showOpenFilePicker` 和 `showSaveFilePicker` 同时存在——这两个是桌面 Chromium 的 File System Access API，安卓 Chrome 和安卓 WebView 都没有。所以用户在手机上编辑完，**没有任何方式把内容存下来**，而且代码库里没有下载降级。

**修复**：`files.ts` 的 `saveAnywhere()` 和 `openAnywhere()` 做双向兜底：

| 能力 | 有 API | 无 API（安卓） |
|---|---|---|
| 保存 | picker（可写 handle） | `<a download>` 浏览器下载 |
| 打开 | picker（可写 handle） | `<input type=file>` |

代价明确：无 picker 时返回的是**不可写 handle**，文件落在下载目录、名称由浏览器定，后续只能「另存为」而不是原地覆盖。但这比存不了强得多。

同一类问题还出现在 markdown 和 html 上（垫片把 `save` 误当成状态通知），一并修好了。
## 想自己看一眼

手机和电脑连同一个 Wi-Fi，跑一条命令：

```bash
npm run serve:mobile-checks
```

它会打印本机所有局域网地址，手机打开对应端口即可（IP 可能变，以命令输出为准）：

- **5390** — 输入法自检页：用你平时的输入法打「你好世界」，页面自己判定通过/失败，并显示软键盘高度、输入框有没有被键盘遮住
- **5391** — 真实的 GenOffice 编辑器（生产构建）

**建议先开 5391 打几个字。** 这是唯一还没验证过的关键项——中文输入法的真机行为，我在无头浏览器里测不出来。

---

## 一个必须知道的数字：首次加载 5.7–14.7 MB

生产构建的实际网络传输量：

| 应用 | 首次加载 | 3G 下等待 | 4G 弱 | WiFi |
|---|---|---|---|---|
| docs | 5.7 MB | 114 秒 | 23 秒 | 1 秒 |
| sheets | **14.7 MB** | **294 秒** | 59 秒 | 2 秒 |

桌面版把这些打进安装程序，用户装一次；**Web 版每次冷启动都要下载**。这是走 Web 路线的固有代价，不是可以做测试修掉的。

改进方向（都需要决定）：代码分割 sheets 的 11.39 MB 单块、移动端裁剪功能（与「不做阉割版」冲突）、或打包成 APK 让资源本地化。

## 卡在哪：剩下的事

### 1. A4 缩放的取舍（需要你定）

手机上文档按宽度适配到 43%。好处是五页文档一屏装得下、不会横向溢出；坏处是字小到看不清。
Word 手机版的选择是放大到可读字号、让用户滚动。**这是产品决策，我不该替你定。**

### 2. slides 的 v1 残留（不阻塞使用）

master view / 3D 模型 / ink / 旁白录制未移植（保持诚实拒绝）；
字体度量用 pptx-render 的启发式兜底（无系统字体枚举），canvas 测量 provider 是下一步；
崩溃恢复副本无持久化存储，writeWorkbookRecovery 诚实返回失败。

### 3. 首屏体积策略（APK 路线已就绪）

Web 路线首次加载 docs 5.7 MB / sheets 14.7 MB（3G 下 114s / 294s）。
**Android 宿主已把资源打进 APK**（assets 本地化，安装一次付清），这条路线不再等待决策。
纯浏览器部署仍面临下载成本：代码分割 sheets 单块是剩余选项。

### 已解决（原「卡在哪」各项）

- ~~Android SDK~~：已装 `E:\Android\Sdk`（platform 35 / build-tools 35.0.0），
  JDK 17 在 `E:\Android\jdk-17`，用户级 ANDROID_HOME/JAVA_HOME/PATH 已设。
- ~~宿主侧 workbook session~~：wasm 路线落地——xlsx-sidecar 编译到 wasm32-wasip1，
  在 WebView 内跑同一个 Rust 引擎；TS 会话层移植桌面语义（快照打开、守卫读取、
  完整保存 plan + 流式管线 + 保存后会话交换）。
- ~~宿主侧 deck session~~：纯 TS 移植落地——pptx-engine/pptx-ops/pptx-render 无 Node 依赖，
  快照 undo/redo、60+ op 垫片方法、autofit 后处理、手势事务、blob 媒体 URL。
- ~~Rust sidecar 交叉编译~~：被 wasm 路线取代，无需 NDK。
- ~~SAF 文件访问~~：原生钩子（open/saveAs/saveInPlace/read）返回可写句柄，
  保存可等待——「已保存」意味着真写入，不是「选择器还开着」。

---

## 做过什么：58 个提交，按主题

| 阶段 | 内容 |
|---|---|
| 让六应用脱离 Electron 启动 | host 契约、垫片、Node 全局 |
| 引擎可移植化 | docx / pptx / xlsx 去掉 Node 依赖 |
| 打开-编辑-保存闭环 | 真实文件、分块读取、pdf 渲染 |
| 文件契约统一 | 12 套路径 API → 一个 FileAccess |
| 失败语义 | 三分法：探针/动作/诊断；能力缺口清单 |
| 静默失败清理 | 写方法审计 86 处 → 0；确认替换不再丢弃 |
| 构建与性能 | 六应用生产构建；性能内存基线 |
| 真机可用性 | 局域网服务、输入法自检页 |
| 环境维度补测 | 深色模式、RTL、存储、弱网、设备内存、长会话、并发、IME 组合 |
| 桥接审计 | 启动期未应答调用 2–3 → 0 |
| **文件读写兜底** | **保存/打开双向降级，三个应用可完整读写** |
| 触摸与手势 | 原生对话框、长按、双指缩放配对 |

---

## 发现并修掉的真缺陷

这些不是补测试，是改了代码：

1. **存储不可用时六个应用全白屏**（最严重）
   手机隐私模式、存储满、受限 WebView 都会触发。一个偏好写入在渲染期抛异常，整个页面打不开。修法是入口处探测 + 内存降级。

2. **文档分档阈值按 Mac 实测搬到手机**
   只读档假设 2.2GB 工作集。手机上打开大文档会被系统杀进程，而不是降级。改成读设备堆、取 1/3 预算、并用桌面值夹住上限。

3. **86 处写方法静默吞掉**
   用户点"保存"没反应、也不报错。现在全部明确失败或明确成功。

4. **确认替换文档时静默丢弃未保存内容**
   `confirmDocumentReplace` 直接返回 `true`。现在没有平台确认框时明确拒绝。

5. **AI 面板卡在"思考中"**
   27 个 AI 能力返回 `undefined`，改成明确报错。

6. **安卓上完全无法保存文档**（与第 1 条同级严重）
   `showSaveFilePicker` 在安卓不存在且无降级，用户编辑完存不下来。修法是下载兜底。

7. **安卓上完全无法打开文件**
   与第 6 条同源（`showOpenFilePicker` 同样缺失），修法是 `<input type=file>`。

8. **markdown / html 的 save 被当成状态通知**
   垫片返回 `{ok:false}` 且无错误信息，用户点保存什么也不会发生。

9. **PDF 空状态没有任何可点的按钮**
   桌面版把「打开」放在系统菜单里，浏览器没这个菜单，新用户只能盯着屏幕。实测其余五个应用有 19–89 个按钮，PDF 是 0。桥接层早就有 `openPdf()`，只是界面没调用。

---

## 我判断错过的（记在这里，免得被当成既成事实）

- 说"PDF 应用会导航导致注入失败"——其实是我的轮询输给了 mount，应用一直是好的。**少测了一个应用 6 轮。**
- 说"sheets 能打开、能编辑、只是存不回"——打开根本不通。
- 说"Rust sidecar 可以绕过"——只对保存成立。
- 说"手机端滚动有问题"——其实 43% 缩放下根本没有可滚动区域。
- 说"docs 能完整打开-编辑-保存"——保存路径根本不通，见上方更正。
- 说"自动保存坏了"——实际是我的探测方式无效（桥接是 Proxy，属性不可写），应用一直是对的。

每次都由后续验证推翻，更正都写进了 `decisions.md`。

---

## 测试现状

```bash
npm run test:mobile          # 146 个 e2e，零手工准备
npx vitest run --root packages/host   # 37 个单测（含 wasm 会话往返）
npm run verify:mobile-builds # 六应用生产构建逐个验证
```

**全部通过。** 关键在于大部分断言都配了"守护测试"——故意让功能失效，确认断言真的会变红。一个永远绿的检查比没有检查更糟。

---

## 我在无头浏览器里验证不到的

这些不是"没查"，是查不了。工具已就绪，需要在真机上确认：

| 项目 | 为什么测不到 | 怎么验 |
|---|---|---|
| 软键盘几何 | 无头环境没有真实键盘 | 5390 自检页会显示键盘高度与是否遮挡输入框 |
| 具体输入法时序 | CDP 模拟的组合事件不等于厂商输入法 | 5390 页面用真实输入法打字 |
| 失焦后写入是否成功 | 无头环境驱动不了文件选择器 | 真机上编辑后切到其他应用，再回来查看 |
| WebView 长按是否触发右键 | 由宿主决定，不在渲染层 | 宿主需显式开启 `contextmenu` |

## 一句话结论

**六个应用都能在无 Electron 的移动宿主里启动；docs / markdown / html / sheets / slides 能完整读写；pdf 能打开和看；Android 宿主已建成并在模拟器上端到端验证（含 SAF 原地保存）。**

累计 66 个提交、147 个移动端 e2e + 43 个 host 单测，修掉 9+8 个真缺陷（含「用户根本用不了」级：存储不可用白屏、安卓无法保存/打开、sheets 无打开入口、WebView 宿主白屏/状态栏遮挡/确认闸门静默取消、保存假成功）。

## Android 宿主（apps/mobile）

```bash
# wasm 引擎（约 1 分钟，需 rustup target add wasm32-wasip1）
npm run native:build:wasm -w @genoffice/sheets
# 六应用生产构建 + wasm → APK assets
npm run build:mobile-assets
# APK（需 JDK 17 + Android SDK，本机已装 E:\Android）
gradle -p apps/mobile assembleDebug
adb install -r apps/mobile/app/build/outputs/apk/debug/app-debug.apk
```

已在 Android 15 模拟器验证：
- sheets：SAF 选文件 → wasm 打开 → 画布键入 → 保存（SAF 另存）→ 回读编辑值
- slides：启动空白稿 → 加文本框 → 编辑 → 保存（SAF）→ **二次保存原地写入（无选择器）**
- 宿主注入：Host 门面、sheets wasm URL、slides 会话开关、长按 contextmenu 合成、
  原生文件钩子（open/saveAs/saveInPlace/read，可写句柄、可等待）、原生确认框。
详见 apps/mobile/README.md。

## 建议的下一步

按投入产出排序：

1. **真机装 APK**（你的 PGEM10 已 adb 连接，说一声就装）→ 真机性能/IME/长按验证
2. **手机打开 5391 打几个字**（两分钟）→ 确认中文输入法真机行为（`npm run serve:mobile-checks`）
3. **定 A4 缩放**（你自己想清楚就行）→ 影响所有文档的默认观感
4. slides 字体精度（canvas 测量 provider）与 master view 移植
5. 纯浏览器部署的首屏代码分割（APK 路线已解此问题）
