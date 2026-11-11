<p align="center">
  <a href="https://genoffice.ai/">
    <picture>
      <source srcset="../assets/readme/hero-dark.webp" media="(prefers-color-scheme: dark)">
      <img src="../assets/readme/hero.webp" alt="GenOffice — het open-source AI-kantoorpakket: Docs, Sheets, Slides, PDF, Markdown en HTML met een ingebouwd AI-paneel" width="100%">
    </picture>
  </a>
</p>

<h1 align="center">GenOffice</h1>

<p align="center"><b>De eerste volwaardige open-source AI-officesuite ter wereld.</b><br>
Word-, Excel-, PowerPoint- en PDF-bestanden, bewerkt door jou en je AI, opgeslagen in de echte formaten.</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/361533652/genoffice" alt="Licentie: Apache-2.0"></a>
  <a href="https://github.com/361533652/genoffice/releases/latest"><img src="https://img.shields.io/github/v/release/361533652/genoffice" alt="Nieuwste release"></a>
  <a href="https://github.com/361533652/genoffice/releases"><img src="https://img.shields.io/github/downloads/361533652/genoffice/total" alt="Downloads"></a>
  <a href="https://github.com/361533652/genoffice/stargazers"><img src="https://img.shields.io/github/stars/361533652/genoffice?style=flat" alt="GitHub-sterren"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <b>Nederlands</b> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.tr.md">Türkçe</a></p>

<p align="center">
  <a href="#download"><b>Download</b></a> ·
  <a href="#skills"><b>Skills</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://genoffice.ai/"><b>Website</b></a> ·
  <a href="https://genoffice.ai/join"><b>Community</b></a> ·
  <a href="../../PRIVACY.md"><b>Privacy</b></a>
</p>

GenOffice is een gratis, open-source alternatief voor Microsoft Office voor
macOS, Windows en Linux. Het opent en bewaart native `.docx`-, `.xlsx`- en
`.pptx`-bestanden, bewerkt PDF, Markdown en HTML, en zet bij elk document een
AI-agent — geen los chatvenstertje erbij geplakt, maar een editor die het
bestand leest, de wijziging doorvoert en je precies laat zien wat er is
aangepast. ODF-bestanden (`.odt`, `.ods`, `.odp` en de
`.ott`/`.ots`/`.otp`-sjablonen) worden geopend als bewerkbare
OOXML-kopieën; de import is open-only — opslaan schrijft OOXML, nooit
ODF.

- **Echte formaten, byte-behoudend.** Alleen wat je bewerkt, wordt herschreven.
  Al het overige in het bestand blijft byte-voor-byte behouden, zodat
  documenten gewoon blijven werken in Word, Excel en PowerPoint.
- **AI die je kunt controleren.** Wijzigingen komen binnen als tracked changes
  en diffs met terugdraaien in één klik. Spreadsheets krijgen live formules,
  geen geplakte getallen. Decks en pagina's worden op het canvas gegenereerd
  en blijven volledig bewerkbaar. Verberg een Docs-selectie of een
  Sheets-celbereik voor het model en de AI ziet alleen een benoemde
  placeholder; de originele woorden blijven in het bestand staan en komen
  terug. Verbergen geldt alleen voor de AI in de app — de CLI, MCP-tools en
  headless export lezen het bestand direct en zien deze woorden nog steeds.
- **Lokaal by design.** Bestanden worden op je eigen machine geopend, bewerkt,
  opgeslagen en geconverteerd. PDF → Word / Excel / PowerPoint, Markdown →
  Word en HTML → Word draaien allemaal on-device. Alleen de AI-aanroepen
  verlaten de machine, naar de provider die jij kiest.
- **Jouw eigen keys, of geen enkele.** Log in met Genspark en je hoeft niets te
  regelen, of gebruik je eigen key voor Claude, OpenAI, Gemini, DeepSeek,
  Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty, of elk
  OpenAI-compatibel endpoint, inclusief lokale servers.
