<p align="center">
  <a href="https://genoffice.ai/">
    <picture>
      <source srcset="docs/assets/readme/hero-dark.webp" media="(prefers-color-scheme: dark)">
      <img src="docs/assets/readme/hero.webp" alt="GenOffice — the open-source Office suite: Docs, Sheets, Slides, PDF, Markdown and HTML" width="100%">
    </picture>
  </a>
</p>

<h1 align="center">GenOffice</h1>

<p align="center"><b>A full-featured open-source Office suite.</b><br>
Word, Excel, PowerPoint and PDF files, saved back in the real formats.</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/361533652/genoffice" alt="License: Apache-2.0"></a>
  <a href="https://github.com/361533652/genoffice/releases/latest"><img src="https://img.shields.io/github/v/release/361533652/genoffice" alt="Latest release"></a>
  <a href="https://github.com/361533652/genoffice/releases"><img src="https://img.shields.io/github/downloads/361533652/genoffice/total" alt="Downloads"></a>
  <a href="https://github.com/361533652/genoffice/stargazers"><img src="https://img.shields.io/github/stars/361533652/genoffice?style=flat" alt="GitHub stars"></a>
  <a href="https://x.com/merrickbuilds"><img src="https://img.shields.io/badge/follow-%40merrickbuilds-000000?logo=x&logoColor=white" alt="Follow @merrickbuilds on X"></a>
</p>

<p align="center"><b>English</b> · <a href="docs/i18n/README.es.md">Español</a> · <a href="docs/i18n/README.pt-BR.md">Português</a> · <a href="docs/i18n/README.de.md">Deutsch</a> · <a href="docs/i18n/README.fr.md">Français</a> · <a href="docs/i18n/README.zh-CN.md">简体中文</a> · <a href="docs/i18n/README.zh-TW.md">繁體中文</a> · <a href="docs/i18n/README.ko.md">한국어</a> · <a href="docs/i18n/README.ja.md">日本語</a> · <a href="docs/i18n/README.ar.md">العربية</a> · <a href="docs/i18n/README.ru.md">Русский</a> · <a href="docs/i18n/README.it.md">Italiano</a> · <a href="docs/i18n/README.nl.md">Nederlands</a> · <a href="docs/i18n/README.pl.md">Polski</a> · <a href="docs/i18n/README.cs.md">Čeština</a> · <a href="docs/i18n/README.id.md">Bahasa Indonesia</a> · <a href="docs/i18n/README.ms.md">Bahasa Melayu</a> · <a href="docs/i18n/README.th.md">ไทย</a> · <a href="docs/i18n/README.hi.md">हिन्दी</a> · <a href="docs/i18n/README.he.md">עברית</a> · <a href="docs/i18n/README.vi.md">Tiếng Việt</a> · <a href="docs/i18n/README.tr.md">Türkçe</a></p><!-- lang-switcher · public-hygiene: allow -->

<p align="center">
  <a href="#download"><b>Download</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://genoffice.ai/"><b>Website</b></a> ·
  <a href="https://genoffice.ai/join"><b>Community</b></a> ·
  <a href="https://x.com/merrickbuilds"><b>X</b></a> ·
  <a href="PRIVACY.md"><b>Privacy</b></a>
</p>

GenOffice is a free, open-source alternative to Microsoft Office for macOS,
Windows and Linux. It opens and saves native `.docx`, `.xlsx` and `.pptx`
files, edits PDF, Markdown and HTML, and opens source code with syntax
highlighting and formatting. ODF files
(`.odt`, `.ods`, `.odp` and the `.ott`/`.ots`/`.otp` templates) open as
editable OOXML copies, and so do legacy Word `.doc`/`.dot` files and Hancom
documents (`.hwp`, `.hwpx`); the imports are open-only — saving writes OOXML,
never the source format.

- **Real formats, byte-preserving.** Only what you edit is rewritten. Everything
  else in the file survives byte-for-byte, so documents keep working in Word,
  Excel and PowerPoint.
