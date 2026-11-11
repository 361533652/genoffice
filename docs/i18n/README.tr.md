<p align="center">
  <a href="https://genoffice.ai/">
    <picture>
      <source srcset="../assets/readme/hero-dark.webp" media="(prefers-color-scheme: dark)">
      <img src="../assets/readme/hero.webp" alt="GenOffice — açık kaynaklı yapay zekâ Office paketi: yerleşik yapay zekâ paneliyle Docs, Sheets, Slides, PDF, Markdown ve HTML" width="100%">
    </picture>
  </a>
</p>

<h1 align="center">GenOffice</h1>

<p align="center"><b>Dünyanın ilk tam özellikli açık kaynaklı yapay zekâ Office paketi.</b><br>
Word, Excel, PowerPoint ve PDF dosyaları; siz ve yapay zekânız tarafından düzenlenir, gerçek biçimlerinde geri kaydedilir.</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/361533652/genoffice" alt="Lisans: Apache-2.0"></a>
  <a href="https://github.com/361533652/genoffice/releases/latest"><img src="https://img.shields.io/github/v/release/361533652/genoffice" alt="Son sürüm"></a>
  <a href="https://github.com/361533652/genoffice/releases"><img src="https://img.shields.io/github/downloads/361533652/genoffice/total" alt="İndirmeler"></a>
  <a href="https://github.com/361533652/genoffice/stargazers"><img src="https://img.shields.io/github/stars/361533652/genoffice?style=flat" alt="GitHub yıldızları"></a>
  <a href="https://x.com/merrickbuilds"><img src="https://img.shields.io/badge/follow-%40merrickbuilds-000000?logo=x&logoColor=white" alt="X'te @merrickbuilds'i takip edin"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a> · <b>Türkçe</b></p><!-- lang-switcher · public-hygiene: allow -->

<p align="center">
  <a href="#download"><b>İndir</b></a> ·
  <a href="#skills"><b>Skills</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://genoffice.ai/"><b>Web sitesi</b></a> ·
  <a href="https://genoffice.ai/join"><b>Topluluk</b></a> ·
  <a href="https://x.com/merrickbuilds"><b>X</b></a> ·
  <a href="../../PRIVACY.md"><b>Gizlilik</b></a>
</p>

GenOffice; macOS, Windows ve Linux için ücretsiz, açık kaynaklı bir Microsoft
Office alternatifidir. Yerel `.docx`, `.xlsx` ve `.pptx` dosyalarını açar ve
kaydeder, PDF, Markdown ve HTML düzenler ve her belgenin yanına bir yapay zekâ
ajanı koyar — kenara iliştirilmiş bir sohbet kutusu değil, dosyayı okuyan,
değişikliği yapan ve tam olarak neye dokunduğunu size gösteren bir düzenleyici.
ODF dosyaları (`.odt`, `.ods`, `.odp` ve `.ott`/`.ots`/`.otp` şablonları)
düzenlenebilir OOXML kopyaları olarak açılır; içe aktarma yalnızca açma
yönündedir — kaydetme her zaman OOXML yazar, asla ODF yazmaz.

- **Gerçek biçimler, bayt bayt korunur.** Yalnızca düzenlediğiniz kısım yeniden
  yazılır. Dosyadaki diğer her şey bayt bayt korunur; böylece belgeler Word,
  Excel ve PowerPoint'te çalışmaya devam eder.
- **Gözden geçirebileceğiniz bir yapay zekâ.** Düzenlemeler, tek tıkla geri
  alınabilen değişiklik izleme ve fark görünümleri olarak gelir. Elektronik
  tablolar yapıştırılmış sayılar değil, canlı formüller alır. Sunumlar ve
  sayfalar doğrudan tuvale üretilir ve tamamen düzenlenebilir kalır. Bir Docs
  seçimini veya bir Sheets hücre aralığını modelden gizleyin; yapay zekâ
  yalnızca adlandırılmış bir yer tutucu görür, özgün sözcükler dosyada kalır ve
  geri gelir. Gizleme bu uygulamanın yapay zekâsını kapsar — CLI, MCP araçları
  ve başsız dışa aktarma dosyayı doğrudan okur ve bu sözcükleri görmeye devam
  eder.
