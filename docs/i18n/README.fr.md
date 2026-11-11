<p align="center">
  <a href="https://genoffice.ai/">
    <picture>
      <source srcset="../assets/readme/hero-dark.webp" media="(prefers-color-scheme: dark)">
      <img src="../assets/readme/hero.webp" alt="GenOffice — la suite bureautique IA open source : Docs, Sheets, Slides, PDF, Markdown et HTML avec un panneau IA intégré" width="100%">
    </picture>
  </a>
</p>

<h1 align="center">GenOffice</h1>

<p align="center"><b>La première suite bureautique IA open source complète au monde.</b><br>
Fichiers Word, Excel, PowerPoint et PDF, modifiés par vous et votre IA, enregistrés dans les formats natifs.</p>

<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/361533652/genoffice" alt="License: Apache-2.0"></a>
  <a href="https://github.com/361533652/genoffice/releases/latest"><img src="https://img.shields.io/github/v/release/361533652/genoffice" alt="Latest release"></a>
  <a href="https://github.com/361533652/genoffice/releases"><img src="https://img.shields.io/github/downloads/361533652/genoffice/total" alt="Downloads"></a>
  <a href="https://github.com/361533652/genoffice/stargazers"><img src="https://img.shields.io/github/stars/361533652/genoffice?style=flat" alt="GitHub stars"></a>
</p>

<p align="center"><a href="../../README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.de.md">Deutsch</a> · <b>Français</b> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.it.md">Italiano</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.pl.md">Polski</a> · <a href="README.cs.md">Čeština</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.ms.md">Bahasa Melayu</a> · <a href="README.th.md">ไทย</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.he.md">עברית</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.tr.md">Türkçe</a></p>

<p align="center">
  <a href="#download"><b>Télécharger</b></a> ·
  <a href="#skills"><b>Skills</b></a> ·
  <a href="#command-line-and-agent-skill"><b>CLI</b></a> ·
  <a href="#mcp-server"><b>MCP</b></a> ·
  <a href="https://genoffice.ai/"><b>Site web</b></a> ·
  <a href="https://genoffice.ai/join"><b>Communauté</b></a> ·
  <a href="../../PRIVACY.md"><b>Confidentialité</b></a>
</p>

GenOffice est une alternative gratuite et open source à Microsoft Office pour
macOS, Windows et Linux. Elle ouvre et enregistre des fichiers natifs
`.docx`, `.xlsx` et `.pptx`, permet d'éditer des PDF, du Markdown et du HTML,
et place un agent IA au cœur de chaque document — pas une simple fenêtre de
chat greffée sur le côté, mais un éditeur qui lit le fichier, effectue la
modification, et vous montre exactement ce qu'il a touché. Les fichiers ODF
(`.odt`, `.ods`, `.odp` et les modèles `.ott`/`.ots`/`.otp`) s'ouvrent sous
forme de copies OOXML modifiables ; l'importation se limite à l'ouverture —
l'enregistrement écrit de l'OOXML, jamais de l'ODF.

- **Formats natifs, préservation au bit près.** Seul ce que vous modifiez est
  réécrit. Le reste du fichier est conservé à l'identique, si bien que vos
  documents continuent de fonctionner dans Word, Excel et PowerPoint.
- **Une IA que vous pouvez vérifier.** Les modifications arrivent sous forme
  de suivi des modifications et de diffs, avec une annulation en un clic. Les
  feuilles de calcul reçoivent de vraies formules, pas des chiffres collés.
  Les diapositives et les pages sont générées directement sur le canevas et
  restent entièrement modifiables. Masquez au modèle une sélection de Docs ou
  une plage de cellules de Sheets et l'IA ne voit qu'un espace réservé nommé ;
  les mots d'origine restent dans le fichier et reviennent. Ce masquage couvre
  l'IA de l'application — la CLI, les outils MCP et l'export sans interface
  graphique lisent directement le fichier et voient toujours ces mots.
- **Local par conception.** L'ouverture, l'édition, l'enregistrement et la
  conversion des fichiers se font sur votre machine. Les conversions
  PDF → Word / Excel / PowerPoint, Markdown → Word et HTML → Word s'exécutent
  toutes en local. Seuls les appels à l'IA quittent la machine, vers le
  fournisseur de votre choix.