- **AI you can review.** Edits land as tracked changes and diffs with one-click
  rollback. Spreadsheets get live formulas, not pasted numbers. Decks and pages
  are generated onto the canvas and stay fully editable. Hide a Docs selection
  or a Sheets cell range from the model and the AI sees only a named
  placeholder; the original words stay in the file and come back. Hiding
  covers this app's AI — the CLI, MCP tools and headless export read the file
  directly and still see these words.
- **Local by design.** Files open, edit, save and convert on your machine.
  PDF → Word / Excel / PowerPoint, Markdown → Word and HTML → Word all run
  on-device. Only the AI calls leave the machine, to the provider you choose.
- **Find files by what they say.** The home screen searches the names,
  folders and full text of your `.docx`, `.xlsx`, `.pptx`, PDF, Markdown and
  HTML files from a local SQLite index, CJK included. Optionally, the top hits
  are reranked by **[TypeSafe Jev](https://typesafe.ai/)**, the System One
  judgment model, so the file that answers your question comes first.
- **Your keys or none.** Sign in with Genspark and skip keys, or bring your own
  key for Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax,
  Grok, Mistral, OpenRouter, Requesty, Opper, Cheaper Inference, Atlas Cloud, or any OpenAI-compatible endpoint, local
  servers included.
- **Scriptable and agent-ready.** The app ships a `genoffice` command line and
  a skill for Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode
  and Windsurf, so a coding agent can create, convert, read and edit real
  Office files on your machine without opening a window.

**Get it:** [macOS](https://github.com/361533652/genoffice/releases/latest) (Apple Silicon and Intel) ·
[Windows](https://github.com/361533652/genoffice/releases/latest) (x64 and Arm) ·
[Linux](https://github.com/361533652/genoffice/releases/latest) (deb, rpm, AppImage) —
details and requirements in [Download](#download).

## Why GenOffice

- **Open source**, Apache-2.0, built in the open on GitHub.
- **Yours to run.** Native apps for macOS, Windows and Linux; files stay on your
  disk and every edit, save and conversion happens on your machine.
- **Real Office files.** Native `.docx`, `.xlsx` and `.pptx`, byte-preserving:
  the parts of a file you did not touch are copied exactly as they were.
- **An AI that edits the document itself.** Tracked changes in Docs, live
  formulas and charts in Sheets, slides drawn onto the canvas, every AI turn a
  snapshot you can roll back.
- **Your model, your key.** Sign in with Genspark, or bring a key for Claude,
  OpenAI, Gemini, DeepSeek and more, local servers and any OpenAI-compatible
  endpoint included.
- **PDF done properly.** Edit text inside the page, and convert PDF to Word,
  Excel or PowerPoint on-device, with system OCR for scans.
- **Markdown and HTML too**, with local export to Word.
- **Search that finds the answer, not the keyword.** Full-text search over
  every document in your folders, indexed on-device, with optional reranking
  by TypeSafe Jev, the System One judgment model.
- **Scriptable.** A `genoffice` command line, an agent skill and an MCP server
  put every engine at the service of Claude Code, Claude Desktop, Codex, Cursor
  and other agents, still on-device.
- **Free**, for individuals and teams alike.

## Command line and agent skill

Everything the apps can do to a file, the `genoffice` command line can do from
a terminal: inspect, convert, create, read and edit Word, Excel, PowerPoint,
PDF, Markdown and HTML on the same engines, headless. It installs with
GenOffice, needs no runtime of its own, and never sends a document anywhere.
Paired with the bundled **agent skill**, it turns a coding agent into a
document worker that produces real Office files instead of Markdown
approximations.

**Works with:** Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode and Windsurf out of the box, any other agent that reads skills, and,
through the [MCP server](#mcp-server), Claude Desktop and every MCP client.

### Install the skill

| How                                    | What happens                                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Settings → Integrations** in the app | Lists the agents found on this computer; one click writes the skill into each one you choose. An **Update** button appears when a GenOffice release ships a newer skill. |
| **Download as zip** on the same page   | The layout claude.ai, the Claude desktop apps and other assistants accept as an uploaded skill.                                                                          |
| `npx skills add 361533652/genoffice` | Installs from this repository into any skills-compatible agent.                                                                                                          |

Then start a new chat and ask for a document. The skill teaches the agent when
to reach for `genoffice`, how to read a file before editing it, and how to
check its own work.

### Quickstart from the terminal

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

Every command prints a one-line summary, or a single JSON object with
`--json`. Edits are atomic: a rejected op leaves the file untouched and comes
back with a guided error. `genoffice help` lists the current command surface;
the full reference is [packages/cli/README.md](packages/cli/README.md).

### What the agent actually runs

The Solar System deck in the [demo](#demo) took one prompt in Claude Code.
Behind it, the agent followed the skill's staged workflow and the CLI checked
every stage before the next one started:

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

No model call happens inside `genoffice`: the agent does the thinking, the CLI
does the building and the checking, and the result opens in GenOffice or
PowerPoint as an ordinary `.pptx`.

### MCP server

The same commands are available as [Model Context Protocol](https://modelcontextprotocol.io)
tools, for assistants that cannot run a terminal or that you would rather not
give one. There are two ways in, both shown with copy-ready snippets in
**Settings → Integrations → MCP**:

| Way                                   | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `genoffice mcp`** (recommended) | A stdio server the assistant starts itself; GenOffice does not need to be open. One tool per command (`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`) plus the staged deck flow `deck_start` → `deck_page` → `deck_build` → `deck_replace`. Ops, specs and Markdown are passed inline, so a client without a file system still works. |
| **B · Local HTTP server**             | Runs inside the GenOffice app on `http://127.0.0.1:3093/mcp` (Streamable HTTP, with legacy SSE). Its tools drive a visible Word editor tab: `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session`, and you watch the document take shape. Off by default; switch it on in the same settings pane.                                                                                                                                               |
| **C · `genoffice mcp --http`**        | The stdio tool set as a Streamable HTTP server for clients on other machines: a container, a sandbox, a shared box on your network. Files travel with the calls: `PUT /files/<name>` uploads one and returns a URL, every `file` parameter takes an http(s) URL, and a tool that writes a file hands it back as a download URL plus, when small, the bytes as an MCP resource. `--host 0.0.0.0` opens it to the network, `--token` protects it.                                              |

```bash
# Claude Code
claude mcp add --transport stdio genoffice -- genoffice mcp
```

```jsonc
// Cursor, Claude Desktop or any other MCP client
{ "mcpServers": { "genoffice": { "command": "genoffice", "args": ["mcp"] } } }
```

```bash
# On the machine that has GenOffice (private network; add --token for a shared box)
genoffice mcp --http 3093 --host 0.0.0.0 --token "$GENOFFICE_MCP_TOKEN"

# From the client: upload, then use the URL wherever a tool takes a file
curl -T report.docx -H "Authorization: Bearer $GENOFFICE_MCP_TOKEN" http://server:3093/files/
#   → { "url": "http://server:3093/files/<id>/report.docx", ... }
#   docs_read({ "file": "http://server:3093/files/<id>/report.docx" })
#   docs_apply(...) → output_url, downloadable with curl -o
```

Over HTTP every session gets a private scratch folder, relative paths and deck
folders resolve inside it, `open` is not offered, and with
`GENOFFICE_ALLOWED_ROOTS` unset the tools cannot leave the server's own file
store. `render`, `convert` to PDF and `create_pdf` still start a hidden
GenOffice process, so a headless host needs the app installed and a virtual
display (`xvfb-run`).

`genoffice` here is the CLI shipped inside the app (on macOS
`/Applications/GenOffice.app/Contents/Resources/cli/genoffice`; the settings
pane prints the exact path for your install). The server carries its own
workflow instructions and exposes the op references as `genoffice://guide/*`
resources, so no skill is needed; the skill and the MCP server can coexist and
the assistant picks one. Cloud features (`search`, `image`, `media`) still go
through the provider configured in GenOffice; everything else runs locally, and
`GENOFFICE_ALLOWED_ROOTS` confines every tool to the folders you list.

The renewable-energy deck in the [demo](#demo) is what one prompt in Claude Code
with only the `genoffice` MCP server attached looks like from the protocol
side:

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

Thirty-eight calls, about thirteen minutes, and the assistant never touched a
shell: the figures, the photos, the guides, the checks and the renders all
travelled as MCP tool results. Only `search` and `media` left the machine, to
the provider configured in GenOffice.

## Download

| Platform                             | Requirements                                          | Download                                                                                  |
| ------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **macOS** — Apple Silicon (arm64)    | macOS 11+                                             | [Latest `.dmg` (arm64)](https://github.com/361533652/genoffice/releases/latest)         |
| **macOS** — Intel (x64)              | macOS 11+                                             | [Latest `.dmg` (x64)](https://github.com/361533652/genoffice/releases/latest)           |
| **Windows** (x64, most PCs)          | Windows 10+, Intel/AMD                                | [Latest `-x64.exe` installer](https://github.com/361533652/genoffice/releases/latest)   |
| **Windows** on Arm (ARM64)           | Windows 11 on Arm (Snapdragon X and similar)          | [Latest `-arm64.exe` installer](https://github.com/361533652/genoffice/releases/latest) |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 or newer)           | [Latest `.deb`](https://github.com/361533652/genoffice/releases/latest)                 |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | [Latest `.rpm`](https://github.com/361533652/genoffice/releases/latest)                 |
| **Linux** — other distributions      | x86_64, glibc 2.34+, FUSE 2                           | [Latest `.AppImage`](https://github.com/361533652/genoffice/releases/latest)            |

All builds come from `main`; the macOS and Windows installers are signed.
Older versions are on the [Releases](https://github.com/361533652/genoffice/releases) page.

<details>
<summary><b>Installing on Linux</b></summary>

The deb installs with apt — it pulls in the dependencies and adds GenOffice
to the applications menu:

```bash
sudo apt install ./genoffice_<version>_amd64.deb
```

On Fedora / RHEL-family / openSUSE, install the rpm instead:

```bash
sudo dnf install ./genoffice-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./genoffice-<version>.x86_64.rpm  # openSUSE
```

The deb and rpm also add blank templates for KDE Plasma's Dolphin: right-click
in a folder → **Create New** lists _GenOffice Document_, _GenOffice Spreadsheet_
and _GenOffice Presentation_. They live in `/usr/share/templates` and are
removed with the package.

The AppImage runs in place: install the FUSE 2 runtime
(`sudo apt install libfuse2`; on Ubuntu 24.04 the package is `libfuse2t64`),
make the file executable, then run it:

```bash
chmod +x GenOffice-<version>.AppImage
./GenOffice-<version>.AppImage
```

On a Chromebook, the same packages run inside the Linux environment
(Crostini) — [docs/platforms/chromeos.md](docs/platforms/chromeos.md) has the
details.

</details>

## How it works

Seven Electron apps — Docs, Sheets, Slides, PDF, Markdown, HTML and the
tabbed shell — share one engine layer of pure TypeScript packages plus a Rust
sidecar for `.xlsx`. The original file is always the source of truth: edits
are applied as narrow patches, and everything the editor did not touch
survives the round trip untouched.

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

The package-by-package tour (docx/pptx engines, `pdf2docx`, `html2docx`, the
agent core and providers) lives in [CONTRIBUTING.md](CONTRIBUTING.md#engine-packages).

### Legacy and ODF files open as converted copies

Formats GenOffice cannot write back — legacy Word `.doc`/`.dot`, Hancom
`.hwp`/`.hwpx`, Excel 97 `.xls`, `.tsv`, legacy PowerPoint `.ppt`, and the
OpenDocument family (`.odt`, `.ott`, `.ods`, `.ots`, `.odp`, `.otp`) — are
imports, not native files.
Opening one converts it on your machine into a `.docx`, `.xlsx` or `.pptx`
copy and opens that copy; the original is never read again and never written.

- Docs and Slides ask where to put the copy first (the sibling `.docx`/`.pptx`
  next to the original by default), so every later Save lands there. A `.ppt`
  converts with its text as editable boxes in the original slide order and
  size; shape geometry, images and text formatting are not carried over yet.
- Sheets opens the converted workbook straight away and routes the first Save
  through Save As to a fresh `.xlsx`. `.csv` is the exception: it keeps its
  identity and Save writes values back to the `.csv`, as Excel does.
- The conversion is one-way and can drop features the source format carries
  but OOXML does not. `.doc`, `.hwp` and the ODF formats show a confirmation
  dialog saying so; tick "Convert without asking next time" to skip it, and
  "Ask before converting legacy files" in Settings → General turns it back on.

## Development

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

The sheets app additionally needs a Rust toolchain for its xlsx sidecar
(`cargo` on PATH); `npm run build -w @genoffice/sheets` compiles it
automatically. See [CONTRIBUTING.md](CONTRIBUTING.md) for the checks every
change must pass and how pull requests land.

## Community

GenOffice is in active development and your feedback shapes it.

- **Report a bug or request a feature** in
  [GitHub Issues](https://github.com/361533652/genoffice/issues).
- **Join the GenOffice group chat** on
  [GenTeam](https://genoffice.ai/join) to talk to the team and other users.
- **Follow [@merrickbuilds](https://x.com/merrickbuilds) on X** for release
  notes, demos and what is being built next.

## FAQ

<details>
<summary><b>Is GenOffice free?</b></summary>

Yes. GenOffice is free and open-source under the Apache-2.0 license — no
trial, no paid tier for the apps themselves.

</details>

<details>
<summary><b>Can GenOffice open Microsoft Word, Excel and PowerPoint files?</b></summary>

Yes. GenOffice opens and saves native `.docx`, `.xlsx` and `.pptx` files.
Saving is byte-preserving: parts of the file you didn't touch are written
back byte-for-byte, so documents keep working in Microsoft Office.
Legacy `.doc`/`.dot`, `.xls` and `.ppt` files open too, as converted
`.docx`/`.xlsx`/`.pptx` copies — see [Legacy and ODF files open as converted
copies](#legacy-and-odf-files-open-as-converted-copies).

</details>

<details>
<summary><b>Does GenOffice work offline?</b></summary>

Document editing is fully local — files never leave your machine to be
opened, edited, saved or converted. The AI features (agents, search, image
tools) need a network connection, with either a Genspark sign-in or your own
model API key.

</details>

<details>
<summary><b>Can GenOffice edit PDF files?</b></summary>

Yes — real PDF text and image editing that rewrites the page content stream
with the original fonts preserved, not cover-up annotations.

</details>

<details>
<summary><b>Can GenOffice convert PDF to Word, Excel or PowerPoint?</b></summary>

Yes — entirely on-device: PDFium character-level extraction plus
geometry-based layout analysis, no cloud service, no upload. Scanned pages
are covered too: on macOS and Windows the system OCR reads them, so they
convert to editable text rather than a page image.

</details>

<details>
<summary><b>Can I use my own AI model or API key?</b></summary>

Yes. Besides the keyless Genspark sign-in, GenOffice supports bring your own
key for Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax,
Grok, Mistral, OpenRouter, Requesty, Opper, Cheaper Inference, Atlas Cloud and OpenCode Zen/Go, plus any OpenAI-compatible
endpoint — including local model servers. Search, image generation and
image/video analysis take their own keys under Settings → AI Media & Search.

</details>

<details>
<summary><b>Can GenOffice convert HTML to Word?</b></summary>

Yes — Export as Word in the HTML app produces a native, editable `.docx`
entirely on-device. The page is rendered in the built-in Chromium and reduced
to real Word structures: headings, paragraphs, lists, tables, cards, KPI rows,
form fields and page backgrounds; only visuals with no Word counterpart
(charts, icons, decorated boxes) are embedded as pictures.

</details>

<details>
<summary><b>Can I drive GenOffice from Claude Code, Codex, Cursor or a script?</b></summary>

Yes. GenOffice installs a `genoffice` command line that runs the same engines
headless: inspect, convert, create, read and edit documents from a terminal or
a script, with `--json` output for programs. The bundled agent skill teaches
Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode and Windsurf
to use it; install it from **Settings → Integrations**. See
[Command line and agent skill](#command-line-and-agent-skill).

</details>

<details>
<summary><b>Does GenOffice collect any data?</b></summary>

Official packaged builds send limited usage analytics by default, and you can
disable reporting at any time under Settings → General. Analytics never sends
document content, file names, file paths, account identity or email
addresses. See [GenOffice Privacy](PRIVACY.md) for the complete event and
data disclosures.

</details>

## Security

See [SECURITY.md](SECURITY.md) for the process security posture (renderer
sandboxing, IPC validation, external-link gating) and the threat models for
AI-generated content.

## Acknowledgements

GenOffice would not be possible without these open-source projects:

- [Electron](https://www.electronjs.org/) — the desktop runtime for every app.
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — the spreadsheet
  UI core that Sheets extends.
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause, bundled via
  [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer)) — the
  content-stream engine behind true PDF text and image editing.
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) and
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — PDF rendering and
  document assembly.
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  the block editors in Docs and Markdown.
- [CodeMirror](https://codemirror.net/) (MIT) — the source editor in HTML.
- [Konva](https://konvajs.org/) — canvas rendering for Slides and Sheets
  charts.
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — text-shaping
  metrics for complex scripts.
- [calamine](https://github.com/tafia/calamine) and
  [IronCalc](https://github.com/ironcalc/IronCalc) — the read and calc layers
  of the Rust xlsx sidecar.
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — the MicroType
  Express decoder for embedded PowerPoint fonts, ported to TypeScript.
- [rhwp](https://github.com/edwardkim/rhwp) (MIT) — reads binary `.hwp`
  documents into HWPX for the Hancom import; its WebAssembly build carries the
  Rust crates and the Volexity hwp-extract port listed in the third-party
  notices. "한글", "한컴", "HWP" and "HWPX" are registered trademarks of Hancom
  Inc.; GenOffice is not affiliated with Hancom.
- [React](https://react.dev/) (MIT) — the UI layer of every app.
- [Mermaid](https://mermaid.js.org/) (MIT) and [KaTeX](https://katex.org/)
  (MIT) — diagrams and math in Markdown and Docs.
- [opentype.js](https://opentype.js.org/) (MIT) — font parsing for metrics
  and glyph lookup.
- [JSZip](https://stuk.github.io/jszip/) (MIT) and
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — the OOXML container and XML layers.
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — the icon set across the ribbons.
- [electron-updater](https://www.electron.build/) (MIT) — in-app updates.
- Liberation, Carlito, Caladea, and Noto CJK fonts (OFL/Apache-2.0) — bundled
  document fonts.

`npm run notices` regenerates the bundled third-party license summary
(`tools/gen-third-party-notices.mjs`); all runtime dependencies are
MIT/Apache-2.0/BSD-3-Clause/OFL.

## License

GenOffice is licensed under the [Apache License 2.0](LICENSE), with one
exception: the `ee/` directory is reserved for future enterprise modules and
is covered by the [GenOffice Enterprise License](ee/LICENSE).

The GenOffice and Genspark names and logos are trademarks of Mainfunc, Inc.
The Apache-2.0 license does not grant permission to use them (see section 6);
forks should use their own branding.