- **Scriptbaar en klaar voor agents.** De app levert een
  `genoffice`-opdrachtregel en een skill voor Claude Code, Codex, Cursor,
  Gemini CLI, GitHub Copilot, OpenCode en Windsurf mee, zodat een coding
  agent echte Office-bestanden op je eigen machine kan maken, converteren,
  lezen en bewerken zonder een venster te openen.

**Haal het hier:** [macOS](https://github.com/361533652/genoffice/releases/latest) (Apple Silicon en Intel) ·
[Windows](https://github.com/361533652/genoffice/releases/latest) (x64 en Arm) ·
[Linux](https://github.com/361533652/genoffice/releases/latest) (deb, rpm, AppImage) —
details en vereisten in [Download](#download).

## Waarom GenOffice

- **Open source**, Apache-2.0, in het openbaar ontwikkeld op GitHub.
- **Van jou om te draaien.** Native apps voor macOS, Windows en Linux;
  bestanden blijven op je eigen schijf en elke bewerking, opslag en conversie
  gebeurt op je eigen machine.
- **Echte Office-bestanden.** Native `.docx`, `.xlsx` en `.pptx`,
  byte-behoudend: de delen van een bestand die je niet hebt aangeraakt, worden
  precies zo gekopieerd als ze waren.
- **Een AI die het document zelf bewerkt.** Tracked changes in Docs, live
  formules en grafieken in Sheets, slides die direct op het canvas worden
  getekend, elke AI-beurt een snapshot waarnaar je kunt teruggaan.
- **Je eigen model, je eigen key.** Log in met Genspark, of gebruik een key
  voor Claude, OpenAI, Gemini, DeepSeek en meer, inclusief lokale servers en
  elk OpenAI-compatibel endpoint.
- **PDF goed gedaan.** Bewerk tekst direct op de pagina en converteer PDF
  naar Word, Excel of PowerPoint on-device, met systeem-OCR voor scans.
- **Ook Markdown en HTML**, met hetzelfde AI-paneel en lokale export naar
  Word.
- **Skills.** Kant-en-klare skills of je eigen `SKILL.md`, toegevoegd via het **+**-menu van elk AI-paneel.
- **Scriptbaar.** Een `genoffice`-opdrachtregel, een agent-skill en een
  MCP-server stellen elke engine ter beschikking van Claude Code, Claude
  Desktop, Codex, Cursor en andere agents, nog altijd on-device.
- **Gratis**, voor individuen en teams.

## Opdrachtregel en agent-skill

Alles wat de apps met een bestand kunnen, kan de `genoffice`-opdrachtregel
vanuit een terminal: Word, Excel, PowerPoint, PDF, Markdown en HTML
inspecteren, converteren, maken, lezen en bewerken op dezelfde engines,
headless. Hij wordt samen met GenOffice geïnstalleerd, heeft geen eigen
runtime nodig en stuurt nooit een document ergens naartoe. In combinatie met
de meegeleverde **agent-skill** maakt hij van een coding agent een
documentenwerker die echte Office-bestanden oplevert in plaats van
Markdown-benaderingen.

**Werkt met:** Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode en Windsurf direct uit de doos, met elke andere agent die skills
leest, en, via de [MCP-server](#mcp-server), Claude Desktop en elke
MCP-client.

### De skill installeren

| Hoe                                       | Wat er gebeurt                                                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Instellingen → Integraties** in de app  | Toont de agents die op deze computer zijn gevonden; met één klik wordt de skill naar elke agent geschreven die je kiest. Er verschijnt een knop **Bijwerken** wanneer een GenOffice-release een nieuwere skill meebrengt. |
| **Downloaden als zip** op dezelfde pagina | De indeling die claude.ai, de Claude-desktop-apps en andere assistenten accepteren als geüploade skill.                                                                                                                   |
| `npx skills add 361533652/genoffice`    | Installeert vanuit deze repository in elke agent die skills ondersteunt.                                                                                                                                                  |

Start daarna een nieuwe chat en vraag om een document. De skill leert de
agent wanneer hij naar `genoffice` moet grijpen, hoe hij een bestand leest
voordat hij het bewerkt en hoe hij zijn eigen werk controleert.

### Snelstart vanuit de terminal

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

Elk commando print een samenvatting van één regel, of één JSON-object met
`--json`. Bewerkingen zijn atomair: een afgewezen op laat het bestand
onaangeroerd en komt terug met een begeleide foutmelding. `genoffice help`
toont de huidige set commando's; de volledige referentie staat in
[packages/cli/README.md](../../packages/cli/README.md).

### Wat de agent daadwerkelijk uitvoert

Het zonnestelsel-deck in de demo hierboven kostte één prompt in Claude Code.
Daarachter volgde de agent de gefaseerde workflow van de skill en
controleerde de CLI elke fase voordat de volgende begon:

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

Binnen `genoffice` vindt geen enkele modelaanroep plaats: de agent doet het
denkwerk, de CLI het bouwen en controleren, en het resultaat opent in
GenOffice of PowerPoint als een gewone `.pptx`.

<a id="mcp-server"></a>

### MCP-server

Dezelfde commando's zijn ook beschikbaar als
[Model Context Protocol](https://modelcontextprotocol.io)-tools, voor
assistenten die geen terminal kunnen draaien of waaraan je liever geen
terminal geeft. Er zijn twee manieren om te verbinden, allebei getoond met
kant-en-klare snippets in **Instellingen → Integraties → MCP**:

| Manier                               | Wat het is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `genoffice mcp`** (aanbevolen) | Een stdio-server die de assistent zelf start; GenOffice hoeft niet open te staan. Eén tool per commando (`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`) plus de gefaseerde deck-flow `deck_start` → `deck_page` → `deck_build` → `deck_replace`. Ops, specs en Markdown worden inline doorgegeven, dus werkt ook een client zonder bestandssysteem. |
| **B · Lokale HTTP-server**           | Draait binnen de GenOffice-app op `http://127.0.0.1:3093/mcp` (Streamable HTTP, met legacy SSE). De tools ervan sturen een zichtbaar Word-editortabblad aan: `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session`, en je ziet het document vorm aannemen. Standaard uit; zet hem aan in hetzelfde instellingenscherm.                                                                                                                                         |

```bash
# Claude Code
claude mcp add --transport stdio genoffice -- genoffice mcp
```

```jsonc
// Cursor, Claude Desktop of een andere MCP-client
{ "mcpServers": { "genoffice": { "command": "genoffice", "args": ["mcp"] } } }
```

`genoffice` is hier de CLI die met de app wordt meegeleverd (op macOS
`/Applications/GenOffice.app/Contents/Resources/cli/genoffice`; het
instellingenscherm toont het exacte pad voor jouw installatie). De server
draagt zijn eigen workflow-instructies mee en stelt de op-referenties
beschikbaar als `genoffice://guide/*`-resources, dus is er geen skill
nodig; de skill en de MCP-server kunnen naast elkaar bestaan en de
assistent kiest er één. Cloudfuncties (`search`, `image`, `media`) lopen
nog steeds via de provider die in GenOffice is ingesteld; al het andere
draait lokaal, en `GENOFFICE_ALLOWED_ROOTS` beperkt elke tool tot de
mappen die je opgeeft.

Het deck over hernieuwbare energie uit de demo hierboven laat zien hoe één
prompt in Claude Code met alleen de `genoffice` MCP-server aangesloten er
aan de protocolkant uitziet:

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

Achtendertig aanroepen, ongeveer dertien minuten, en de assistent heeft
nooit een terminal aangeraakt: de figuren, de foto's, de gidsen, de
controles en de renders reisden allemaal als MCP-tool-resultaten. Alleen
`search` en `media` verlieten de machine, naar de provider die in
GenOffice is geconfigureerd.

<a id="download"></a>

## Download

| Platform                             | Vereisten                                               | Download                                                                                    |
| ------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **macOS** — Apple Silicon (arm64)    | macOS 11+                                               | [Nieuwste `.dmg` (arm64)](https://github.com/361533652/genoffice/releases/latest)         |
| **macOS** — Intel (x64)              | macOS 11+                                               | [Nieuwste `.dmg` (x64)](https://github.com/361533652/genoffice/releases/latest)           |
| **Windows** (x64, de meeste pc's)    | Windows 10+, Intel/AMD                                  | [Nieuwste `-x64.exe`-installer](https://github.com/361533652/genoffice/releases/latest)   |
| **Windows** op Arm (ARM64)           | Windows 11 op Arm (Snapdragon X en vergelijkbare chips) | [Nieuwste `-arm64.exe`-installer](https://github.com/361533652/genoffice/releases/latest) |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 of nieuwer)           | [Nieuwste `.deb`](https://github.com/361533652/genoffice/releases/latest)                 |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+)   | [Nieuwste `.rpm`](https://github.com/361533652/genoffice/releases/latest)                 |
| **Linux** — overige distributies     | x86_64, glibc 2.34+, FUSE 2                             | [Nieuwste `.AppImage`](https://github.com/361533652/genoffice/releases/latest)            |

Alle builds komen van `main`; de macOS- en Windows-installers zijn gesigneerd.
Oudere versies staan op de pagina [Releases](https://github.com/361533652/genoffice/releases).

<details>
<summary><b>Installeren op Linux</b></summary>

De deb installeer je met apt — dat haalt de afhankelijkheden op en voegt
GenOffice toe aan het toepassingenmenu:

```bash
sudo apt install ./genoffice_<version>_amd64.deb
```

Op Fedora, de RHEL-familie of openSUSE installeer je in plaats daarvan de rpm:

```bash
sudo dnf install ./genoffice-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./genoffice-<version>.x86_64.rpm  # openSUSE
```

De AppImage draait direct: installeer de FUSE 2-runtime
(`sudo apt install libfuse2`; op Ubuntu 24.04 heet het pakket `libfuse2t64`),
maak het bestand uitvoerbaar en start het:

```bash
chmod +x GenOffice-<version>.AppImage
./GenOffice-<version>.AppImage
```

Op een Chromebook draaien dezelfde pakketten in de Linux-omgeving (Crostini) — de details staan in [docs/platforms/chromeos.md](../platforms/chromeos.md).

</details>

## Hoe het werkt

Zeven Electron-apps — Docs, Sheets, Slides, PDF, Markdown, HTML en de shell
met tabbladen — delen één engine-laag van pure TypeScript-packages plus een
Rust-sidecar voor `.xlsx`. Het originele bestand is altijd de source of
truth: wijzigingen worden toegepast als gerichte patches, en alles wat de
editor niet heeft aangeraakt, komt ongewijzigd terug uit de rondgang.

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

De pakket-voor-pakket-rondleiding (docx/pptx-engines, `pdf2docx`,
`html2docx`, de agent-core en providers) vind je in
[CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages).

## Ontwikkeling

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

De sheets-app heeft daarnaast een Rust-toolchain nodig voor de xlsx-sidecar
(`cargo` op je PATH); `npm run build -w @genoffice/sheets` compileert die
automatisch. Zie [CONTRIBUTING.md](../../CONTRIBUTING.md) voor de checks die
elke wijziging moet doorstaan en hoe pull requests worden gemerged.

## Community

GenOffice wordt actief doorontwikkeld en jouw feedback bepaalt mee de
richting.

- **Meld een bug of vraag een functie aan** via
  [GitHub Issues](https://github.com/361533652/genoffice/issues).
- **Doe mee aan de GenOffice-groepschat** op
  [GenTeam](https://genoffice.ai/join) om met het team en andere gebruikers te
  praten.
- **Geef de repo een ster** als je iets aan GenOffice hebt — dat is de beste
  manier om het project te steunen.

## Veelgestelde vragen

<details>
<summary><b>Is GenOffice gratis?</b></summary>

Ja. GenOffice is gratis en open source onder de Apache-2.0-licentie — geen
proefperiode, geen betaalde laag voor de apps zelf.

</details>

<details>
<summary><b>Kan GenOffice bestanden van Microsoft Word, Excel en PowerPoint openen?</b></summary>

Ja. GenOffice opent en bewaart native `.docx`-, `.xlsx`- en `.pptx`-bestanden.
Opslaan is byte-behoudend: delen van het bestand die je niet hebt aangeraakt,
worden byte-voor-byte terugweggeschreven, zodat documenten gewoon blijven
werken in Microsoft Office.

</details>

<details>
<summary><b>Werkt GenOffice offline?</b></summary>

Documenten bewerken is volledig lokaal — bestanden verlaten je machine nooit
om te worden geopend, bewerkt, opgeslagen of geconverteerd. De AI-functies
(agents, search, beeldtools) hebben een netwerkverbinding nodig, met ofwel
een Genspark-login of je eigen model-API-key.

</details>

<details>
<summary><b>Kan GenOffice PDF-bestanden bewerken?</b></summary>

Ja — echte bewerking van PDF-tekst en -afbeeldingen, waarbij de content
stream van de pagina wordt herschreven met behoud van de originele fonts,
niet met overplaknotities.

</details>

<details>
<summary><b>Kan GenOffice PDF converteren naar Word, Excel of PowerPoint?</b></summary>

Ja — volledig on-device: tekenniveau-extractie met PDFium plus
geometrie-gebaseerde layout-analyse, geen cloudservice, geen upload. Gescande
pagina's worden ook ondersteund: op macOS en Windows leest de systeem-OCR ze,
zodat ze worden omgezet naar bewerkbare tekst in plaats van een
pagina-afbeelding.

</details>

<details>
<summary><b>Kan ik mijn eigen AI-model of API-key gebruiken?</b></summary>

Ja. Naast de keyless Genspark-login ondersteunt GenOffice je eigen key voor
Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok,
Mistral, OpenRouter, Requesty en OpenCode Zen/Go, plus elk OpenAI-compatibel endpoint —
inclusief lokale modelservers. Search, beeldgeneratie en analyse van beeld en
video gebruiken hun eigen keys onder Settings → AI Media & Search.

</details>

<details>
<summary><b>Kan ik het AI-paneel uitzetten?</b></summary>

Ja. Onder Settings → AI staat de schakelaar **Show the AI sidebar**. Zet hem
uit en elke editor verbergt de zijbalk; nieuwe documenten openen hem niet
meer automatisch. Een expliciete AI-actie — een knop in het lint, een
menu-item — opent het paneel nog steeds voor dat document, en na het sluiten
is hij weer verborgen.

</details>

<details>
<summary><b>Kan GenOffice HTML converteren naar Word?</b></summary>

Ja — Export as Word in de HTML-app levert volledig on-device een native,
bewerkbare `.docx` op. De pagina wordt gerenderd in de ingebouwde Chromium en
teruggebracht tot echte Word-structuren: koppen, alinea's, lijsten, tabellen,
kaarten, KPI-rijen, formuliervelden en paginaachtergronden; alleen visuals
zonder Word-equivalent (grafieken, iconen, gestileerde vakken) worden als
afbeelding ingevoegd.

</details>

<details>
<summary><b>Kan ik GenOffice aansturen vanuit Claude Code, Codex, Cursor of een script?</b></summary>

Ja. GenOffice installeert een `genoffice`-opdrachtregel die dezelfde engines
headless draait: documenten inspecteren, converteren, maken, lezen en
bewerken vanuit een terminal of een script, met `--json`-uitvoer voor
programma's. De meegeleverde agent-skill leert Claude Code, Codex, Cursor,
Gemini CLI, GitHub Copilot, OpenCode en Windsurf ermee werken; installeer hem
via **Instellingen → Integraties**. Zie
[Opdrachtregel en agent-skill](#command-line-and-agent-skill).

</details>

<details>
<summary><b>Verzamelt GenOffice gegevens?</b></summary>

De officiële, kant-en-klare builds versturen standaard beperkte
gebruiksanalyse, en je kunt rapportage op elk moment uitschakelen onder
Settings → General. Analytics verstuurt nooit documentinhoud, bestandsnamen,
bestandspaden, accountidentiteit of e-mailadressen. Zie
[GenOffice Privacy](../../PRIVACY.md) voor de volledige lijst van events en
gegevens die worden gedeeld.

</details>

## Beveiliging

Zie [SECURITY.md](../../SECURITY.md) voor de beveiligingsaanpak van de
processen (renderer-sandboxing, IPC-validatie, external-link gating) en de
dreigingsmodellen voor door AI gegenereerde content.

## Met dank aan

GenOffice zou niet mogelijk zijn zonder deze open-source projecten:

- [Electron](https://www.electronjs.org/) — de desktop-runtime voor elke app.
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — de
  spreadsheet-UI-kern waarop Sheets is gebouwd.
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause, gebundeld
  via [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer)) — de
  content-stream-engine achter echte bewerking van PDF-tekst en
  -afbeeldingen.
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) en
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — PDF-rendering en het
  samenstellen van documenten.
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  de blokeditors in Docs en Markdown.
- [CodeMirror](https://codemirror.net/) (MIT) — de broncode-editor in HTML.
- [Konva](https://konvajs.org/) — canvas-rendering voor Slides en
  Sheets-grafieken.
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) —
  text-shaping-metrieken voor complexe schriftsystemen.
- [calamine](https://github.com/tafia/calamine) en
  [IronCalc](https://github.com/ironcalc/IronCalc) — de read- en calc-laag
  van de Rust-xlsx-sidecar.
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — de MicroType
  Express-decoder voor ingesloten PowerPoint-lettertypen, overgezet naar
  TypeScript.
- [React](https://react.dev/) (MIT) — de UI-laag van elke app.
- [Mermaid](https://mermaid.js.org/) (MIT) en [KaTeX](https://katex.org/)
  (MIT) — diagrammen en wiskunde in Markdown en Docs.
- [opentype.js](https://opentype.js.org/) (MIT) — lettertype-parsing voor
  metrieken en glyph-opzoeking.
- [JSZip](https://stuk.github.io/jszip/) (MIT) en
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — de OOXML-container- en XML-laag.
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — de icoonset in de linten.
- [electron-updater](https://www.electron.build/) (MIT) — updates binnen
  de app.
- Liberation, Carlito, Caladea en Noto CJK-fonts (OFL/Apache-2.0) —
  meegeleverde documentfonts.

`npm run notices` genereert het gebundelde overzicht van licenties van derden
opnieuw (`tools/gen-third-party-notices.mjs`); alle runtime-dependencies zijn
MIT/Apache-2.0/BSD-3-Clause/OFL.

## Licentie

GenOffice wordt uitgebracht onder de [Apache License 2.0](../../LICENSE), met
één uitzondering: de map `ee/` is gereserveerd voor toekomstige
enterprise-modules en valt onder de
[GenOffice Enterprise License](../../ee/LICENSE).

De namen en logo's van GenOffice en Genspark zijn handelsmerken van Mainfunc,
Inc. De Apache-2.0-licentie geeft geen toestemming om deze te gebruiken (zie
sectie 6); forks moeten hun eigen branding gebruiken.