- **Vos clés ou aucune.** Connectez-vous avec Genspark pour vous dispenser de
  clé, ou utilisez votre propre clé pour Claude, OpenAI, Gemini, DeepSeek,
  Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty, ou tout point
  de terminaison compatible OpenAI, y compris les serveurs locaux.
- **Scriptable et prêt pour les agents.** L'application embarque une ligne de
  commande `genoffice` et un skill pour Claude Code, Codex, Cursor, Gemini
  CLI, GitHub Copilot, OpenCode et Windsurf, si bien qu'un agent de codage
  peut créer, convertir, lire et modifier de vrais fichiers Office sur votre
  machine sans ouvrir de fenêtre.

**À télécharger :** [macOS](https://github.com/361533652/genoffice/releases/latest) (Apple Silicon et Intel) ·
[Windows](https://github.com/361533652/genoffice/releases/latest) (x64 et Arm) ·
[Linux](https://github.com/361533652/genoffice/releases/latest) (deb, rpm, AppImage) —
détails et prérequis dans la section [Télécharger](#download).

## Pourquoi GenOffice

- **Open source**, licence Apache-2.0, développé au grand jour sur GitHub.
- **À vous de l'exécuter.** Applications natives pour macOS, Windows et
  Linux ; les fichiers restent sur votre disque et chaque modification,
  enregistrement et conversion s'effectue sur votre machine.
- **De vrais fichiers Office.** `.docx`, `.xlsx` et `.pptx` natifs, préservés
  au bit près : les parties du fichier non modifiées sont copiées telles
  quelles.
- **Une IA qui modifie le document lui-même.** Suivi des modifications dans
  Docs, formules et graphiques vivants dans Sheets, diapositives dessinées
  directement sur le canevas, chaque étape de l'IA laissant un instantané que
  vous pouvez restaurer.
- **Votre modèle, votre clé.** Connectez-vous avec Genspark, ou apportez une
  clé pour Claude, OpenAI, Gemini, DeepSeek et d'autres, serveurs locaux et
  tout point de terminaison compatible OpenAI inclus.
- **Le PDF fait sérieusement.** Modifiez le texte directement dans la page,
  et convertissez le PDF en Word, Excel ou PowerPoint en local, avec OCR
  système pour les scans.
- **Markdown et HTML aussi**, avec le même panneau IA et un export local vers
  Word.
- **Skills.** Des skills prêts à l’emploi ou votre propre `SKILL.md`, joints depuis le menu **+** de n’importe quel panneau IA.
- **Scriptable.** Une ligne de commande `genoffice`, un skill d'agent et un
  serveur MCP mettent chaque moteur au service de Claude Code, Claude
  Desktop, Codex, Cursor et d'autres agents, toujours en local.
- **Gratuit**, pour les particuliers comme pour les équipes.

## Ligne de commande et skill d'agent

Tout ce que les applications peuvent faire à un fichier, la ligne de commande
`genoffice` peut le faire depuis un terminal : inspecter, convertir, créer,
lire et modifier du Word, de l'Excel, du PowerPoint, du PDF, du Markdown et
du HTML sur les mêmes moteurs, sans interface graphique. Elle s'installe avec
GenOffice, n'a besoin d'aucun runtime propre et n'envoie jamais un document
où que ce soit. Associée au **skill d'agent** fourni, elle transforme un
agent de codage en un ouvrier documentaire qui produit de vrais fichiers
Office plutôt que des approximations en Markdown.

**Fonctionne avec :** Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot,
OpenCode et Windsurf dès l'installation, tout autre agent qui lit des
skills, et, via le [serveur MCP](#mcp-server), Claude Desktop et tout client
MCP.

### Installer le skill

| Comment                                        | Ce qui se passe                                                                                                                                                                                                   |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Réglages → Intégrations** dans l'application | Liste les agents trouvés sur cet ordinateur ; un clic écrit le skill dans chacun de ceux que vous choisissez. Un bouton **Mettre à jour** apparaît lorsqu'une version de GenOffice embarque un skill plus récent. |
| **Télécharger en zip** sur la même page        | Le format que claude.ai, les applications de bureau Claude et d'autres assistants acceptent comme skill téléversé.                                                                                                |
| `npx skills add 361533652/genoffice`         | Installe depuis ce dépôt dans tout agent compatible avec les skills.                                                                                                                                              |

Ouvrez ensuite une nouvelle conversation et demandez un document. Le skill
apprend à l'agent quand recourir à `genoffice`, comment lire un fichier avant
de le modifier, et comment vérifier son propre travail.

### Démarrage rapide depuis le terminal

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

Chaque commande affiche un résumé d'une ligne, ou un seul objet JSON avec
`--json`. Les modifications sont atomiques : une opération rejetée laisse le
fichier intact et renvoie une erreur guidée. `genoffice help` liste les
commandes actuellement disponibles ; la référence complète se trouve dans
[packages/cli/README.md](../../packages/cli/README.md).

### Ce que l'agent exécute réellement

Le deck Système solaire de la démonstration ci-dessus a demandé un seul
prompt dans Claude Code. En coulisses, l'agent a suivi le flux de travail par
étapes du skill, et la CLI a vérifié chaque étape avant de passer à la
suivante :

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

Aucun appel à un modèle n'a lieu dans `genoffice` : l'agent réfléchit, la CLI
construit et vérifie, et le résultat s'ouvre dans GenOffice ou PowerPoint
comme un `.pptx` ordinaire.

<a id="mcp-server"></a>

### Serveur MCP

Les mêmes commandes sont disponibles comme outils
[Model Context Protocol](https://modelcontextprotocol.io), pour les
assistants qui ne peuvent pas exécuter de terminal ou auxquels vous
préférez ne pas en donner un. Il existe deux façons de vous connecter,
toutes deux présentées avec des extraits prêts à copier dans
**Réglages → Intégrations → MCP** :

| Voie                                 | Ce que c'est                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A · `genoffice mcp`** (recommandé) | Un serveur stdio que l'assistant démarre lui-même ; GenOffice n'a pas besoin d'être ouvert. Un outil par commande (`info`, `convert`, `create_docx`, `create_xlsx`, `create_pptx`, `create_pdf`, `docs_read` / `docs_apply` / `docs_check`, `sheet_*`, `slides_*`, `render`, `guide`, `search`, `image`, `media`, `open`) plus le flux de deck par étapes `deck_start` → `deck_page` → `deck_build` → `deck_replace`. Les opérations, les spécifications et le Markdown sont passés en ligne, donc un client sans système de fichiers fonctionne quand même. |
| **B · Serveur HTTP local**           | Tourne dans l'application GenOffice sur `http://127.0.0.1:3093/mcp` (Streamable HTTP, avec SSE hérité). Ses outils pilotent un onglet d'éditeur Word visible : `create_session`, `insert_content`, `replace_blocks`, `apply_ops`, `read_document`, `save_session`, et vous regardez le document prendre forme. Désactivé par défaut ; activez-le dans le même panneau de réglages.                                                                                                                                                                           |

```bash
# Claude Code
claude mcp add --transport stdio genoffice -- genoffice mcp
```

```jsonc
// Cursor, Claude Desktop ou tout autre client MCP
{ "mcpServers": { "genoffice": { "command": "genoffice", "args": ["mcp"] } } }
```

`genoffice` désigne ici la CLI fournie dans l'application (sur macOS
`/Applications/GenOffice.app/Contents/Resources/cli/genoffice` ; le panneau
de réglages affiche le chemin exact de votre installation). Le serveur
embarque ses propres instructions de workflow et expose les références
d'opérations comme ressources `genoffice://guide/*`, donc aucun skill n'est
nécessaire ; le skill et le serveur MCP peuvent coexister, et l'assistant
en choisit un. Les fonctionnalités cloud (`search`, `image`, `media`)
passent toujours par le fournisseur configuré dans GenOffice ; tout le
reste tourne en local, et `GENOFFICE_ALLOWED_ROOTS` limite chaque outil aux
dossiers que vous indiquez.

Le deck sur les énergies renouvelables de la démonstration ci-dessus, c'est
à quoi ressemble, côté protocole, un seul prompt dans Claude Code avec
uniquement le serveur MCP `genoffice` connecté :

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

Trente-huit appels, environ treize minutes, et l'assistant n'a jamais
touché de terminal : les figures, les photos, les guides, les vérifications
et les rendus ont tous voyagé sous forme de résultats d'outils MCP. Seuls
`search` et `media` ont quitté la machine, vers le fournisseur configuré
dans GenOffice.

<a id="download"></a>

## Télécharger

| Plateforme                           | Prérequis                                             | Téléchargement                                                                                |
| ------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **macOS** — Apple Silicon (arm64)    | macOS 11+                                             | [Dernier `.dmg` (arm64)](https://github.com/361533652/genoffice/releases/latest)            |
| **macOS** — Intel (x64)              | macOS 11+                                             | [Dernier `.dmg` (x64)](https://github.com/361533652/genoffice/releases/latest)              |
| **Windows** (x64, la plupart des PC) | Windows 10+, Intel/AMD                                | [Dernier installateur `-x64.exe`](https://github.com/361533652/genoffice/releases/latest)   |
| **Windows** sur Arm (ARM64)          | Windows 11 sur Arm (Snapdragon X et similaires)       | [Dernier installateur `-arm64.exe`](https://github.com/361533652/genoffice/releases/latest) |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 ou plus récent)     | [Dernier `.deb`](https://github.com/361533652/genoffice/releases/latest)                    |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | [Dernier `.rpm`](https://github.com/361533652/genoffice/releases/latest)                    |
| **Linux** — autres distributions     | x86_64, glibc 2.34+, FUSE 2                           | [Dernier `.AppImage`](https://github.com/361533652/genoffice/releases/latest)               |

Toutes les versions proviennent de `main` ; les installateurs macOS et
Windows sont signés. Les versions plus anciennes se trouvent sur la page des
[Releases](https://github.com/361533652/genoffice/releases).

<details>
<summary><b>Installation sur Linux</b></summary>

Le paquet deb s'installe avec apt — il récupère les dépendances et ajoute
GenOffice au menu des applications :

```bash
sudo apt install ./genoffice_<version>_amd64.deb
```

Sur Fedora / la famille RHEL / openSUSE, installez plutôt le paquet rpm :

```bash
sudo dnf install ./genoffice-<version>.x86_64.rpm     # Fedora / famille RHEL
sudo zypper install ./genoffice-<version>.x86_64.rpm  # openSUSE
```

L'AppImage s'exécute sur place : installez le runtime FUSE 2
(`sudo apt install libfuse2` ; sur Ubuntu 24.04 le paquet se nomme
`libfuse2t64`), rendez le fichier exécutable, puis lancez-le :

```bash
chmod +x GenOffice-<version>.AppImage
./GenOffice-<version>.AppImage
```

Sur un Chromebook, les mêmes paquets s’exécutent dans l’environnement Linux (Crostini) — les détails sont dans [docs/platforms/chromeos.md](../platforms/chromeos.md).

</details>

## Fonctionnement

Sept applications Electron — Docs, Sheets, Slides, PDF, Markdown, HTML et la
coquille à onglets — partagent une même couche moteur composée de paquets
TypeScript purs, ainsi qu'un sidecar Rust pour le `.xlsx`. Le fichier
d'origine est toujours la source de vérité : les modifications sont
appliquées sous forme de correctifs ciblés, et tout ce que l'éditeur n'a pas
touché survit à l'aller-retour sans altération.

```
open docx ─► archive l'original par hachage (jamais touché)
          ─► analyse word/document.xml en un arbre de blocs, chaque bloc ancré à son XML d'origine
          ─► éditeur Tiptap (édition manuelle + IA, suivi des modifications non enregistrées)
save      ─► blocs modifiés → fragments OOXML (référençant uniquement les styles existants)
          ─► insertion dans le document.xml d'origine ; les blocs non touchés conservent leurs octets
          ─► reconstruction du zip ; chaque autre entrée est copiée octet pour octet
```

La visite guidée paquet par paquet (moteurs docx/pptx, `pdf2docx`,
`html2docx`, le cœur de l'agent et les fournisseurs) se trouve dans
[CONTRIBUTING.md](../../CONTRIBUTING.md#engine-packages).

## Développement

```bash
npm install
npm run fixtures     # génère les fixtures .docx de test
npm test             # tests unitaires moteur + applications (docs/sheets/slides n'ont pas besoin d'affichage)
npm run typecheck    # tsc --noEmit sur tout le workspace
npm run dev          # les six éditeurs + la coquille avec les serveurs de dev Vite
npm run dev:docs     # une seule application (le même schéma fonctionne par workspace)
npm run dist:mac     # empaquette le dmg macOS (régénère les mentions tierces)
npm run dist:win     # empaquette l'installateur nsis Windows
npm run dist:linux   # empaquette l'AppImage + deb + rpm Linux
```

L'application sheets a en outre besoin d'une chaîne d'outils Rust pour son
sidecar xlsx (`cargo` dans le PATH) ; `npm run build -w @genoffice/sheets` le
compile automatiquement. Consultez
[CONTRIBUTING.md](../../CONTRIBUTING.md) pour les vérifications que chaque
modification doit passer et la façon dont les pull requests sont intégrées.

## Communauté

GenOffice est en développement actif et vos retours contribuent à le
façonner.

- **Signalez un bug ou proposez une fonctionnalité** sur
  [GitHub Issues](https://github.com/361533652/genoffice/issues).
- **Rejoignez le salon de discussion GenOffice** sur
  [GenTeam](https://genoffice.ai/join) pour échanger avec l'équipe et les
  autres utilisateurs.
- **Mettez une étoile au dépôt** si GenOffice vous est utile — c'est la
  meilleure façon de soutenir le projet.

## FAQ

<details>
<summary><b>GenOffice est-il gratuit ?</b></summary>

Oui. GenOffice est gratuit et open source sous licence Apache-2.0 — pas
d'essai, pas de palier payant pour les applications elles-mêmes.

</details>

<details>
<summary><b>GenOffice peut-il ouvrir des fichiers Microsoft Word, Excel et PowerPoint ?</b></summary>

Oui. GenOffice ouvre et enregistre des fichiers natifs `.docx`, `.xlsx` et
`.pptx`. L'enregistrement préserve les octets : les parties du fichier que
vous n'avez pas modifiées sont réécrites telles quelles, si bien que vos
documents continuent de fonctionner dans Microsoft Office.

</details>

<details>
<summary><b>GenOffice fonctionne-t-il hors ligne ?</b></summary>

L'édition de documents est entièrement locale — les fichiers ne quittent
jamais votre machine pour être ouverts, modifiés, enregistrés ou convertis.
Les fonctionnalités IA (agents, recherche, outils d'image) nécessitent une
connexion réseau, avec soit une connexion Genspark, soit votre propre clé
d'API de modèle.

</details>

<details>
<summary><b>GenOffice peut-il modifier des fichiers PDF ?</b></summary>

Oui — une véritable édition du texte et des images du PDF, qui réécrit le
flux de contenu de la page en préservant les polices d'origine, et non de
simples annotations de recouvrement.

</details>

<details>
<summary><b>GenOffice peut-il convertir un PDF en Word, Excel ou PowerPoint ?</b></summary>

Oui — entièrement en local : extraction au niveau des caractères via PDFium
combinée à une analyse de mise en page fondée sur la géométrie, sans service
cloud, sans envoi. Les pages scannées sont également prises en charge : sur
macOS et Windows, l'OCR du système les lit, si bien qu'elles sont converties
en texte modifiable plutôt qu'en image de page.

</details>

<details>
<summary><b>Puis-je utiliser mon propre modèle IA ou ma propre clé d'API ?</b></summary>

Oui. Outre la connexion Genspark sans clé, GenOffice prend en charge
l'utilisation de votre propre clé pour Claude, OpenAI, Gemini, DeepSeek,
Kimi, GLM, Qwen, Doubao, MiniMax, Grok, Mistral, OpenRouter, Requesty et OpenCode
Zen/Go, ainsi que tout point de terminaison compatible OpenAI — y compris les
serveurs de modèles locaux. La recherche, la génération d'images et
l'analyse d'images/vidéos utilisent leurs propres clés sous Paramètres → IA
Médias et Recherche.

</details>

<details>
<summary><b>Puis-je désactiver le panneau IA ?</b></summary>

Oui. Paramètres → IA comporte un commutateur **Show the AI sidebar** (Afficher
la barre latérale IA). Une fois désactivé, tous les éditeurs masquent la barre
latérale et les nouveaux documents cessent de l'ouvrir automatiquement. Une
action IA explicite — un bouton du ruban, un élément de menu — ouvre toujours
le panneau pour ce document, et sa fermeture le ramène à l'état masqué.

</details>

<details>
<summary><b>GenOffice peut-il convertir du HTML en Word ?</b></summary>

Oui — Exporter en Word dans l'application HTML produit un `.docx` natif et
modifiable, entièrement en local. La page est rendue dans le moteur Chromium
intégré puis réduite à de véritables structures Word : titres, paragraphes,
listes, tableaux, cartes, lignes de KPI, champs de formulaire et arrière-plans
de page ; seuls les éléments visuels sans équivalent Word (graphiques,
icônes, encadrés décorés) sont intégrés sous forme d'images.

</details>

<details>
<summary><b>Puis-je piloter GenOffice depuis Claude Code, Codex, Cursor ou un script ?</b></summary>

Oui. GenOffice installe une ligne de commande `genoffice` qui exécute les
mêmes moteurs sans interface graphique : inspectez, convertissez, créez,
lisez et modifiez des documents depuis un terminal ou un script, avec une
sortie `--json` pour les programmes. Le skill d'agent fourni apprend à
Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode et Windsurf
à l'utiliser ; installez-le depuis **Réglages → Intégrations**. Voir
[Ligne de commande et skill d'agent](#command-line-and-agent-skill).

</details>

<details>
<summary><b>GenOffice collecte-t-il des données ?</b></summary>

Les versions officielles empaquetées envoient par défaut des analyses
d'usage limitées, et vous pouvez désactiver ce signalement à tout moment sous
Paramètres → Général. Les analyses n'envoient jamais le contenu des
documents, les noms de fichiers, les chemins de fichiers, l'identité du
compte ou les adresses e-mail. Consultez
[GenOffice Privacy](../../PRIVACY.md) pour la liste complète des événements
et des données divulguées.

</details>

## Sécurité

Consultez [SECURITY.md](../../SECURITY.md) pour la posture de sécurité des
processus (isolation du renderer, validation IPC, contrôle des liens
externes) et les modèles de menace concernant le contenu généré par l'IA.

## Remerciements

GenOffice ne serait pas possible sans ces projets open source :

- [Electron](https://www.electronjs.org/) — le runtime de bureau pour chaque
  application.
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — le cœur
  d'interface de feuille de calcul que Sheets étend.
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause, intégré
  via [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer)) — le
  moteur de flux de contenu derrière la véritable édition de texte et
  d'images des PDF.
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) et
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — le rendu PDF et
  l'assemblage de documents.
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  les éditeurs par blocs de Docs et Markdown.
- [CodeMirror](https://codemirror.net/) (MIT) — l'éditeur de source dans
  HTML.
- [Konva](https://konvajs.org/) — le rendu canevas pour Slides et les
  graphiques de Sheets.
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — les métriques de
  mise en forme de texte pour les écritures complexes.
- [calamine](https://github.com/tafia/calamine) et
  [IronCalc](https://github.com/ironcalc/IronCalc) — les couches de lecture
  et de calcul du sidecar xlsx en Rust.
- [libeot](https://github.com/umanwizard/libeot) (MPL-2.0) — le décodeur
  MicroType Express pour les polices PowerPoint intégrées, porté en
  TypeScript.
- [React](https://react.dev/) (MIT) — la couche d'interface utilisateur de
  chaque application.
- [Mermaid](https://mermaid.js.org/) (MIT) et [KaTeX](https://katex.org/)
  (MIT) — les diagrammes et les formules mathématiques dans Markdown et
  Docs.
- [opentype.js](https://opentype.js.org/) (MIT) — l'analyse des polices pour
  les métriques et la recherche de glyphes.
- [JSZip](https://stuk.github.io/jszip/) (MIT) et
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
  (MIT) — les couches de conteneur OOXML et de XML.
- [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons)
  (MIT) — le jeu d'icônes des rubans.
- [electron-updater](https://www.electron.build/) (MIT) — les mises à jour
  intégrées à l'application.
- Les polices Liberation, Carlito, Caladea et Noto CJK (OFL/Apache-2.0) — les
  polices de document intégrées.

`npm run notices` régénère le résumé des licences tierces intégrées
(`tools/gen-third-party-notices.mjs`) ; toutes les dépendances d'exécution
sont sous licence MIT/Apache-2.0/BSD-3-Clause/OFL.

## Licence

GenOffice est distribué sous [licence Apache 2.0](../../LICENSE), avec une
exception : le répertoire `ee/` est réservé aux futurs modules d'entreprise
et est couvert par la [GenOffice Enterprise License](../../ee/LICENSE).

Les noms et logos GenOffice et Genspark sont des marques déposées de
Mainfunc, Inc. La licence Apache-2.0 n'accorde pas la permission de les
utiliser (voir la section 6) ; les forks doivent utiliser leur propre
identité visuelle.
