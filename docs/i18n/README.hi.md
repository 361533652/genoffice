<p align="center">
  <a href="https://genoffice.ai/">
    <picture>
      <source srcset="../assets/readme/hero-dark.webp" media="(prefers-color-scheme: dark)">
      <img src="../assets/readme/hero.webp" alt="GenOffice — ओपन-सोर्स AI ऑफ़िस सूट: बिल्ट-इन AI पैनल के साथ Docs, Sheets, Slides, PDF, Markdown और HTML" width="100%">
    </picture>
  </a>
</p>

<h1 align="center">GenOffice</h1>

<p align="center"><b>दुनिया का पहला फ़ुल-फ़ीचर्ड ओपन-सोर्स AI ऑफ़िस सूट।</b><br>
Word, Excel, PowerPoint और PDF फ़ाइलें, आपके और आपके AI द्वारा एडिट की गई, असली फ़ॉर्मैट में ही सेव होती हैं।</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/361533652/genoffice" alt="License: Apache-2.0"></a>
  <a href="https://github.com/361533652/genoffice/releases/latest"><img src="https://img.shields.io/github/v/release/361533652/genoffice" alt="Latest release"></a>
  <a href="https://github.com/361533652/genoffice/releases"><img src="https://img.shields.io/github/downloads/361533652/genoffice/total" alt="Downloads"></a>
  <a href="https://github.com/361533652/genoffice/stargazers"><img src="https://img.shields.io/github/stars/361533652/genoffice?style=flat" alt="GitHub stars"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.de.md">Deutsch</a> · <a href="README.fr.md">Français</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <b>हिन्दी</b> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.tr.md">Türkçe</a></p>

<p align="center">
  <a href="#download"><b>डाउनलोड</b></a> ·
  <a href="#skills"><b>Skills</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://genoffice.ai/"><b>वेबसाइट</b></a> ·
  <a href="https://genoffice.ai/join"><b>कम्युनिटी</b></a> ·
  <a href="../../PRIVACY.md"><b>गोपनीयता</b></a>
</p>

GenOffice, macOS, Windows और Linux के लिए Microsoft Office का एक फ़्री, ओपन-सोर्स विकल्प है। यह नेटिव `.docx`, `.xlsx` और `.pptx` फ़ाइलें खोलता और सेव करता है, PDF, Markdown और HTML एडिट करता है, और हर डॉक्यूमेंट के साथ एक AI एजेंट देता है — यह किनारे पर टांका गया कोई चैट बॉक्स नहीं है, बल्कि एक ऐसा एडिटर है जो फ़ाइल पढ़ता है, बदलाव करता है, और आपको ठीक-ठीक दिखाता है कि उसने कहाँ छेड़छाड़ की है। ODF फ़ाइलें (`.odt`, `.ods`, `.odp` और `.ott`/`.ots`/`.otp` टेम्पलेट) एडिटेबल OOXML कॉपी के रूप में खुलती हैं; यह इंपोर्ट open-only है — सेव करने पर OOXML ही लिखा जाता है, कभी ODF नहीं।

