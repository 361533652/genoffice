<p align="center">
  <a href="https://genoffice.ai/">
    <picture>
      <source srcset="../assets/readme/hero-dark.webp" media="(prefers-color-scheme: dark)">
      <img src="../assets/readme/hero.webp" alt="GenOffice — otwarty pakiet biurowy AI: Docs, Sheets, Slides, PDF, Markdown i HTML z wbudowanym panelem AI" width="100%">
    </picture>
  </a>
</p>

<h1 align="center">GenOffice</h1>

<p align="center"><b>Pierwszy na świecie w pełni funkcjonalny otwarty pakiet biurowy z AI.</b><br>
Pliki Word, Excel, PowerPoint i PDF, edytowane przez Ciebie i Twoją AI, zapisywane z powrotem w prawdziwych formatach.</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/361533652/genoffice" alt="Licencja: Apache-2.0"></a>
  <a href="https://github.com/361533652/genoffice/releases/latest"><img src="https://img.shields.io/github/v/release/361533652/genoffice" alt="Najnowsze wydanie"></a>
  <a href="https://github.com/361533652/genoffice/releases"><img src="https://img.shields.io/github/downloads/361533652/genoffice/total" alt="Liczba pobrań"></a>
  <a href="https://github.com/361533652/genoffice/stargazers"><img src="https://img.shields.io/github/stars/361533652/genoffice?style=flat" alt="Gwiazdki na GitHubie"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <b>Polski</b> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.tr.md">Türkçe</a></p>

<p align="center">
  <a href="#download"><b>Pobierz</b></a> ·
  <a href="#skills"><b>Skille</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://genoffice.ai/"><b>Strona internetowa</b></a> ·
  <a href="https://genoffice.ai/join"><b>Społeczność</b></a> ·
  <a href="../../PRIVACY.md"><b>Prywatność</b></a>
</p>

GenOffice to darmowa, otwarta alternatywa dla Microsoft Office na macOS,
Windows i Linux. Otwiera i zapisuje natywne pliki `.docx`, `.xlsx` i `.pptx`,
edytuje PDF, Markdown i HTML, a przy każdym dokumencie stawia agenta AI — nie
jest to czat dopięty z boku, lecz edytor, który czyta plik, wprowadza zmianę
i pokazuje precyzyjnie, czego dotknął. Pliki ODF (`.odt`, `.ods`, `.odp` oraz
szablony `.ott`/`.ots`/`.otp`) otwierają się jako edytowalne kopie OOXML;
import obsługuje tylko otwieranie — zapis zawsze odbywa się w OOXML, nigdy
w ODF.

- **Prawdziwe formaty, zachowane bit po bicie.** Przepisywane jest tylko to,
  co edytujesz. Cała pozostała treść pliku pozostaje nienaruszona bit po
  bicie, dzięki czemu dokumenty wciąż działają w Word, Excel i PowerPoint.
- **AI, którą możesz zweryfikować.** Zmiany trafiają jako śledzone zmiany
  i różnice z jednokrotnym przywróceniem. Arkusze kalkulacyjne dostają żywe
  formuły, a nie wklejone liczby. Prezentacje i strony są generowane na
  płótnie i pozostają w pełni edytowalne. Ukryj przed modelem zaznaczenie
  w Docs albo zakres komórek w Sheets, a AI zobaczy tylko nazwany
  placeholder; oryginalne słowa pozostają w pliku i wracają. Ukrywanie
  obejmuje AI tej aplikacji — CLI, narzędzia MCP i eksport headless czytają
  plik bezpośrednio i nadal widzą te słowa.
- **Lokalność jako zasada projektowa.** Pliki są otwierane, edytowane,
  zapisywane i konwertowane na Twoim urządzeniu. Konwersje PDF → Word / Excel
  / PowerPoint, Markdown → Word i HTML → Word działają lokalnie. Jedynie
  zapytania do AI opuszczają maszynę — i trafiają do dostawcy, którego sam
  wybierzesz.
- **Twoje klucze albo żadne.** Zaloguj się przez Genspark i pomiń klucze, albo
  użyj własnego klucza dla Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen,
  Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty lub dowolnego endpointu
  zgodnego z OpenAI, w tym lokalnych serwerów.
