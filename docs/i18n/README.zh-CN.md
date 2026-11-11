<p align="center">
  <a href="https://genoffice.ai/">
    <picture>
      <source srcset="../assets/readme/hero-dark.webp" media="(prefers-color-scheme: dark)">
      <img src="../assets/readme/hero.webp" alt="GenOffice —— 开源 AI 办公套件：Docs、Sheets、Slides、PDF、Markdown 和 HTML，内置 AI 面板" width="100%">
    </picture>
  </a>
</p>

<h1 align="center">GenOffice</h1>

<p align="center"><b>全球首款功能完整的开源 AI 办公套件。</b><br>
Word、Excel、PowerPoint 和 PDF 文件，由你与你的 AI 共同编辑，并以原生格式保存。</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/361533652/genoffice" alt="许可证：Apache-2.0"></a>
  <a href="https://github.com/361533652/genoffice/releases/latest"><img src="https://img.shields.io/github/v/release/361533652/genoffice" alt="最新版本"></a>
  <a href="https://github.com/361533652/genoffice/releases"><img src="https://img.shields.io/github/downloads/361533652/genoffice/total" alt="下载量"></a>
  <a href="https://github.com/361533652/genoffice/stargazers"><img src="https://img.shields.io/github/stars/361533652/genoffice?style=flat" alt="GitHub Star 数"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <b>简体中文</b> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.tr.md">Türkçe</a></p>

<p align="center">
  <a href="#download"><b>下载</b></a> ·
  <a href="#skills"><b>Skills</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://genoffice.ai/"><b>官网</b></a> ·
  <a href="https://genoffice.ai/join"><b>社区</b></a> ·
  <a href="../../PRIVACY.md"><b>隐私</b></a>
</p>

GenOffice 是一款免费、开源的 Microsoft Office 替代品，支持 macOS、Windows
和 Linux。它可以直接打开并保存原生 `.docx`、`.xlsx` 和 `.pptx` 文件，编辑
PDF、Markdown 和 HTML，并在每份文档旁边配备一个 AI 智能体 —— 不是在侧边硬
塞一个聊天框，而是一个真正会读取文件、执行修改，并清楚展示改动之处的编辑器。
ODF 文件（`.odt`、`.ods`、`.odp` 以及 `.ott`/`.ots`/`.otp` 模板）会以可编辑的
OOXML 副本形式打开；这类导入是「仅打开」式的 —— 保存时写出的始终是 OOXML，
绝不会是 ODF。

- **原生格式，字节级保留。** 只有你编辑过的部分才会被重写，文件中的其他内容
  全部逐字节保留，文档在 Word、Excel 和 PowerPoint 中照常可用。
- **可审阅的 AI。** 修改以修订痕迹和差异对比的形式呈现，一键即可回滚。表格
  得到的是实时公式，而不是粘贴进来的数字；幻灯片和网页直接生成到画布上，
  仍然可以随意编辑。把 Docs 中的选区或 Sheets 中的单元格区域对模型隐藏，
  AI 就只能看到一个具名占位符；原文仍保留在文件中，随时可以恢复。隐藏只
  覆盖本应用内的 AI —— CLI、MCP 工具和无界面导出会直接读取文件，仍然
  能看到这些原文。
- **本地优先的设计。** 文件的打开、编辑、保存和转换都在你的电脑上完成。
  PDF → Word / Excel / PowerPoint、Markdown → Word、HTML → Word 全部在本机运行。
  只有 AI 调用会发送到你选择的服务商。
- **用自己的密钥，或者不用密钥。** 登录 Genspark 即可免配置使用；也可以自带
  Claude、OpenAI、Gemini、DeepSeek、Kimi、GLM、Qwen、Doubao、MiniMax、Grok、
  Mistral、OpenRouter、Requesty 的密钥，或任何 OpenAI 兼容端点，包括本地模型服务。
- **可脚本化，随时可供智能体调用。** 应用自带 `genoffice` 命令行和一份面向
  Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、OpenCode 和 Windsurf
  的 agent skill，让编程智能体无需打开任何窗口，就能在你的电脑上创建、转换、
  读取和编辑真正的 Office 文件。