- **असली फ़ॉर्मैट, बाइट-प्रिज़र्विंग।** सिर्फ़ वही हिस्सा दोबारा लिखा जाता है जिसे आप एडिट करते हैं। फ़ाइल का बाकी हिस्सा बाइट-दर-बाइट वैसा ही रहता है, इसलिए डॉक्यूमेंट Word, Excel और PowerPoint में पहले जैसे ही काम करते रहते हैं।
- **AI जिसे आप रिव्यू कर सकते हैं।** एडिट्स ट्रैक्ड चेंजेस और डिफ़ के रूप में आते हैं, जिन्हें एक क्लिक में रोलबैक किया जा सकता है। स्प्रेडशीट में पेस्ट किए गए नंबर नहीं, बल्कि लाइव फ़ॉर्मूला मिलते हैं। डेक और पेज कैनवस पर जनरेट होते हैं और पूरी तरह एडिटेबल बने रहते हैं। Docs का कोई सेलेक्शन या Sheets की कोई सेल रेंज मॉडल से छिपाएँ और AI को सिर्फ़ एक नाम वाला प्लेसहोल्डर दिखता है; असली शब्द फ़ाइल में मौजूद रहते हैं और वापस आ जाते हैं। यह छिपाना सिर्फ़ इस ऐप के AI पर लागू होता है — CLI, MCP टूल्स और हेडलेस एक्सपोर्ट फ़ाइल को सीधे पढ़ते हैं और ये शब्द उन्हें फिर भी दिखते हैं।
- **डिज़ाइन से ही लोकल।** फ़ाइलें आपकी मशीन पर ही खुलती, एडिट होती, सेव होती और कन्वर्ट होती हैं। PDF → Word / Excel / PowerPoint, Markdown → Word और HTML → Word — यह सभी कन्वर्शन ऑन-डिवाइस होते हैं। मशीन से बाहर सिर्फ़ AI कॉल्स जाती हैं, और वह भी आपके चुने हुए प्रोवाइडर तक।
- **आपकी कीज़ या कोई कीज़ नहीं।** Genspark से साइन इन करें और कीज़ की झंझट से बचें, या Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty या किसी भी OpenAI-compatible endpoint के लिए अपनी खुद की key लाएँ — लोकल सर्वर भी शामिल हैं।
- **स्क्रिप्ट करने योग्य और एजेंट के लिए तैयार।** ऐप के साथ एक `genoffice` कमांड लाइन और Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode और Windsurf के लिए एक skill आती है, ताकि कोई कोडिंग एजेंट बिना कोई विंडो खोले आपकी मशीन पर असली Office फ़ाइलें बना, कन्वर्ट, पढ़ और एडिट कर सके।