- **Tasarımı gereği yerel.** Dosyalar makinenizde açılır, düzenlenir,
  kaydedilir ve dönüştürülür. PDF → Word / Excel / PowerPoint, Markdown → Word
  ve HTML → Word dönüşümlerinin tamamı cihaz üzerinde çalışır. Makineden
  yalnızca yapay zekâ çağrıları, seçtiğiniz sağlayıcıya gider.
- **Dosyaları söyledikleriyle bulun.** Ana ekran; `.docx`, `.xlsx`, `.pptx`,
  PDF, Markdown ve HTML dosyalarınızın adlarını, klasörlerini ve tam metnini,
  CJK dahil, yerel bir SQLite dizininden arar. İsteğe bağlı olarak en iyi
  sonuçlar, System One yargı modeli **[TypeSafe Jev](https://typesafe.ai/)**
  tarafından yeniden sıralanır; böylece sorunuzu yanıtlayan dosya en üste
  gelir.
- **Dosyalarınıza sorun, kaynaklarıyla.** Bir belge kümesine yıldız ekleyin;
  ana ekrandaki **Ask AI** soruları bu belgeler üzerinden yanıtlar ve her
  iddianın arkasındaki dosyayı kaynak gösterir, böylece açıp kontrol
  edebilirsiniz.
- **Kendi anahtarlarınız ya da hiç anahtar yok.** Genspark ile oturum açıp
  anahtar işini atlayın ya da Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM,
  Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty, Opper, Cheaper
  Inference, Atlas Cloud veya yerel sunucular dahil herhangi bir OpenAI uyumlu
  uç nokta için kendi anahtarınızı getirin.
- **Betiklenebilir ve ajanlara hazır.** Uygulama bir `genoffice` komut satırı
  ve Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode ve
  Windsurf için bir skill ile gelir; böylece bir kodlama ajanı, hiçbir pencere
  açmadan makinenizde gerçek Office dosyaları oluşturabilir, dönüştürebilir,
  okuyabilir ve düzenleyebilir.

**Edinin:** [macOS](https://github.com/361533652/genoffice/releases/latest) (Apple Silicon ve Intel) ·
[Windows](https://github.com/361533652/genoffice/releases/latest) (x64 ve Arm) ·
[Linux](https://github.com/361533652/genoffice/releases/latest) (deb, rpm, AppImage) —
ayrıntılar ve gereksinimler [İndir](#download) bölümünde.

## Neden GenOffice

- **Açık kaynak**, Apache-2.0, GitHub'da açıkta geliştiriliyor.
- **Sizin çalıştırdığınız.** macOS, Windows ve Linux için yerel uygulamalar;
  dosyalar diskinizde kalır ve her düzenleme, kaydetme ve dönüştürme
  makinenizde gerçekleşir.
- **Gerçek Office dosyaları.** Yerel `.docx`, `.xlsx` ve `.pptx`, bayt bayt
  korunur: dosyanın dokunmadığınız kısımları olduğu gibi kopyalanır.
- **Belgenin kendisini düzenleyen bir yapay zekâ.** Docs'ta izlenen
  değişiklikler, Sheets'te canlı formüller ve grafikler, tuvale çizilen
  slaytlar; her yapay zekâ turu geri alabileceğiniz bir anlık görüntü.
- **Sizin modeliniz, sizin anahtarınız.** Genspark ile oturum açın ya da
  Claude, OpenAI, Gemini, DeepSeek ve daha fazlası için bir anahtar getirin;
  yerel sunucular ve her OpenAI uyumlu uç nokta dahil.
- **Doğru dürüst PDF.** Sayfanın içinde metin düzenleyin ve PDF'yi cihaz
  üzerinde, taramalar için sistem OCR'ıyla Word, Excel ya da PowerPoint'e
  dönüştürün.
- **Markdown ve HTML de**, aynı yapay zekâ paneli ve Word'e yerel dışa aktarma
  ile.
- **Anahtar sözcüğü değil, yanıtı bulan arama.** Klasörlerinizdeki her belge
  üzerinde, cihazda dizinlenmiş tam metin araması; System One yargı modeli
  TypeSafe Jev ile isteğe bağlı yeniden sıralama.
- **Dosyalarınız arasında Ask AI.** Önemli dosyalara yıldız ekleyin ve doğal
  dille soru sorun; her yanıt geldiği dosyayı, tek tık uzağınızda kaynak
  gösterir.
- **Skills.** Hazır skill'ler ya da kendi `SKILL.md` dosyanız, herhangi bir
  yapay zekâ panelinin **+** menüsünden eklenir.
- **Betiklenebilir.** Bir `genoffice` komut satırı, bir ajan skill'i ve bir
  MCP sunucusu, her motoru Claude Code, Claude Desktop, Codex, Cursor ve diğer
  ajanların hizmetine, yine cihaz üzerinde sunar.
- **Ücretsiz**, bireyler ve ekipler için aynı şekilde.

## Komut satırı ve ajan skill'i

Uygulamaların bir dosyaya yapabildiği her şeyi `genoffice` komut satırı bir
terminalden yapabilir: Word, Excel, PowerPoint, PDF, Markdown ve HTML'yi aynı
motorlar üzerinde, başsız olarak inceleyin, dönüştürün, oluşturun, okuyun ve
düzenleyin. GenOffice ile birlikte kurulur, kendi çalışma zamanına ihtiyaç
duymaz ve hiçbir belgeyi hiçbir yere göndermez. Birlikte gelen **ajan
skill'i** ile eşleştirildiğinde, bir kodlama ajanını Markdown yaklaşımları
yerine gerçek Office dosyaları üreten bir belge çalışanına dönüştürür.

**Uyumlu olduğu araçlar:** kutudan çıktığı hâliyle Claude Code, Codex, Cursor,
Gemini CLI, GitHub Copilot, OpenCode ve Windsurf; skill okuyan diğer tüm
ajanlar ve [MCP sunucusu](#mcp-server) üzerinden Claude Desktop ile her MCP
istemcisi.

### Skill'i kurun

| Nasıl                                 | Ne olur                                                                                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uygulamada **Ayarlar → Integrations** | Bu bilgisayarda bulunan ajanları listeler; tek tık skill'i seçtiğiniz her birine yazar. Bir GenOffice sürümü daha yeni bir skill getirdiğinde bir **Update** düğmesi belirir. |
| Aynı sayfadaki **Download as zip**    | claude.ai, Claude masaüstü uygulamaları ve diğer asistanların yüklenen skill olarak kabul ettiği düzen.                                                                       |
| `npx skills add 361533652/genoffice`  | Bu depodan skill uyumlu herhangi bir ajana kurar.                                                                                                                             |

Ardından yeni bir sohbet başlatın ve bir belge isteyin. Skill, ajana ne zaman
`genoffice`'e başvuracağını, bir dosyayı düzenlemeden önce nasıl okuyacağını
ve kendi işini nasıl kontrol edeceğini öğretir.

### Terminalden hızlı başlangıç

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

Her komut tek satırlık bir özet ya da `--json` ile tek bir JSON nesnesi
yazdırır. Düzenlemeler atomiktir: reddedilen bir op dosyayı olduğu gibi bırakır
ve yol gösterici bir hatayla geri döner. `genoffice help` güncel komut
yüzeyini listeler; tam başvuru
[packages/cli/README.md](../../packages/cli/README.md) dosyasındadır.

### Ajanın gerçekte çalıştırdıkları

[Demo](#demo) bölümündeki Güneş Sistemi sunumu Claude Code'da tek bir istem
aldı. Arkasında ajan, skill'in aşamalı iş akışını izledi ve CLI, bir sonraki
başlamadan önce her aşamayı kontrol etti:

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

`genoffice` içinde hiçbir model çağrısı yapılmaz: düşünmeyi ajan yapar,
oluşturmayı ve kontrolü CLI yapar ve sonuç GenOffice'te ya da PowerPoint'te
sıradan bir `.pptx` olarak açılır.

### MCP sunucusu

Aynı komutlar, terminal çalıştıramayan ya da terminal vermeyi tercih
etmediğiniz asistanlar için [Model Context Protocol](https://modelcontextprotocol.io)
araçları olarak da sunulur. İki giriş yolu vardır; ikisi de **Ayarlar →
Integrations → MCP** altında kopyalamaya hazır parçacıklarla gösterilir:

| Yol                                | Nedir                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `genoffice mcp`** (önerilen) | Asistanın kendisinin başlattığı bir stdio sunucusu; GenOffice'in açık olması gerekmez. Komut başına bir araç (`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`) ve aşamalı sunum akışı `deck_start` → `deck_page` → `deck_build` → `deck_replace`. Op'lar, spesifikasyonlar ve Markdown satır içi aktarılır; böylece dosya sistemi olmayan bir istemci de çalışır. |
| **B · Yerel HTTP sunucusu**        | GenOffice uygulamasının içinde `http://127.0.0.1:3093/mcp` adresinde çalışır (Streamable HTTP, eski SSE ile). Araçları görünür bir Word düzenleyici sekmesini yönetir: `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session`; belgenin şekillenmesini izlersiniz. Varsayılan olarak kapalıdır; aynı ayarlar bölmesinden açın.                                                                                                                                              |
| **C · `genoffice mcp --http`**     | Stdio araç seti, başka makinelerdeki istemciler için bir Streamable HTTP sunucusu olarak: bir konteyner, bir sandbox, ağınızdaki paylaşılan bir makine. Dosyalar çağrılarla birlikte yolculuk eder: `PUT /files/<name>` bir dosya yükler ve bir URL döndürür, her `file` parametresi bir http(s) URL'si alır ve dosya yazan bir araç onu bir indirme URL'si olarak, küçükse ayrıca baytları bir MCP kaynağı olarak geri verir. `--host 0.0.0.0` onu ağa açar, `--token` korur.                                          |

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

HTTP üzerinden her oturum özel bir çalışma klasörü alır, göreli yollar ve
sunum klasörleri bunun içinde çözümlenir, `open` sunulmaz ve
`GENOFFICE_ALLOWED_ROOTS` ayarlanmamışken araçlar sunucunun kendi dosya
deposunun dışına çıkamaz. `render`, PDF'ye `convert` ve `create_pdf` yine de
gizli bir GenOffice süreci başlatır; bu yüzden başsız bir ana makinede
uygulamanın kurulu olması ve bir sanal ekran (`xvfb-run`) gerekir.

Buradaki `genoffice`, uygulamanın içinde gelen CLI'dir (macOS'te
`/Applications/GenOffice.app/Contents/Resources/cli/genoffice`; ayarlar
bölmesi kurulumunuz için tam yolu yazdırır). Sunucu kendi iş akışı
talimatlarını taşır ve op başvurularını `genoffice://guide/*` kaynakları
olarak sunar; bu yüzden skill gerekmez. Skill ve MCP sunucusu bir arada
bulunabilir, asistan birini seçer. Bulut özellikleri (`search`, `image`,
`media`) yine GenOffice'te yapılandırılan sağlayıcı üzerinden gider; geri
kalan her şey yerel çalışır ve `GENOFFICE_ALLOWED_ROOTS` her aracı
listelediğiniz klasörlerle sınırlar.

[Demo](#demo) bölümündeki yenilenebilir enerji sunumu, Claude Code'da yalnızca
`genoffice` MCP sunucusu bağlıyken tek bir istemin protokol tarafından nasıl
göründüğüdür:

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

Otuz sekiz çağrı, yaklaşık on üç dakika ve asistan hiç kabuğa dokunmadı:
rakamlar, fotoğraflar, kılavuzlar, kontroller ve işlenmiş görüntülerin tamamı
MCP araç sonuçları olarak yolculuk etti. Makineden yalnızca `search` ve
`media`, GenOffice'te yapılandırılan sağlayıcıya gitti.

## İndir

| Platform                             | Gereksinimler                                         | İndirme                                                                              |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **macOS** — Apple Silicon (arm64)    | macOS 11+                                             | [Son `.dmg` (arm64)](https://github.com/361533652/genoffice/releases/latest)         |
| **macOS** — Intel (x64)              | macOS 11+                                             | [Son `.dmg` (x64)](https://github.com/361533652/genoffice/releases/latest)           |
| **Windows** (x64, çoğu PC)           | Windows 10+, Intel/AMD                                | [Son `-x64.exe` yükleyici](https://github.com/361533652/genoffice/releases/latest)   |
| **Windows** Arm üzerinde (ARM64)     | Arm üzerinde Windows 11 (Snapdragon X ve benzerleri)  | [Son `-arm64.exe` yükleyici](https://github.com/361533652/genoffice/releases/latest) |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 veya daha yeni)     | [Son `.deb`](https://github.com/361533652/genoffice/releases/latest)                 |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | [Son `.rpm`](https://github.com/361533652/genoffice/releases/latest)                 |
| **Linux** — diğer dağıtımlar         | x86_64, glibc 2.34+, FUSE 2                           | [Son `.AppImage`](https://github.com/361533652/genoffice/releases/latest)            |

Tüm derlemeler `main` dalından gelir; macOS ve Windows yükleyicileri imzalıdır.
Eski sürümler [Releases](https://github.com/361533652/genoffice/releases) sayfasındadır.

<details>
<summary><b>Linux'a kurulum</b></summary>

Deb paketi apt ile kurulur — bağımlılıkları çeker ve GenOffice'i uygulama
menüsüne ekler:

```bash
sudo apt install ./genoffice_<version>_amd64.deb
```

Fedora / RHEL ailesi / openSUSE üzerinde bunun yerine rpm'i kurun:

```bash
sudo dnf install ./genoffice-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./genoffice-<version>.x86_64.rpm  # openSUSE
```

AppImage olduğu yerde çalışır: FUSE 2 çalışma zamanını kurun
(`sudo apt install libfuse2`; Ubuntu 24.04'te paket `libfuse2t64`), dosyayı
çalıştırılabilir yapın, ardından çalıştırın:

```bash
chmod +x GenOffice-<version>.AppImage
./GenOffice-<version>.AppImage
```

Bir Chromebook’ta aynı paketler Linux ortamında (Crostini) çalışır — ayrıntılar için [docs/platforms/chromeos.md](../platforms/chromeos.md).

</details>

## Nasıl çalışır

Yedi Electron uygulaması — Docs, Sheets, Slides, PDF, Markdown, HTML ve sekmeli
kabuk — saf TypeScript paketlerinden oluşan tek bir motor katmanını ve `.xlsx`
için bir Rust yardımcı sürecini paylaşır. Özgün dosya her zaman tek doğru
kaynaktır: düzenlemeler dar yamalar olarak uygulanır ve düzenleyicinin
dokunmadığı her şey gidiş dönüşten dokunulmadan çıkar.

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

Paket paket tur (docx/pptx motorları, `pdf2docx`, `html2docx`, ajan çekirdeği
ve sağlayıcılar) [CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages)
dosyasındadır.

## Geliştirme

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

Sheets uygulaması xlsx yardımcı süreci için ayrıca bir Rust araç zincirine
(PATH üzerinde `cargo`) ihtiyaç duyar; `npm run build -w @genoffice/sheets`
bunu otomatik derler. Her değişikliğin geçmesi gereken kontroller ve çekme
isteklerinin nasıl birleştirildiği için [CONTRIBUTING.md](../../CONTRIBUTING.md)
dosyasına bakın.

## Topluluk

GenOffice etkin geliştirme aşamasındadır ve geri bildiriminiz onu şekillendirir.

- **Hata bildirin ya da özellik isteyin:**
  [GitHub Issues](https://github.com/361533652/genoffice/issues).
- **GenOffice grup sohbetine katılın:** ekiple ve diğer kullanıcılarla konuşmak
  için [GenTeam](https://genoffice.ai/join).
- **X'te [@merrickbuilds](https://x.com/merrickbuilds) hesabını takip edin:**
  sürüm notları, demolar ve sırada ne olduğu için.
- **Depoya yıldız verin:** GenOffice size yararlıysa, projeyi desteklemenin en
  iyi yolu budur.

## SSS

<details>
<summary><b>GenOffice ücretsiz mi?</b></summary>

Evet. GenOffice, Apache-2.0 lisansı altında ücretsiz ve açık kaynaklıdır —
deneme süresi yok, uygulamaların kendisi için ücretli katman yok.

</details>

<details>
<summary><b>GenOffice, Microsoft Word, Excel ve PowerPoint dosyalarını açabilir mi?</b></summary>

Evet. GenOffice yerel `.docx`, `.xlsx` ve `.pptx` dosyalarını açar ve kaydeder.
Kaydetme bayt bayt korur: dosyanın dokunmadığınız kısımları bayt bayt geri
yazılır; böylece belgeler Microsoft Office'te çalışmaya devam eder.

</details>

<details>
<summary><b>GenOffice çevrimdışı çalışır mı?</b></summary>

Belge düzenleme tamamen yereldir — dosyalar açılmak, düzenlenmek, kaydedilmek
ya da dönüştürülmek için makinenizden asla çıkmaz. Yapay zekâ özellikleri
(ajanlar, arama, görsel araçları) bir ağ bağlantısı ve ya Genspark oturumu ya
da kendi model API anahtarınızı gerektirir.

</details>

<details>
<summary><b>GenOffice PDF dosyalarını düzenleyebilir mi?</b></summary>

Evet — üstünü örten açıklama notları değil, sayfa içerik akışını özgün yazı
tiplerini koruyarak yeniden yazan gerçek PDF metin ve görsel düzenleme.

</details>

<details>
<summary><b>GenOffice PDF'yi Word, Excel ya da PowerPoint'e dönüştürebilir mi?</b></summary>

Evet — tamamen cihaz üzerinde: PDFium karakter düzeyinde çıkarma ve geometri
tabanlı düzen analizi; bulut hizmeti yok, yükleme yok. Taranmış sayfalar da
kapsanır: macOS ve Windows'ta sistem OCR'ı onları okur; böylece bir sayfa
görüntüsü yerine düzenlenebilir metne dönüşürler.

</details>

<details>
<summary><b>Kendi yapay zekâ modelimi ya da API anahtarımı kullanabilir miyim?</b></summary>

Evet. Anahtarsız Genspark oturumunun yanı sıra GenOffice; Claude, OpenAI,
Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter,
Requesty, Opper, Cheaper Inference, Atlas Cloud ve OpenCode Zen/Go için kendi
anahtarınızı getirmeyi, ayrıca yerel model sunucuları dahil herhangi bir
OpenAI uyumlu uç noktayı destekler. Arama, görsel üretimi ve görsel/video
analizi, Ayarlar → AI Media & Search altında kendi anahtarlarını alır.

</details>

<details>
<summary><b>Yapay zekâ panelini kapatabilir miyim?</b></summary>

Evet. Ayarlar → AI altında bir **Show the AI sidebar** anahtarı vardır.
Kapalıyken her düzenleyici kenar çubuğunu gizler; yeni belgeler onu kendi
başına açmayı bırakır. Açık bir yapay zekâ eylemi — bir şerit düğmesi, bir menü
öğesi — paneli o belge için yine açar ve kapatıldığında gizli duruma döner.

</details>

<details>
<summary><b>GenOffice HTML'yi Word'e dönüştürebilir mi?</b></summary>

Evet — HTML uygulamasındaki Export as Word, tamamen cihaz üzerinde yerel,
düzenlenebilir bir `.docx` üretir. Sayfa yerleşik Chromium'da işlenir ve
gerçek Word yapılarına indirgenir: başlıklar, paragraflar, listeler, tablolar,
kartlar, KPI satırları, form alanları ve sayfa arka planları; yalnızca Word
karşılığı olmayan görseller (grafikler, simgeler, süslü kutular) resim olarak
gömülür.

</details>

<details>
<summary><b>GenOffice'i Claude Code, Codex, Cursor ya da bir betikten yönetebilir miyim?</b></summary>

Evet. GenOffice, aynı motorları başsız çalıştıran bir `genoffice` komut satırı
kurar: belgeleri bir terminalden ya da betikten inceleyin, dönüştürün,
oluşturun, okuyun ve düzenleyin; programlar için `--json` çıktısıyla. Birlikte
gelen ajan skill'i Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode ve Windsurf'e onu kullanmayı öğretir; **Ayarlar → Integrations**
üzerinden kurun. Bkz. [Komut satırı ve ajan skill'i](#command-line-and-agent-skill).

</details>

<details>
<summary><b>GenOffice herhangi bir veri topluyor mu?</b></summary>

Resmî paketlenmiş derlemeler varsayılan olarak sınırlı kullanım analitiği
gönderir ve raporlamayı Ayarlar → General altında istediğiniz zaman
kapatabilirsiniz. Analitik asla belge içeriği, dosya adları, dosya yolları,
hesap kimliği ya da e-posta adresi göndermez. Olay ve veri açıklamalarının
tamamı için [GenOffice Gizlilik](../../PRIVACY.md) sayfasına bakın.

</details>

## Güvenlik

Süreç güvenliği duruşu (işleyici sandbox'ı, IPC doğrulaması, dış bağlantı
denetimi) ve yapay zekâ tarafından üretilen içerik için tehdit modelleri için
[SECURITY.md](../../SECURITY.md) dosyasına bakın.

## Teşekkürler

GenOffice, şu açık kaynak projeler olmadan mümkün olmazdı:

- [Electron](https://www.electronjs.org/) — her uygulamanın masaüstü çalışma
  zamanı.
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — Sheets'in
  genişlettiği elektronik tablo arayüz çekirdeği.
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause,
  [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer) üzerinden
  paketlenmiş) — gerçek PDF metin ve görsel düzenlemenin arkasındaki içerik
  akışı motoru.
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) ve
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — PDF işleme ve belge
  birleştirme.
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  Docs ve Markdown'daki blok düzenleyiciler.
- [CodeMirror](https://codemirror.net/) (MIT) — HTML'deki kaynak düzenleyici.
- [Konva](https://konvajs.org/) — Slides ve Sheets grafikleri için tuval
  işleme.
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — karmaşık yazı
  sistemleri için metin şekillendirme ölçüleri.
- [calamine](https://github.com/tafia/calamine) ve
  [IronCalc](https://github.com/ironcalc/IronCalc) — Rust xlsx yardımcı
  sürecinin okuma ve hesaplama katmanları.
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — gömülü PowerPoint
  yazı tipleri için TypeScript'e taşınmış MicroType Express çözücüsü.
- [React](https://react.dev/) (MIT) — her uygulamanın arayüz katmanı.
- [Mermaid](https://mermaid.js.org/) (MIT) ve [KaTeX](https://katex.org/)
  (MIT) — Markdown ve Docs'ta diyagramlar ve matematik.
- [opentype.js](https://opentype.js.org/) (MIT) — ölçüler ve glif araması için
  yazı tipi ayrıştırma.
- [JSZip](https://stuk.github.io/jszip/) (MIT) ve
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — OOXML kapsayıcı ve XML katmanları.
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — şeritlerdeki simge seti.
- [electron-updater](https://www.electron.build/) (MIT) — uygulama içi
  güncellemeler.
- Liberation, Carlito, Caladea ve Noto CJK yazı tipleri (OFL/Apache-2.0) —
  paketlenmiş belge yazı tipleri.

`npm run notices`, paketlenmiş üçüncü taraf lisans özetini yeniden üretir
(`tools/gen-third-party-notices.mjs`); tüm çalışma zamanı bağımlılıkları
MIT/Apache-2.0/BSD-3-Clause/OFL lisanslıdır.

## Lisans

GenOffice, tek bir istisnayla [Apache License 2.0](../../LICENSE) altında
lisanslanmıştır: `ee/` dizini gelecekteki kurumsal modüller için ayrılmıştır ve
[GenOffice Enterprise License](../../ee/LICENSE) kapsamındadır.

GenOffice ve Genspark adları ile logoları Mainfunc, Inc.'in ticari
markalarıdır. Apache-2.0 lisansı bunları kullanma izni vermez (bkz. 6. bölüm);
çatallar kendi markalarını kullanmalıdır.