- **Skryptowalne i gotowe na agentów.** Aplikacja dostarcza wiersz poleceń
  `genoffice` oraz skill dla agentów Claude Code, Codex, Cursor, Gemini CLI,
  GitHub Copilot, OpenCode i Windsurf, dzięki czemu agent kodujący może
  tworzyć, konwertować, czytać i edytować prawdziwe pliki Office na Twoim
  komputerze bez otwierania okna.

**Pobierz:** [macOS](https://github.com/361533652/genoffice/releases/latest) (Apple Silicon i Intel) ·
[Windows](https://github.com/361533652/genoffice/releases/latest) (x64 i Arm) ·
[Linux](https://github.com/361533652/genoffice/releases/latest) (deb, rpm, AppImage) —
szczegóły i wymagania w sekcji [Pobierz](#download).

## Dlaczego GenOffice

- **Otwarty kod źródłowy**, Apache-2.0, tworzony w pełni otwarcie na GitHubie.
- **Twój do uruchomienia.** Natywne aplikacje na macOS, Windows i Linux; pliki
  zostają na Twoim dysku, a każda edycja, zapis i konwersja odbywają się na
  Twoim urządzeniu.
- **Prawdziwe pliki Office.** Natywne `.docx`, `.xlsx` i `.pptx`, z
  zachowaniem bit po bicie: nietknięte części pliku są kopiowane w
  niezmienionej formie.
- **AI, która edytuje sam dokument.** Śledzone zmiany w Docs, żywe formuły i
  wykresy w Sheets, prezentacje rysowane bezpośrednio na płótnie, każda tura
  AI to zapis, do którego można wrócić.
- **Twój model, Twój klucz.** Zaloguj się przez Genspark albo użyj własnego
  klucza do Claude, OpenAI, Gemini, DeepSeek i innych, z lokalnymi serwerami i
  każdym endpointem zgodnym z OpenAI włącznie.
- **PDF zrobiony właściwie.** Edytuj tekst wewnątrz strony i konwertuj PDF do
  Word, Excel lub PowerPoint lokalnie, z systemowym OCR dla skanów.
- **Także Markdown i HTML**, z tym samym panelem AI i lokalnym eksportem do
  Word.
- **Skille.** Gotowe skille albo własny `SKILL.md`, dołączane z menu **+** dowolnego panelu AI.
- **Skryptowalne.** Wiersz poleceń `genoffice`, skill dla agentów i serwer
  MCP oddają każdy silnik do dyspozycji Claude Code, Claude Desktop, Codex,
  Cursor i innych agentów — nadal lokalnie na urządzeniu.
- **Bezpłatne**, dla pojedynczych osób i zespołów.

## Wiersz poleceń i skill dla agentów

Wszystko, co aplikacje potrafią zrobić z plikiem, wiersz poleceń `genoffice`
potrafi zrobić z terminala: sprawdzać, konwertować, tworzyć, czytać i
edytować pliki Word, Excel, PowerPoint, PDF, Markdown i HTML na tych samych
silnikach, bez interfejsu graficznego. Instaluje się razem z GenOffice, nie
potrzebuje własnego środowiska uruchomieniowego i nigdy nie wysyła dokumentu
poza komputer. W połączeniu z dołączonym **skillem dla agentów** zamienia
agenta kodującego w pracownika biurowego, który tworzy prawdziwe pliki Office
zamiast markdownowych przybliżeń.

**Działa z:** Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode i Windsurf od razu po instalacji, z każdym innym agentem, który
czyta skille, a także, przez [serwer MCP](#mcp-server), z Claude Desktop i
każdym klientem MCP.

### Instalacja skilla

| Jak                                       | Co się dzieje                                                                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Ustawienia → Integracje** w aplikacji   | Wyświetla agentów znalezionych na tym komputerze; jedno kliknięcie zapisuje skill w każdym, którego wybierzesz. Gdy nowe wydanie GenOffice przynosi nowszy skill, pojawia się przycisk **Aktualizuj**. |
| **Pobierz jako zip** na tej samej stronie | Układ, który claude.ai, aplikacje desktopowe Claude i inni asystenci przyjmują jako przesłany skill.                                                                                                   |
| `npx skills add 361533652/genoffice`      | Instaluje z tego repozytorium w dowolnym agencie obsługującym skille.                                                                                                                                  |

Następnie zacznij nowy czat i poproś o dokument. Skill uczy agenta, kiedy
sięgać po `genoffice`, jak przeczytać plik przed jego edycją i jak sprawdzać
własną pracę.

### Szybki start z terminala

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

Każde polecenie wypisuje jednowierszowe podsumowanie albo — z `--json` —
pojedynczy obiekt JSON. Edycje są atomowe: odrzucona operacja pozostawia plik
nietknięty i wraca z pomocnym komunikatem błędu. `genoffice help` wypisuje
aktualny zestaw poleceń; pełna dokumentacja znajduje się w
[packages/cli/README.md](../../packages/cli/README.md).

### Co agent faktycznie uruchamia

Prezentacja o Układzie Słonecznym z dema powyżej wymagała jednego promptu w
Claude Code. W tle agent podążał za etapowym przepływem pracy ze skilla, a
CLI sprawdzało każdy etap, zanim zaczął się następny:

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

Wewnątrz `genoffice` nie dochodzi do żadnego wywołania modelu: agent myśli,
CLI buduje i sprawdza, a wynik otwiera się w GenOffice lub PowerPoint jako
zwyczajny plik `.pptx`.

<a id="mcp-server"></a>

### Serwer MCP

Te same polecenia są dostępne jako narzędzia
[Model Context Protocol](https://modelcontextprotocol.io), dla asystentów,
które nie mogą uruchomić terminala albo którym wolisz go nie dawać. Są dwa
sposoby połączenia, oba pokazane z gotowymi do skopiowania fragmentami w
**Ustawienia → Integracje → MCP**:

| Sposób                             | Co to jest                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `genoffice mcp`** (zalecane) | Serwer stdio, który asystent uruchamia sam; GenOffice nie musi być otwarte. Jedno narzędzie na polecenie (`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`) oraz etapowy przepływ prezentacji `deck_start` → `deck_page` → `deck_build` → `deck_replace`. Operacje, specyfikacje i Markdown są przekazywane inline, więc działa też klient bez systemu plików. |
| **B · Lokalny serwer HTTP**        | Działa wewnątrz aplikacji GenOffice pod adresem `http://127.0.0.1:3093/mcp` (Streamable HTTP, z przestarzałym SSE). Jego narzędzia sterują widoczną kartą edytora Word: `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session`, a Ty obserwujesz, jak dokument nabiera kształtu. Domyślnie wyłączony; włącz go w tym samym panelu ustawień.                                                                                                                             |

```bash
# Claude Code
claude mcp add --transport stdio genoffice -- genoffice mcp
```

```jsonc
// Cursor, Claude Desktop lub inny klient MCP
{ "mcpServers": { "genoffice": { "command": "genoffice", "args": ["mcp"] } } }
```

`genoffice` oznacza tu CLI dostarczane wewnątrz aplikacji (na macOS
`/Applications/GenOffice.app/Contents/Resources/cli/genoffice`; panel
ustawień wyświetla dokładną ścieżkę dla Twojej instalacji). Serwer niesie
własne instrukcje przepływu pracy i udostępnia odniesienia do operacji
jako zasoby `genoffice://guide/*`, więc żaden skill nie jest potrzebny;
skill i serwer MCP mogą współistnieć, a asystent wybiera jeden z nich.
Funkcje w chmurze (`search`, `image`, `media`) nadal przechodzą przez
dostawcę skonfigurowanego w GenOffice; wszystko inne działa lokalnie, a
`GENOFFICE_ALLOWED_ROOTS` ogranicza każde narzędzie do folderów, które
wskażesz.

Prezentacja o energii odnawialnej z dema powyżej pokazuje, jak od strony
protokołu wygląda jeden prompt w Claude Code z podłączonym tylko serwerem
MCP `genoffice`:

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

Trzydzieści osiem wywołań, około trzynastu minut, i asystent ani razu nie
dotknął terminala: ilustracje, zdjęcia, przewodniki, sprawdzenia i
renderowania podróżowały jako wyniki narzędzi MCP. Tylko `search` i
`media` opuściły maszynę, trafiając do dostawcy skonfigurowanego w
GenOffice.

<a id="download"></a>

## Pobierz

| Platforma                               | Wymagania                                             | Pobierz                                                                                     |
| --------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **macOS** — Apple Silicon (arm64)       | macOS 11+                                             | [Najnowszy plik `.dmg` (arm64)](https://github.com/361533652/genoffice/releases/latest)     |
| **macOS** — Intel (x64)                 | macOS 11+                                             | [Najnowszy plik `.dmg` (x64)](https://github.com/361533652/genoffice/releases/latest)       |
| **Windows** (x64, większość komputerów) | Windows 10+, Intel/AMD                                | [Najnowszy instalator `-x64.exe`](https://github.com/361533652/genoffice/releases/latest)   |
| **Windows** na Arm (ARM64)              | Windows 11 na Arm (Snapdragon X i podobne)            | [Najnowszy instalator `-arm64.exe`](https://github.com/361533652/genoffice/releases/latest) |
| **Linux** — Debian / Ubuntu             | x86_64, glibc 2.34+ (Ubuntu 22.04 lub nowszy)         | [Najnowszy plik `.deb`](https://github.com/361533652/genoffice/releases/latest)             |
| **Linux** — Fedora / RHEL / openSUSE    | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | [Najnowszy plik `.rpm`](https://github.com/361533652/genoffice/releases/latest)             |
| **Linux** — inne dystrybucje            | x86_64, glibc 2.34+, FUSE 2                           | [Najnowszy plik `.AppImage`](https://github.com/361533652/genoffice/releases/latest)        |

Wszystkie kompilacje pochodzą z `main`; instalatory na macOS i Windows są
podpisane. Starsze wersje znajdują się na stronie
[Releases](https://github.com/361533652/genoffice/releases).

<details>
<summary><b>Instalacja na Linuksie</b></summary>

Plik deb instaluje się przez apt — ściąga zależności i dodaje GenOffice do
menu aplikacji:

```bash
sudo apt install ./genoffice_<version>_amd64.deb
```

Na Fedorze / rodzinie RHEL / openSUSE zainstaluj pakiet rpm:

```bash
sudo dnf install ./genoffice-<version>.x86_64.rpm     # Fedora / rodzina RHEL
sudo zypper install ./genoffice-<version>.x86_64.rpm  # openSUSE
```

AppImage działa bez instalacji: zainstaluj środowisko FUSE 2
(`sudo apt install libfuse2`; na Ubuntu 24.04 pakiet nazywa się
`libfuse2t64`), nadaj plikowi prawo wykonywania, a potem go uruchom:

```bash
chmod +x GenOffice-<version>.AppImage
./GenOffice-<version>.AppImage
```

Na Chromebooku te same pakiety działają w środowisku Linux (Crostini) — szczegóły w [docs/platforms/chromeos.md](../platforms/chromeos.md).

</details>

## Jak to działa

Siedem aplikacji Electron — Docs, Sheets, Slides, PDF, Markdown, HTML i
powłoka z kartami — współdzieli jedną warstwę silnika złożoną z czystych
pakietów TypeScript oraz sidecara w Rust dla `.xlsx`. Oryginalny plik jest
zawsze jedynym źródłem prawdy: zmiany są nakładane jako wąskie łatki, a
wszystko, czego edytor nie dotknął, wraca bez zmian.

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

Przegląd poszczególnych pakietów (silniki docx/pptx, `pdf2docx`, `html2docx`,
jądro agenta i dostawcy) znajduje się w
[CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages).

## Rozwój

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

Aplikacja sheets dodatkowo wymaga zestawu narzędzi Rust dla swojego
sidecara xlsx (`cargo` w PATH); `npm run build -w @genoffice/sheets`
kompiluje go automatycznie. Zobacz [CONTRIBUTING.md](../../CONTRIBUTING.md),
aby poznać kontrole, które musi przejść każda zmiana, oraz sposób
scalania pull requestów.

## Społeczność

GenOffice jest w aktywnym rozwoju, a Twoja opinia go kształtuje.

- **Zgłoś błąd lub poproś o funkcję** w
  [GitHub Issues](https://github.com/361533652/genoffice/issues).
- **Przyłącz się do czatu grupowego GenOffice** na
  [GenTeam](https://genoffice.ai/join), aby rozmawiać z zespołem i innymi
  użytkownikami.
- **Oznacz repozytorium gwiazdką**, jeśli GenOffice jest dla Ciebie
  przydatne — to najlepszy sposób wsparcia projektu.

## FAQ

<details>
<summary><b>Czy GenOffice jest darmowe?</b></summary>

Tak. GenOffice jest darmowe i otwarte na licencji Apache-2.0 — bez okresu
próbnego, bez płatnego poziomu dla samych aplikacji.

</details>

<details>
<summary><b>Czy GenOffice może otwierać pliki Microsoft Word, Excel i PowerPoint?</b></summary>

Tak. GenOffice otwiera i zapisuje natywne pliki `.docx`, `.xlsx` i `.pptx`.
Zapis zachowuje treść bit po bicie: części pliku, których nie dotknięto, są
zapisywane z powrotem bez zmian, dzięki czemu dokumenty wciąż działają w
Microsoft Office.

</details>

<details>
<summary><b>Czy GenOffice działa offline?</b></summary>

Edycja dokumentów jest w pełni lokalna — pliki nigdy nie opuszczają Twojego
urządzenia, aby zostać otwarte, edytowane, zapisane lub przekonwertowane.
Funkcje AI (agenci, wyszukiwanie, narzędzia obrazu) wymagają połączenia
sieciowego, wraz z logowaniem przez Genspark albo własnym kluczem API
modelu.

</details>

<details>
<summary><b>Czy GenOffice może edytować pliki PDF?</b></summary>

Tak — to prawdziwa edycja tekstu i obrazów w PDF, która przepisuje strumień
treści strony z zachowaniem oryginalnych czcionek, a nie zasłania go
anotacjami.

</details>

<details>
<summary><b>Czy GenOffice może konwertować PDF do Word, Excel lub PowerPoint?</b></summary>

Tak — całkowicie lokalnie: ekstrakcja znaków na poziomie PDFium wraz z
analizą układu opartą na geometrii, bez usługi w chmurze, bez wysyłania
plików. Zeskanowane strony są również obsługiwane: na macOS i Windows
odczytuje je systemowe OCR, dzięki czemu są konwertowane do edytowalnego
tekstu, a nie obrazu strony.

</details>

<details>
<summary><b>Czy mogę użyć własnego modelu AI lub klucza API?</b></summary>

Tak. Oprócz bezkluczowego logowania przez Genspark, GenOffice wspiera
użycie własnego klucza dla Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM,
Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty i OpenCode Zen/Go, a także
dowolnego endpointu zgodnego z OpenAI — w tym lokalnych serwerów modeli.
Wyszukiwanie, generowanie obrazów oraz analiza obrazu i wideo mają własne
klucze w Ustawienia → AI Media & Search.

</details>

<details>
<summary><b>Czy mogę wyłączyć panel AI?</b></summary>

Tak. Ustawienia → AI zawierają przełącznik **Show the AI sidebar**. Po jego
wyłączeniu każdy edytor ukrywa panel boczny, a nowe dokumenty przestają
otwierać go same z siebie. Jawne działanie AI — przycisk wstążki albo pozycja
w menu — nadal otwiera panel dla tego dokumentu, a po jego zamknięciu panel
wraca do stanu ukrycia.

</details>

<details>
<summary><b>Czy GenOffice może konwertować HTML do Worda?</b></summary>

Tak — opcja Export as Word w aplikacji HTML tworzy natywny, edytowalny plik
`.docx` całkowicie lokalnie. Strona jest renderowana we wbudowanym Chromium
i redukowana do prawdziwych struktur Worda: nagłówków, akapitów, list,
tabel, kart, wierszy KPI, pól formularzy i tła stron; jedynie elementy
wizualne bez odpowiednika w Wordzie (wykresy, ikony, ozdobne pola) są
osadzane jako obrazy.

</details>

<details>
<summary><b>Czy mogę sterować GenOffice z narzędzi Claude Code, Codex, Cursor albo ze skryptu?</b></summary>

Tak. GenOffice instaluje wiersz poleceń `genoffice`, który uruchamia te same
silniki bez interfejsu graficznego: sprawdzaj, konwertuj, twórz, czytaj i
edytuj dokumenty z terminala lub skryptu, z wyjściem `--json` dla programów.
Dołączony skill dla agentów uczy Claude Code, Codex, Cursor, Gemini CLI,
GitHub Copilot, OpenCode i Windsurf, jak z niego korzystać; zainstaluj go w
**Ustawienia → Integracje**. Zobacz
[Wiersz poleceń i skill dla agentów](#command-line-and-agent-skill).

</details>

<details>
<summary><b>Czy GenOffice zbiera jakieś dane?</b></summary>

Oficjalne pakowane wersje domyślnie wysyłają ograniczoną telemetrię
użytkowania, a raportowanie można wyłączyć w każdej chwili w Ustawienia →
Ogólne. Telemetria nigdy nie wysyła treści dokumentów, nazw plików, ścieżek
plików, tożsamości konta ani adresów e-mail. Zobacz
[GenOffice Privacy](../../PRIVACY.md), aby poznać pełny wykaz zdarzeń i
ujawnianych danych.

</details>

## Bezpieczeństwo

Zobacz [SECURITY.md](../../SECURITY.md), aby poznać podejście do
bezpieczeństwa procesu (sandboxing renderera, walidacja IPC, ograniczanie
linków zewnętrznych) oraz modele zagrożeń dla treści generowanych przez AI.

## Podziękowania

GenOffice nie byłoby możliwe bez tych projektów open source:

- [Electron](https://www.electronjs.org/) — środowisko desktopowe dla każdej
  aplikacji.
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — jądro
  interfejsu arkusza kalkulacyjnego, które rozwija Sheets.
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause,
  dołączane przez
  [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer)) —
  silnik strumienia treści stojący za prawdziwą edycją tekstu i obrazów w
  PDF.
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) i
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — renderowanie PDF i
  składanie dokumentów.
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  edytory blokowe w Docs i Markdown.
- [CodeMirror](https://codemirror.net/) (MIT) — edytor źródła w HTML.
- [Konva](https://konvajs.org/) — renderowanie canvas dla Slides i wykresów
  Sheets.
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — metryki
  składu tekstu dla złożonych systemów pisma.
- [calamine](https://github.com/tafia/calamine) i
  [IronCalc](https://github.com/ironcalc/IronCalc) — warstwy odczytu i
  obliczeń sidecara xlsx w Rust.
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — dekoder
  MicroType Express dla osadzonych czcionek PowerPoint, przeniesiony na
  TypeScript.
- [React](https://react.dev/) (MIT) — warstwa interfejsu użytkownika
  każdej aplikacji.
- [Mermaid](https://mermaid.js.org/) (MIT) i [KaTeX](https://katex.org/)
  (MIT) — diagramy i matematyka w Markdown i Docs.
- [opentype.js](https://opentype.js.org/) (MIT) — parsowanie czcionek do
  metryk i wyszukiwania glifów.
- [JSZip](https://stuk.github.io/jszip/) (MIT) i
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — warstwy kontenera OOXML i XML.
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — zestaw ikon używany na wstążkach.
- [electron-updater](https://www.electron.build/) (MIT) — aktualizacje w
  aplikacji.
- Czcionki Liberation, Carlito, Caladea i Noto CJK (OFL/Apache-2.0) —
  dołączone czcionki dokumentów.

`npm run notices` regeneruje dołączone podsumowanie licencji stron trzecich
(`tools/gen-third-party-notices.mjs`); wszystkie zależności środowiska
wykonawczego są na licencjach MIT/Apache-2.0/BSD-3-Clause/OFL.

## Licencja

GenOffice jest licencjonowane na warunkach [Apache License 2.0](../../LICENSE), z
jednym wyjątkiem: katalog `ee/` jest zarezerwowany dla przyszłych modułów
enterprise i jest objęty [GenOffice Enterprise License](../../ee/LICENSE).

Nazwy i logo GenOffice oraz Genspark są znakami towarowymi Mainfunc, Inc.
Licencja Apache-2.0 nie daje prawa do ich używania (patrz sekcja 6); forki
powinny korzystać z własnej marki.