**पाएँ:** [macOS](https://github.com/361533652/genoffice/releases/latest) (Apple Silicon और Intel) ·
[Windows](https://github.com/361533652/genoffice/releases/latest) (x64 और Arm) ·
[Linux](https://github.com/361533652/genoffice/releases/latest) (deb, rpm, AppImage) —
विवरण और आवश्यकताएँ [डाउनलोड](#download) में देखें।

## GenOffice क्यों

- **ओपन सोर्स**, Apache-2.0, GitHub पर खुले तौर पर बनाया गया।
- **खुद चलाने के लिए आपका।** macOS, Windows और Linux के लिए नेटिव ऐप्स; फ़ाइलें
  आपकी डिस्क पर रहती हैं और हर एडिट, सेव और कन्वर्ज़न आपकी अपनी मशीन पर होता है।
- **असली Office फ़ाइलें।** नेटिव `.docx`, `.xlsx` और `.pptx`, बाइट-प्रिज़र्विंग:
  फ़ाइल के जिन हिस्सों को आपने नहीं छुआ वे जैसे थे वैसे ही कॉपी होते हैं।
- **AI जो डॉक्यूमेंट को खुद एडिट करता है।** Docs में ट्रैक्ड चेंजेस, Sheets में लाइव
  फ़ॉर्मूला और चार्ट, कैनवस पर खींची गई स्लाइड्स, हर AI टर्न एक स्नैपशॉट है जिसे
  आप वापस ले जा सकते हैं।
- **आपका मॉडल, आपकी key।** Genspark से साइन इन करें, या Claude, OpenAI, Gemini,
  DeepSeek और अन्य के लिए अपनी key लाएँ, लोकल सर्वर और कोई भी OpenAI-compatible
  endpoint भी शामिल है।
- **PDF सही तरीके से हैंडल किया गया।** पेज के भीतर सीधे टेक्स्ट एडिट करें, और PDF को
  ऑन-डिवाइस Word, Excel या PowerPoint में कन्वर्ट करें, स्कैन के लिए सिस्टम OCR के
  साथ।
- **Markdown और HTML भी**, उसी AI पैनल और Word में लोकल एक्सपोर्ट के साथ।
- **Skills।** तैयार skills या आपकी अपनी `SKILL.md`, किसी भी AI पैनल के **+** मेनू से जोड़ें।
- **स्क्रिप्ट करने योग्य।** एक `genoffice` कमांड लाइन, एक एजेंट skill और एक
  MCP सर्वर हर इंजन को Claude Code, Claude Desktop, Codex, Cursor और दूसरे
  एजेंट्स की सेवा में लगा देते हैं, वह भी ऑन-डिवाइस।
- **फ़्री**, व्यक्तियों और टीमों दोनों के लिए।

## कमांड लाइन और एजेंट skill

ऐप्स किसी फ़ाइल के साथ जो कुछ कर सकते हैं, वह सब `genoffice` कमांड लाइन टर्मिनल से
कर सकती है: Word, Excel, PowerPoint, PDF, Markdown और HTML को उन्हीं इंजनों पर,
हेडलेस, इंस्पेक्ट, कन्वर्ट, क्रिएट, रीड और एडिट करना। यह GenOffice के साथ इंस्टॉल
होती है, इसे अपना कोई अलग रनटाइम नहीं चाहिए, और यह कोई डॉक्यूमेंट कहीं नहीं भेजती।
बंडल की गई **एजेंट skill** के साथ मिलकर यह किसी कोडिंग एजेंट को एक ऐसे डॉक्यूमेंट
वर्कर में बदल देती है जो Markdown के अनुमानित रूपांतरणों के बजाय असली Office
फ़ाइलें बनाता है।

**इनके साथ काम करती है:** Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode और Windsurf के साथ बिना किसी अतिरिक्त सेटअप के, skills पढ़ने वाले किसी
भी अन्य एजेंट के साथ, और [MCP सर्वर](#mcp-server) के ज़रिए Claude Desktop और
हर MCP क्लाइंट के साथ।

### skill इंस्टॉल करें

| कैसे                                   | क्या होता है                                                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ऐप में **सेटिंग्स → इंटीग्रेशन**       | इस कंप्यूटर पर मिले एजेंट्स की सूची दिखाता है; एक क्लिक में आपके चुने हुए हर एजेंट में skill लिख देता है। जब किसी GenOffice रिलीज़ में नई skill आती है, तो एक **Update** बटन दिखाई देता है। |
| उसी पेज पर **zip के रूप में डाउनलोड**  | वह लेआउट जिसे claude.ai, Claude डेस्कटॉप ऐप्स और दूसरे असिस्टेंट अपलोड की गई skill के रूप में स्वीकार करते हैं।                                                                             |
| `npx skills add 361533652/genoffice` | इस रिपॉज़िटरी से किसी भी skills-compatible एजेंट में इंस्टॉल करता है।                                                                                                                       |

फिर एक नई चैट शुरू करें और कोई डॉक्यूमेंट माँगें। skill एजेंट को सिखाती है कि
`genoffice` का सहारा कब लेना है, एडिट करने से पहले फ़ाइल कैसे पढ़नी है, और अपना
काम खुद कैसे जाँचना है।

### टर्मिनल से क्विकस्टार्ट

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

हर कमांड एक लाइन का सारांश प्रिंट करती है, या `--json` के साथ एक सिंगल JSON
ऑब्जेक्ट। एडिट्स एटॉमिक हैं: रिजेक्ट किया गया op फ़ाइल को अछूता छोड़ देता है और
एक गाइडेड एरर के साथ वापस आता है। `genoffice help` मौजूदा कमांड सरफ़ेस की सूची
देता है; पूरा रेफ़रेंस [packages/cli/README.md](../../packages/cli/README.md) में है।

### एजेंट असल में क्या चलाता है

ऊपर दिए गए डेमो का सोलर सिस्टम डेक Claude Code में एक ही प्रॉम्प्ट में बना।
पर्दे के पीछे, एजेंट ने skill के चरणबद्ध वर्कफ़्लो का पालन किया और CLI ने अगला
चरण शुरू होने से पहले हर चरण की जाँच की:

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

`genoffice` के भीतर कोई मॉडल कॉल नहीं होती: सोचने का काम एजेंट करता है, बनाने
और जाँचने का काम CLI करती है, और नतीजा GenOffice या PowerPoint में एक सामान्य
`.pptx` के रूप में खुलता है।

<a id="mcp-server"></a>

### MCP सर्वर

यही कमांड्स [Model Context Protocol](https://modelcontextprotocol.io) टूल्स के
रूप में भी उपलब्ध हैं, उन असिस्टेंट्स के लिए जो टर्मिनल नहीं चला सकते, या
जिन्हें आप टर्मिनल नहीं देना चाहते। इसमें आने के दो तरीके हैं, दोनों
**सेटिंग्स → इंटीग्रेशन → MCP** में कॉपी-रेडी स्निपेट्स के साथ दिखाए गए हैं:

| तरीका                                | क्या है                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A · `genoffice mcp`** (सुझाया गया) | एक stdio सर्वर जिसे असिस्टेंट खुद शुरू करता है; GenOffice का खुला होना ज़रूरी नहीं। हर कमांड के लिए एक टूल (`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`) है, साथ ही चरणबद्ध डेक फ़्लो `deck_start` → `deck_page` → `deck_build` → `deck_replace`। Ops, spec और Markdown सब इनलाइन पास होते हैं, इसलिए बिना फ़ाइल सिस्टम वाला क्लाइंट भी काम करता है। |
| **B · लोकल HTTP सर्वर**              | GenOffice ऐप के भीतर `http://127.0.0.1:3093/mcp` पर चलता है (Streamable HTTP, लेगेसी SSE के साथ)। इसके टूल्स एक दिखने वाले Word एडिटर टैब को चलाते हैं: `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session`, और आप डॉक्यूमेंट को आकार लेते देख सकते हैं। डिफ़ॉल्ट रूप से बंद; उसी सेटिंग्स पैनल में चालू करें।                                                                                                                                                  |

```bash
# Claude Code
claude mcp add --transport stdio genoffice -- genoffice mcp
```

```jsonc
// Cursor, Claude Desktop या कोई भी अन्य MCP क्लाइंट
{ "mcpServers": { "genoffice": { "command": "genoffice", "args": ["mcp"] } } }
```

यहाँ `genoffice` वही CLI है जो ऐप के भीतर आती है (macOS पर
`/Applications/GenOffice.app/Contents/Resources/cli/genoffice`; सेटिंग्स
पैनल आपकी इंस्टॉल की सटीक path दिखाता है)। सर्वर अपने साथ अपनी वर्कफ़्लो
इंस्ट्रक्शंस लेकर आता है और ऑप रेफ़रेंस को `genoffice://guide/*` resources
के रूप में एक्सपोज़ करता है, इसलिए किसी skill की ज़रूरत नहीं; skill और
MCP सर्वर साथ रह सकते हैं और असिस्टेंट खुद एक चुन लेता है। क्लाउड फ़ीचर्स
(`search`, `image`, `media`) अब भी GenOffice में कॉन्फ़िगर किए गए प्रोवाइडर
से होकर जाते हैं; बाक़ी सब कुछ लोकल चलता है, और `GENOFFICE_ALLOWED_ROOTS`
हर टूल को आपके बताए फ़ोल्डर्स तक सीमित रखता है।

ऊपर दिए गए डेमो का रिन्यूएबल एनर्जी डेक यही है कि सिर्फ़ `genoffice` MCP
सर्वर अटैच किए हुए Claude Code में एक प्रॉम्प्ट प्रोटोकॉल की तरफ़ से कैसा
दिखता है:

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

अड़तीस कॉल्स, लगभग तेरह मिनट, और असिस्टेंट ने कभी टर्मिनल को छुआ तक नहीं: आँकड़े, तस्वीरें, गाइड्स, चेक्स और रेंडर्स सब MCP टूल रिज़ल्ट्स के रूप में आए-गए। मशीन से बाहर सिर्फ़ `search` और `media` गए, GenOffice में सेट किए गए प्रोवाइडर तक।

<a id="download"></a>

## डाउनलोड

| प्लेटफ़ॉर्म                          | आवश्यकताएँ                                            | डाउनलोड                                                                                   |
| ------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **macOS** — Apple Silicon (arm64)    | macOS 11+                                             | [नवीनतम `.dmg` (arm64)](https://github.com/361533652/genoffice/releases/latest)         |
| **macOS** — Intel (x64)              | macOS 11+                                             | [नवीनतम `.dmg` (x64)](https://github.com/361533652/genoffice/releases/latest)           |
| **Windows** (x64, ज़्यादातर PC)      | Windows 10+, Intel/AMD                                | [नवीनतम `-x64.exe` installer](https://github.com/361533652/genoffice/releases/latest)   |
| **Windows** Arm पर (ARM64)           | Windows 11 on Arm (Snapdragon X और समान)              | [नवीनतम `-arm64.exe` installer](https://github.com/361533652/genoffice/releases/latest) |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 या नया)             | [नवीनतम `.deb`](https://github.com/361533652/genoffice/releases/latest)                 |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | [नवीनतम `.rpm`](https://github.com/361533652/genoffice/releases/latest)                 |
| **Linux** — अन्य डिस्ट्रीब्यूशन      | x86_64, glibc 2.34+, FUSE 2                           | [नवीनतम `.AppImage`](https://github.com/361533652/genoffice/releases/latest)            |

सभी बिल्ड `main` से बनते हैं; macOS और Windows इंस्टॉलर साइन किए हुए हैं।
पुराने वर्शन [Releases](https://github.com/361533652/genoffice/releases) पेज पर मौजूद हैं।

<details>
<summary><b>Linux पर इंस्टॉल करना</b></summary>

deb, apt के साथ इंस्टॉल होता है — यह डिपेंडेंसीज़ खींच लेता है और GenOffice को applications मेन्यू में जोड़ देता है:

```bash
sudo apt install ./genoffice_<version>_amd64.deb
```

Fedora / RHEL-फ़ैमिली / openSUSE पर, इसके बजाय rpm इंस्टॉल करें:

```bash
sudo dnf install ./genoffice-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./genoffice-<version>.x86_64.rpm  # openSUSE
```

AppImage उसी जगह चलती है: FUSE 2 रनटाइम इंस्टॉल करें
(`sudo apt install libfuse2`; Ubuntu 24.04 पर पैकेज का नाम `libfuse2t64` है),
फ़ाइल को executable बनाएँ, फिर उसे चलाएँ:

```bash
chmod +x GenOffice-<version>.AppImage
./GenOffice-<version>.AppImage
```

Chromebook पर ये ही पैकेज Linux वातावरण (Crostini) में चलते हैं — विवरण [docs/platforms/chromeos.md](../platforms/chromeos.md) में है।

</details>

## यह कैसे काम करता है

सात Electron ऐप्स — Docs, Sheets, Slides, PDF, Markdown, HTML और टैब्ड शेल — एक ही इंजन लेयर शेयर करते हैं, जो प्योर TypeScript पैकेजेज़ और `.xlsx` के लिए एक Rust sidecar से बना है। मूल फ़ाइल हमेशा सोर्स ऑफ़ ट्रुथ होती है: एडिट्स को छोटे, सटीक पैच के रूप में लागू किया जाता है, और जिस हिस्से को एडिटर ने नहीं छुआ, वह राउंड ट्रिप में बिना छेड़छाड़ के बचा रहता है।

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

पैकेज-दर-पैकेज टूर (docx/pptx इंजन, `pdf2docx`, `html2docx`, एजेंट कोर और प्रोवाइडर्स) [CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages) में मौजूद है।

## डेवलपमेंट

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

sheets ऐप को अपने xlsx sidecar के लिए एक Rust toolchain अलग से चाहिए
(`cargo` PATH में होना चाहिए); `npm run build -w @genoffice/sheets` इसे
अपने-आप कंपाइल कर देता है। हर बदलाव को किन चेक्स से गुज़रना होता है और
pull request कैसे मर्ज होते हैं, इसके लिए [CONTRIBUTING.md](../../CONTRIBUTING.md) देखें।

## कम्युनिटी

GenOffice पर सक्रिय रूप से काम चल रहा है, और आपका फ़ीडबैक इसे आकार देता है।

- [GitHub Issues](https://github.com/361533652/genoffice/issues) में
  **बग रिपोर्ट करें या फ़ीचर रिक्वेस्ट करें**।
- टीम और दूसरे यूज़र्स से बात करने के लिए
  [GenTeam](https://genoffice.ai/join) पर **GenOffice ग्रुप चैट जॉइन करें**।
- अगर GenOffice आपके लिए उपयोगी है तो **रीपो को स्टार करें** — प्रोजेक्ट को
  सपोर्ट करने का यह सबसे अच्छा तरीका है।

## FAQ

<details>
<summary><b>क्या GenOffice फ़्री है?</b></summary>

हाँ। GenOffice, Apache-2.0 लाइसेंस के तहत फ़्री और ओपन-सोर्स है — कोई ट्रायल
नहीं, ऐप्स के लिए खुद कोई पेड टियर नहीं।

</details>

<details>
<summary><b>क्या GenOffice Microsoft Word, Excel और PowerPoint फ़ाइलें खोल सकता है?</b></summary>

हाँ। GenOffice नेटिव `.docx`, `.xlsx` और `.pptx` फ़ाइलें खोलता और सेव करता है।
सेविंग बाइट-प्रिज़र्विंग है: फ़ाइल के जिन हिस्सों को आपने नहीं छुआ, वे
बाइट-दर-बाइट वापस लिखे जाते हैं, इसलिए डॉक्यूमेंट Microsoft Office में पहले
जैसे ही काम करते रहते हैं।

</details>

<details>
<summary><b>क्या GenOffice ऑफ़लाइन काम करता है?</b></summary>

डॉक्यूमेंट एडिटिंग पूरी तरह लोकल है — खोलने, एडिट करने, सेव करने या कन्वर्ट
करने के लिए फ़ाइलें कभी आपकी मशीन से बाहर नहीं जाती हैं। AI फ़ीचर्स (एजेंट,
सर्च, इमेज टूल्स) को नेटवर्क कनेक्शन चाहिए, और उसके लिए Genspark साइन-इन या
आपकी अपनी मॉडल API key में से कोई एक ज़रूरी है।

</details>

<details>
<summary><b>क्या GenOffice PDF फ़ाइलें एडिट कर सकता है?</b></summary>

हाँ — असली PDF टेक्स्ट और इमेज एडिटिंग, जो मूल फ़ॉन्ट्स को बरकरार रखते हुए
पेज की कंटेंट स्ट्रीम को फिर से लिखती है, कोई कवर-अप एनोटेशन नहीं।

</details>

<details>
<summary><b>क्या GenOffice PDF को Word, Excel या PowerPoint में कन्वर्ट कर सकता है?</b></summary>

हाँ — पूरी तरह ऑन-डिवाइस: PDFium का कैरेक्टर-लेवल एक्सट्रैक्शन और
जियोमेट्री-आधारित लेआउट एनालिसिस, न कोई क्लाउड सर्विस, न कोई अपलोड। स्कैन
किए गए पेज भी कवर होते हैं: macOS और Windows पर सिस्टम OCR उन्हें पढ़ लेता
है, इसलिए वे पेज इमेज के बजाय एडिटेबल टेक्स्ट में कन्वर्ट होते हैं।

</details>

<details>
<summary><b>क्या मैं अपना AI मॉडल या API key इस्तेमाल कर सकता हूँ?</b></summary>

हाँ। बिना-key वाले Genspark साइन-इन के अलावा, GenOffice Claude, OpenAI,
Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral,
OpenRouter, Requesty और OpenCode Zen/Go के लिए अपनी खुद की key लाने को सपोर्ट करता
है, साथ ही किसी भी OpenAI-compatible endpoint को — जिसमें लोकल मॉडल सर्वर
भी शामिल हैं। सर्च, इमेज जनरेशन और इमेज/वीडियो एनालिसिस के लिए
Settings → AI Media & Search के तहत अलग keys चाहिए।

</details>

<details>
<summary><b>क्या मैं AI पैनल बंद कर सकता हूँ?</b></summary>

हाँ। Settings → AI में एक **Show the AI sidebar** स्विच होता है। इसे बंद करते ही हर
एडिटर साइडबार छिपा देता है, और नए डॉक्यूमेंट उसे अपने-आप नहीं खोलते। कोई स्पष्ट AI
एक्शन — कोई रिबन बटन या मेन्यू आइटम — फिर भी उस डॉक्यूमेंट के लिए पैनल खोल देता है,
और उसे बंद करने पर वापस छिपा ही रहता है।

</details>

<details>
<summary><b>क्या GenOffice HTML को Word में कन्वर्ट कर सकता है?</b></summary>

हाँ — HTML ऐप में Export as Word पूरी तरह ऑन-डिवाइस एक नेटिव, एडिटेबल
`.docx` बनाता है। पेज को बिल्ट-इन Chromium में रेंडर किया जाता है और असली
Word स्ट्रक्चर में बदला जाता है: हेडिंग, पैराग्राफ़, लिस्ट, टेबल, कार्ड, KPI
रो, फ़ॉर्म फ़ील्ड और पेज बैकग्राउंड; सिर्फ़ वही विज़ुअल जिनका Word में कोई
समकक्ष नहीं है (चार्ट, आइकन, डेकोरेटेड बॉक्स), उन्हें इमेज के रूप में एम्बेड
किया जाता है।

</details>

<details>
<summary><b>क्या मैं Claude Code, Codex, Cursor या किसी स्क्रिप्ट से GenOffice चला सकता हूँ?</b></summary>

हाँ। GenOffice एक `genoffice` कमांड लाइन इंस्टॉल करता है जो उन्हीं इंजनों को
हेडलेस चलाती है: टर्मिनल या स्क्रिप्ट से डॉक्यूमेंट इंस्पेक्ट, कन्वर्ट, क्रिएट,
रीड और एडिट करें, प्रोग्राम्स के लिए `--json` आउटपुट के साथ। बंडल की गई एजेंट
skill Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode और
Windsurf को इसका इस्तेमाल सिखाती है; इसे **सेटिंग्स → इंटीग्रेशन** से इंस्टॉल
करें। देखें [कमांड लाइन और एजेंट skill](#command-line-and-agent-skill)।

</details>

<details>
<summary><b>क्या GenOffice कोई डेटा कलेक्ट करता है?</b></summary>

ऑफ़िशियल पैकेज्ड बिल्ड डिफ़ॉल्ट रूप से सीमित यूसेज एनालिटिक्स भेजते हैं,
और आप Settings → General के तहत कभी भी रिपोर्टिंग बंद कर सकते हैं। एनालिटिक्स
कभी भी डॉक्यूमेंट कंटेंट, फ़ाइल नाम, फ़ाइल पाथ, अकाउंट आइडेंटिटी या ईमेल
एड्रेस नहीं भेजता। पूरे इवेंट और डेटा डिस्क्लोज़र के लिए
[GenOffice Privacy](../../PRIVACY.md) देखें।

</details>

## सिक्योरिटी

प्रोसेस सिक्योरिटी पॉस्चर (रेंडरर सैंडबॉक्सिंग, IPC वैलिडेशन, एक्सटर्नल-लिंक
गेटिंग) और AI-जनरेटेड कंटेंट के लिए थ्रेट मॉडल के लिए
[SECURITY.md](../../SECURITY.md) देखें।

## आभार

इन ओपन-सोर्स प्रोजेक्ट्स के बिना GenOffice संभव नहीं होता:

- [Electron](https://www.electronjs.org/) — हर ऐप का डेस्कटॉप रनटाइम।
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — वह स्प्रेडशीट
  UI कोर जिसे Sheets एक्सटेंड करता है।
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause, बंडल्ड
  [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer) के
  ज़रिए) — असली PDF टेक्स्ट और इमेज एडिटिंग के पीछे का कंटेंट-स्ट्रीम इंजन।
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) और
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — PDF रेंडरिंग और
  डॉक्यूमेंट असेंबली।
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  Docs और Markdown के ब्लॉक एडिटर।
- [CodeMirror](https://codemirror.net/) (MIT) — HTML का सोर्स एडिटर।
- [Konva](https://konvajs.org/) — Slides और Sheets चार्ट के लिए कैनवस
  रेंडरिंग।
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — जटिल स्क्रिप्ट
  के लिए टेक्स्ट-शेपिंग मेट्रिक्स।
- [calamine](https://github.com/tafia/calamine) और
  [IronCalc](https://github.com/ironcalc/IronCalc) — Rust xlsx sidecar की
  रीड और कैल्क लेयर।
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — एम्बेडेड
  PowerPoint फ़ॉन्ट्स के लिए MicroType Express डिकोडर, जिसे TypeScript में
  पोर्ट किया गया है।
- [React](https://react.dev/) (MIT) — हर ऐप की UI लेयर।
- [Mermaid](https://mermaid.js.org/) (MIT) और [KaTeX](https://katex.org/)
  (MIT) — Markdown और Docs में डायग्राम और गणित।
- [opentype.js](https://opentype.js.org/) (MIT) — मेट्रिक्स और ग्लिफ़
  लुकअप के लिए फ़ॉन्ट पार्सिंग।
- [JSZip](https://stuk.github.io/jszip/) (MIT) और
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — OOXML कंटेनर और XML लेयर।
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — सभी रिबन में इस्तेमाल होने वाला आइकन सेट।
- [electron-updater](https://www.electron.build/) (MIT) — ऐप के भीतर
  अपडेट।
- Liberation, Carlito, Caladea, और Noto CJK फ़ॉन्ट्स (OFL/Apache-2.0) —
  बंडल्ड डॉक्यूमेंट फ़ॉन्ट्स।

`npm run notices` बंडल्ड थर्ड-पार्टी लाइसेंस समरी को फिर से जनरेट करता है
(`tools/gen-third-party-notices.mjs`); सभी रनटाइम डिपेंडेंसीज़
MIT/Apache-2.0/BSD-3-Clause/OFL हैं।

## लाइसेंस

GenOffice को [Apache License 2.0](../../LICENSE) के तहत लाइसेंस किया गया
है, एक अपवाद के साथ: `ee/` डायरेक्टरी भविष्य के एंटरप्राइज़ मॉड्यूल्स के लिए
रिज़र्व है और [GenOffice Enterprise License](../../ee/LICENSE) के तहत आती है।

GenOffice और Genspark के नाम व लोगो, Mainfunc, Inc. के ट्रेडमार्क हैं।
Apache-2.0 लाइसेंस इनके इस्तेमाल की अनुमति नहीं देता (सेक्शन 6 देखें);
फ़ॉर्क को अपनी खुद की ब्रांडिंग इस्तेमाल करनी चाहिए।