**获取：** [macOS](https://github.com/361533652/genoffice/releases/latest)（Apple Silicon 和 Intel）·
[Windows](https://github.com/361533652/genoffice/releases/latest)（x64 和 Arm）·
[Linux](https://github.com/361533652/genoffice/releases/latest)（deb、rpm、AppImage）——
详情与系统要求见[下载](#download)。

## 为什么选择 GenOffice

- **开源**，Apache-2.0 协议，在 GitHub 上公开开发。
- **由你掌控。** macOS、Windows 和 Linux 原生应用；文件留在本地磁盘，每一次编辑、
  保存和转换都在你的机器上完成。
- **真正的 Office 文件。** 原生 `.docx`、`.xlsx` 和 `.pptx`，字节级保留：未改动
  的部分原样复制。
- **直接编辑文档的 AI。** Docs 中的修订痕迹、Sheets 中实时生效的公式和图表、直接
  在画布上生成的幻灯片，每一次 AI 操作都会留下可回滚的快照。
- **自带模型，自带密钥。** 使用 Genspark 登录，或带上 Claude、OpenAI、Gemini、
  DeepSeek 等的密钥，同样支持本地服务器和任意 OpenAI 兼容端点。
- **认真做好 PDF。** 在页面内直接编辑文字，本机将 PDF 转换为 Word、Excel 或
  PowerPoint，扫描件支持系统 OCR。
- **同样支持 Markdown 和 HTML**，共用同一个 AI 面板，并可本机导出为 Word。
- **Skills。** 内置的现成 skill，或你自己的 `SKILL.md`，在任意 AI 面板的 **+** 菜单里附带。
- **可脚本化。** `genoffice` 命令行、agent skill 和 MCP 服务器让每一个引擎都能
  为 Claude Code、Claude Desktop、Codex、Cursor 及其他智能体所用，且仍然在本机
  运行。
- **免费**，个人和团队皆可使用。

## 命令行与 agent skill

应用能对文件做的一切，`genoffice` 命令行都能在终端里完成：检查、转换、创建、
读取和编辑 Word、Excel、PowerPoint、PDF、Markdown 和 HTML，用的是同一套引擎，
无需界面。它随 GenOffice 一起安装，不需要自己的运行时，也绝不会把文档发送到
任何地方。配合内置的 **agent skill**，它能把编程智能体变成一名文档工作者，
产出真正的 Office 文件，而不是用 Markdown 勉强凑合。

**支持：** Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、OpenCode
和 Windsurf 开箱即用，任何其他能读取 skill 的智能体，以及通过
[MCP 服务器](#mcp-server) 支持的 Claude Desktop 和所有 MCP 客户端。

### 安装 skill

| 方式                                 | 效果                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 应用内的 **设置 → 集成**             | 列出在这台电脑上找到的智能体；一键即可把 skill 写入你选中的每一个。当 GenOffice 新版本附带更新的 skill 时，会出现**更新**按钮。 |
| 同一页面上的 **下载为 zip**          | claude.ai、Claude 桌面应用及其他助手可作为上传 skill 接受的目录结构。                                                           |
| `npx skills add 361533652/genoffice` | 从本仓库安装到任何兼容 skills 的智能体。                                                                                        |

然后开启一个新对话，让它帮你做一份文档。这份 skill 会教智能体何时该用
`genoffice`、编辑前如何先读取文件，以及如何检查自己的成果。

### 从终端快速上手

```bash
genoffice --version
genoffice info report.docx --json                  # headings and blocks; or sheets, slides, pages
genoffice convert report.md --to pdf               # md/html/docx/xlsx/pptx → pdf, pdf → docx/xlsx/pptx/md/html, odt/ods/odp → docx/xlsx/pptx, doc/dot → docx, …
genoffice create --type docx --from notes.md --out notes.docx
genoffice create --type xlsx --from table.json --out sales.xlsx   # "=SUM(B2:B9)" cells stay live formulas
genoffice docs read report.docx --range 0-9 --json # then `docs apply --ops edits.json` edits in place
genoffice docs compare original.docx revised.docx --out redline.docx   # the differences as tracked Word revisions
genoffice render report.docx --out shots/          # one PNG per page, to look at what you made
genoffice open sales.xlsx                          # hand the result to the editor
```

每条命令都会打印一行摘要，加上 `--json` 则输出单个 JSON 对象。编辑是原子性的：
被拒绝的操作不会改动文件，并会返回带有指引的错误信息。`genoffice help` 列出
当前的命令集合；完整参考见 [packages/cli/README.md](../../packages/cli/README.md)。

### 智能体实际执行了什么

上方演示中的太阳系演示文稿，在 Claude Code 里只用了一句提示词。在它背后，
智能体按照 skill 的分阶段工作流推进，而 CLI 在每个阶段开始下一步之前都会先做
检查：

```bash
genoffice capabilities --json                        # which cloud tools GenOffice has configured
genoffice guide slides design                        # the deck workflow and layout library
genoffice image "the eight planets in a row …" --aspect 16:9 --out deck/assets/cover.jpg
genoffice slides check deck/outline.json --json      # 8 pages, no findings
genoffice slides check deck/pages/01.json --json     # builds one slide, audits overflow and overlap
…                                                    # one page file per slide, fixed until each check is clean
genoffice create --type pptx --spec deck/pages --outline deck/outline.json --out deck/solar-system.pptx --json
genoffice slides render deck/solar-system.pptx --out deck/shots --json
genoffice slides audit deck/solar-system.pptx --json    # 8 slides, no layout issues
genoffice slides replace deck/solar-system.pptx --slide 4 --spec deck/pages/05.json --json
genoffice open deck/solar-system.pptx
```

`genoffice` 内部不会发起任何模型调用：思考由智能体负责，构建和检查由 CLI
负责，最后的成果会以一份普通的 `.pptx` 在 GenOffice 或 PowerPoint 中打开。

<a id="mcp-server"></a>

### MCP 服务器

同样这些命令也以 [Model Context Protocol](https://modelcontextprotocol.io) 工具
的形式提供，供那些无法运行终端、或者你不想给它终端权限的助手使用。接入方式
有两种，**设置 → 集成 → MCP** 中都提供了可直接复制的代码片段：

| 方式                            | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `genoffice mcp`**（推荐） | 一个由助手自行启动的 stdio 服务器，GenOffice 无需处于打开状态。每条命令对应一个工具（`info`、`convert`、`create_docx`、`create_xlsx`、`create_pptx`、`create_pdf`、`docs_read` / `docs_apply` / `docs_check`、`sheet_*`、`slides_*`、`render`、`guide`、`search`、`image`、`media`、`open`），再加上分阶段的幻灯片构建流程 `deck_start` → `deck_page` → `deck_build` → `deck_replace`。Ops、spec 和 Markdown 都以内联方式传入，因此没有文件系统的客户端同样可以正常工作。 |
| **B · 本地 HTTP 服务器**        | 运行在 GenOffice 应用内部，地址为 `http://127.0.0.1:3093/mcp`（Streamable HTTP，兼容旧版 SSE）。它的工具驱动一个可见的 Word 编辑器标签页：`create_session`、`insert_content`、`replace_blocks`、`apply_ops`、`read_document`、`save_session`，你可以实时看着文档成形。默认关闭；在同一个设置面板中开启。                                                                                                                                                                  |

```bash
# Claude Code
claude mcp add --transport stdio genoffice -- genoffice mcp
```

```jsonc
// Cursor、Claude Desktop 或任何其他 MCP 客户端
{ "mcpServers": { "genoffice": { "command": "genoffice", "args": ["mcp"] } } }
```

这里的 `genoffice` 就是应用内置的那个 CLI（在 macOS 上位于
`/Applications/GenOffice.app/Contents/Resources/cli/genoffice`；设置面板会
打印出你本机安装的确切路径）。这个服务器自带工作流说明，并把操作参考文档以
`genoffice://guide/*` 资源的形式暴露出来，因此不需要额外的 skill；skill 和
MCP 服务器可以共存，由助手自行选择使用哪一个。云端能力（`search`、`image`、
`media`）仍然经由 GenOffice 中配置的服务商完成；其余一切都在本机运行，
`GENOFFICE_ALLOWED_ROOTS` 会把每个工具都限制在你列出的文件夹之内。

上方演示中的可再生能源演示文稿，就是仅接入 `genoffice` MCP 服务器时，
Claude Code 里一句提示词从协议层面呈现出的样子：

```text
capabilities · guide(slides, spec) · guide(slides, design)
search(query) ×4                         → IEA, BNEF and IRENA figures for the slides
search(query, images) ×7 · media(url, ask) ×7
                                         → candidate photos, each one checked to be a real photograph
deck_start(dir, style, outline)          → outline checked: 8 pages to write
deck_page(dir, 0, page) … deck_page(dir, 7, page)
                                         → each page checked against the outline and the palette; one page sent again
deck_build(dir, out)                     → renewables-2026.pptx, no image failures
slides_audit(file) · slides_render(file, out)
                                         → no layout findings; 8 PNGs come back as image content
deck_replace(dir, n, page) ×3 · slides_render(file, out)
                                         → three pages fixed after looking at the renders
```

三十八次调用，大约十三分钟，助手全程没有碰过终端：图表、照片、指南、检查和渲染结果都是作为 MCP 工具结果传递的。只有 `search` 和 `media` 离开过本机，发往 GenOffice 中配置的服务商。

<a id="download"></a>

## 下载

| 平台                                  | 系统要求                                               | 下载                                                                                 |
| ------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **macOS** —— Apple Silicon (arm64)    | macOS 11+                                              | [最新 `.dmg`（arm64）](https://github.com/361533652/genoffice/releases/latest)       |
| **macOS** —— Intel (x64)              | macOS 11+                                              | [最新 `.dmg`（x64）](https://github.com/361533652/genoffice/releases/latest)         |
| **Windows**（x64，大多数 PC）         | Windows 10+，Intel/AMD                                 | [最新 `-x64.exe` 安装程序](https://github.com/361533652/genoffice/releases/latest)   |
| **Windows** on Arm（ARM64）           | Windows 11 on Arm（Snapdragon X 及同类芯片）           | [最新 `-arm64.exe` 安装程序](https://github.com/361533652/genoffice/releases/latest) |
| **Linux** —— Debian / Ubuntu          | x86_64，glibc 2.34+（Ubuntu 22.04 或更新）             | [最新 `.deb`](https://github.com/361533652/genoffice/releases/latest)                |
| **Linux** —— Fedora / RHEL / openSUSE | x86_64，glibc 2.34+（Fedora 35+、RHEL 9+、Leap 15.6+） | [最新 `.rpm`](https://github.com/361533652/genoffice/releases/latest)                |
| **Linux** —— 其他发行版               | x86_64，glibc 2.34+，FUSE 2                            | [最新 `.AppImage`](https://github.com/361533652/genoffice/releases/latest)           |

所有构建均来自 `main` 分支；macOS 和 Windows 安装程序均已签名。
历史版本见 [Releases](https://github.com/361533652/genoffice/releases) 页面。

<details>
<summary><b>在 Linux 上安装</b></summary>

deb 包通过 apt 安装 —— 会自动拉取依赖并把 GenOffice 添加到应用程序菜单：

```bash
sudo apt install ./genoffice_<version>_amd64.deb
```

在 Fedora / RHEL 系 / openSUSE 上，请改用 rpm 包：

```bash
sudo dnf install ./genoffice-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./genoffice-<version>.x86_64.rpm  # openSUSE
```

AppImage 无需安装即可运行：先安装 FUSE 2 运行时
（`sudo apt install libfuse2`；在 Ubuntu 24.04 上软件包名为 `libfuse2t64`），
给文件加上可执行权限，然后运行：

```bash
chmod +x GenOffice-<version>.AppImage
./GenOffice-<version>.AppImage
```

在 Chromebook 上，同样的安装包可以在 Linux 环境（Crostini）中运行——详见 [docs/platforms/chromeos.md](../platforms/chromeos.md)。

</details>

## 工作原理

七个 Electron 应用 —— Docs、Sheets、Slides、PDF、Markdown、HTML 以及多标签
外壳 —— 共享同一层由纯 TypeScript 包组成的引擎，外加一个处理 `.xlsx` 的 Rust
sidecar。原始文件始终是唯一事实来源：修改以窄范围补丁的形式应用，编辑器未触
碰的一切在往返过程中原样保留。

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

逐个包的导览（docx/pptx 引擎、`pdf2docx`、`html2docx`、智能体核心与服务商）
见 [CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages)。

## 开发

```bash
npm install
npm run fixtures     # generate test .docx fixtures
npm test             # engine + app unit tests (docs/sheets/slides need no display)
npm run typecheck    # tsc --noEmit across every workspace
npm run dev          # all six editors + shell against Vite dev servers
npm run dev:docs     # a single app (same pattern works per workspace)
npm run dist:mac     # package macOS dmg (regenerates third-party notices)
npm run dist:win     # package Windows nsis installer
npm run dist:linux   # package Linux AppImage + deb + rpm
```

Sheets 应用的 xlsx sidecar 还需要 Rust 工具链（`cargo` 在 PATH 中）；
`npm run build -w @genoffice/sheets` 会自动编译它。每项改动必须通过的检查以及
拉取请求的合入流程见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

## 社区

GenOffice 正在积极开发中，你的反馈决定它的走向。

- **报告 bug 或提出功能需求**，请到
  [GitHub Issues](https://github.com/361533652/genoffice/issues)。
- **加入 GenOffice 群聊**，在
  [GenTeam](https://genoffice.ai/join) 上与团队和其他用户交流。
- **给仓库点个 Star** —— 如果 GenOffice 对你有用，这是支持项目最好的方式。

## 常见问题

<details>
<summary><b>GenOffice 是免费的吗？</b></summary>

是的。GenOffice 免费且开源，采用 Apache-2.0 许可证 —— 没有试用期，应用本身也
没有付费档。

</details>

<details>
<summary><b>GenOffice 能打开 Microsoft Word、Excel 和 PowerPoint 文件吗？</b></summary>

可以。GenOffice 直接打开并保存原生 `.docx`、`.xlsx` 和 `.pptx` 文件。保存是
字节级保留的：你未改动的部分会逐字节写回，文档在 Microsoft Office 中照常可用。

</details>

<details>
<summary><b>GenOffice 可以离线使用吗？</b></summary>

文档编辑完全在本地进行 —— 打开、编辑、保存和转换文件都不需要把文件发送到任何
地方。AI 功能（智能体、搜索、图片工具）需要网络连接，并且需要登录 Genspark 或
提供你自己的模型 API 密钥。

</details>

<details>
<summary><b>GenOffice 能编辑 PDF 文件吗？</b></summary>

可以 —— 真正的 PDF 文字和图片编辑，会在保留原始字体的前提下重写页面内容流，
而不是用注释遮盖。

</details>

<details>
<summary><b>GenOffice 能把 PDF 转换为 Word、Excel 或 PowerPoint 吗？</b></summary>

可以 —— 完全在本机完成：PDFium 字符级提取加上基于几何的版面分析，不依赖云
服务，不上传。扫描页同样支持：在 macOS 和 Windows 上由系统 OCR 识别，转换结果
是可编辑的文字，而不是一张页面图片。

</details>

<details>
<summary><b>我可以使用自己的 AI 模型或 API 密钥吗？</b></summary>

可以。除了免密钥的 Genspark 登录，GenOffice 还支持自带 Claude、OpenAI、Gemini、
DeepSeek、Kimi、GLM、Qwen、Doubao、MiniMax、Grok、Mistral、OpenRouter、Requesty 和
OpenCode Zen/Go 的密钥，以及任何 OpenAI 兼容端点 —— 包括本地模型服务。搜索、
图片生成和图片/视频解析在 设置 → AI 媒体与搜索 下使用各自的密钥。

</details>

<details>
<summary><b>可以关闭 AI 面板吗？</b></summary>

可以。设置 → AI 中有一个 **Show the AI sidebar**（显示 AI 侧栏）开关。关掉之后，
所有编辑器都会隐藏侧栏，新文档也不再自动打开它。显式的 AI 操作 —— 比如功能区
按钮或菜单项 —— 仍会为该文档打开面板，关掉后面板会恢复隐藏。

</details>

<details>
<summary><b>GenOffice 能把 HTML 转换为 Word 吗？</b></summary>

可以 —— HTML 应用中的「导出为 Word」会完全在本机生成原生、可编辑的 `.docx`。
页面先在内置 Chromium 中渲染，再归约为真正的 Word 结构：标题、段落、列表、
表格、卡片、KPI 行、表单字段和页面背景；只有在 Word 中没有对应结构的视觉元素
（图表、图标、装饰性方框）才会以图片形式嵌入。

</details>

<details>
<summary><b>我可以从 Claude Code、Codex、Cursor 或脚本中驱动 GenOffice 吗？</b></summary>

可以。GenOffice 会安装一个 `genoffice` 命令行，以无界面方式运行同一套引擎：
在终端或脚本中检查、转换、创建、读取和编辑文档，并可通过 `--json` 输出供程序
使用。内置的 agent skill 会教 Claude Code、Codex、Cursor、Gemini CLI、GitHub
Copilot、OpenCode 和 Windsurf 使用它；请在 **设置 → 集成** 中安装。详见
[命令行与 agent skill](#command-line-and-agent-skill)。

</details>

<details>
<summary><b>GenOffice 会收集数据吗？</b></summary>

官方打包版本默认会发送有限的使用统计，你可以随时在 设置 → 通用 中关闭上报。
统计数据绝不包含文档内容、文件名、文件路径、账号身份或电子邮件地址。完整的事件
和数据披露见 [GenOffice 隐私政策](../../PRIVACY.md)。

</details>

## 安全

进程安全态势（渲染进程沙箱、IPC 校验、外部链接拦截）以及针对 AI 生成内容的
威胁模型，见 [SECURITY.md](../../SECURITY.md)。

## 致谢

没有以下开源项目，就不会有 GenOffice：

- [Electron](https://www.electronjs.org/) —— 每个应用的桌面运行时。
- [Univer](https://github.com/dream-num/univer)（Apache-2.0）—— Sheets 所扩展的
  电子表格 UI 内核。
- [PDFium](https://pdfium.googlesource.com/pdfium/)（BSD-3-Clause，经
  [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer) 打包）——
  真正的 PDF 文字与图片编辑背后的内容流引擎。
- [pdf.js](https://github.com/mozilla/pdf.js)（Apache-2.0）和
  [pdf-lib](https://github.com/Hopding/pdf-lib)（MIT）—— PDF 渲染与文档组装。
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) ——
  Docs 和 Markdown 中的块编辑器。
- [CodeMirror](https://codemirror.net/)（MIT）—— HTML 中的源码编辑器。
- [Konva](https://konvajs.org/) —— Slides 以及 Sheets 图表的画布渲染。
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz)（wasm）—— 复杂文字的
  文本整形度量。
- [calamine](https://github.com/tafia/calamine) 和
  [IronCalc](https://github.com/ironcalc/IronCalc) —— Rust xlsx sidecar 的
  读取层与计算层。
- [libeot](https://github.com/umanwizard/libeot)（MPL-2.0）—— 面向嵌入式
  PowerPoint 字体的 MicroType Express 解码器，已移植为 TypeScript。
- [React](https://react.dev/)（MIT）—— 各个应用的 UI 层。
- [Mermaid](https://mermaid.js.org/)（MIT）和 [KaTeX](https://katex.org/)
  （MIT）—— Markdown 与 Docs 中的图表与数学公式。
- [opentype.js](https://opentype.js.org/)（MIT）—— 用于度量信息解析与字形
  查找的字体解析库。
- [JSZip](https://stuk.github.io/jszip/)（MIT）和
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  （MIT）—— OOXML 容器与 XML 层。
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  （MIT）—— 各功能区所用的图标集。
- [electron-updater](https://www.electron.build/)（MIT）—— 应用内更新。
- Liberation、Carlito、Caladea 和 Noto CJK 字体（OFL/Apache-2.0）—— 随应用
  打包的文档字体。

`npm run notices` 会重新生成随应用打包的第三方许可证摘要
（`tools/gen-third-party-notices.mjs`）；所有运行时依赖均为
MIT/Apache-2.0/BSD-3-Clause/OFL 许可。

## 许可证

GenOffice 采用 [Apache License 2.0](../../LICENSE) 许可，仅有一处例外：`ee/`
目录为未来的企业模块预留，受 [GenOffice 企业许可证](../../ee/LICENSE) 约束。

GenOffice 和 Genspark 的名称与标识是 Mainfunc, Inc. 的商标。Apache-2.0 许可证
并不授予使用它们的权利（见第 6 节）；分叉项目请使用自己的品牌。
