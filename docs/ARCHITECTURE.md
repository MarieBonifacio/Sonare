# Architecture de Sonare

## Vue d'ensemble

Sonare est une SPA (Single Page Application) React + TypeScript. Elle n'a pas de backend — tout s'exécute dans le navigateur. La seule dépendance réseau optionnelle est l'API Anthropic (génération d'exercices par IA) et les échantillons audio harpe (gleitz CDN, fallback synthèse locale).

---

## Flux de données principal

```
Fichier MusicXML/MXL  |  ExercisePanel  |  LlmPanel (API Claude)
         │                    │                    │
         ▼                    ▼                    ▼
  ScoreLoader.tsx      generateExercise()    llmExercise.ts
  ├── extractMxlContent()  → JSZip → score.xml
  └── parseXmlToNotes()    → xmlParser.ts
         │
         ▼
App.tsx  [notes: Note[], divisions, activeNoteIndices: number[], volumes: number[]]
  ├── jouerDepuis(index)    → boucle setTimeout récursive, durées MusicXML réelles
  ├── getSynth()            → Tone.Sampler (harp samples) + pool PluckSynth fallback
  ├── handleNoteClick(i)    → démarre la lecture depuis la note i
  ├── collectChordGroup()   → indices de toutes les notes de l'accord courant
  └── useMidi()             → événements WebMIDI → validation note attendue
         │
         ├─────────────────────────┬──────────────────────────┐
         ▼                         ▼                          ▼
  HarpModel.tsx             UIControls.tsx             HistoryPanel.tsx
  activeVisualSet           barre de progression        lectures + scores
  (Set<number>)             cliquable (scrubbing)       localStorage
  cordes illuminées
  simultanément
```

---

## Modules

### `src/App.tsx`

Composant racine. Concentre tout l'état global et la logique métier.

| État | Type | Rôle |
|---|---|---|
| `notes` | `Note[]` | Notes extraites de la partition |
| `divisions` | `number` | Ticks MusicXML par noire |
| `volumes` | `number[]` | Volume par note (nuances MusicXML) |
| `activeNoteIndices` | `number[]` | Indices des notes actives (accord complet) |
| `isPlaying` | `boolean` | Lecture en cours |
| `isLooping` | `boolean` | Mode boucle |
| `tempo` | `number` | BPM (40–240) |
| `lang` | `'fr' \| 'en'` | Langue de l'interface |
| `theme` | `'dark' \| 'light'` | Thème visuel |
| `midiResult` | `'correct' \| 'error' \| null` | Retour validation MIDI |

**Fonctions clés :**

- `getSynth()` — import dynamique de Tone.js au premier clic. Crée un `Tone.Sampler` avec les échantillons harpe réels (gleitz CDN) et un pool de 8 `PluckSynth` en fallback hors-ligne.
- `jouerDepuis(index, notes, bpm, divisions, volumes)` — boucle récursive `setTimeout`. Pour chaque note : joue l'audio, met à jour `activeNoteIndices` via `collectChordGroup`, attend la durée MusicXML réelle, passe à la suivante.
- `handleNoteClick(index)` — arrête la lecture en cours, redémarre depuis `index`.
- `handleStop()` — arrête et remet `activeNoteIndices` à `[]`.

**Timing :**
```
msParBeat = 60 000 / bpm
noteMs    = (note.duration / divisions) × msParBeat
```

---

### `src/utils/noteMapper.ts`

Algorithme pur (sans dépendances React).

**`mapPitchToString(pitch)`** — convertit un pitch MusicXML en index de corde (0–35).

Formule : `(octave − 2) × 7 + stepIndex + alter`

```
C2 = index 0  (corde basse / pilier)
C7 = index 35 (corde aiguë / tête de renard)
```

Retourne `-1` si hors plage ou step inconnu.

**`collectChordGroup<T>(notes, baseIdx)`** — retourne les indices `[baseIdx, baseIdx+1, …]` tant que `notes[i].chord !== undefined`. Utilisé dans `jouerDepuis` pour allumer toutes les cordes d'un accord simultanément.

**`getRecommendedFinger(step)`** — doigté pédagogique (1 = pouce … 4 = annulaire).

---

### `src/components/HarpModel.tsx`

Composant **contrôlé** (@react-three/fiber). Reçoit `notes` et `activeNoteIndices: number[]`.

- Géométrie **100 % procédurale** : `CatmullRomCurve3` + `TubeGeometry` pour le pilier courbe et le cou ; `CylinderGeometry` pour les 36 cordes.
- Couleurs : cordes **C** en rouge (`#e63946`), cordes **F** en noir (`#1a1a1a`), autres en gris/blanc selon la convention harpe celtique.
- Corde active : jaune (`#FFE45A`) + `emissiveIntensity: 0.6`.
- `activeVisualSet: Set<number>` calculé par `useMemo` — mappe chaque index de note vers son index de corde via `mapPitchToString`. Plusieurs cordes peuvent être actives simultanément (accords).

> Le modèle GLTF dans `public/models/harp/` est présent mais non utilisé — la harpe est entièrement procédurale.

---

### `src/utils/xmlParser.ts`

- `extractMxlContent(buffer)` — dézippe un `.mxl` (JSZip) et retourne `score.xml`.
- `parseXmlToNotes(xml)` — parse avec `@xmldom/xmldom`, retourne `{ notes: Note[], divisions: number, title: string }`.
  - Extrait : `step`, `octave`, `alter`, `duration`, `chord`, `rest`, `tie`, dynamiques (`<dynamics>` → volume 0–1).

---

### `src/utils/scoreSplitter.ts`

Prépare les notes pour l'affichage VexFlow.

- `buildBeats(notes)` — regroupe les notes en temps (note de base + notes d'accord).
- `splitIntoMeasures(beats, divisions)` — découpe en mesures de 4/4.

---

### `src/components/ScoreDisplay.tsx`

Affichage de la partition en notation musicale réelle via **VexFlow**.

- Reçoit `notes`, `activeNoteIndex`, `divisions`, `showFingering`.
- Calcule les mesures via `scoreSplitter.ts`.
- Rend un SVG scrollable horizontalement.
- Colorie la note active en vert (correct), rouge (erreur) ou vert (normal).
- Scroll automatique vers la mesure active.

---

### `src/components/UIControls.tsx`

Contrôles de lecture. Props :

| Prop | Type | Rôle |
|---|---|---|
| `isPlaying` | `boolean` | État lecture |
| `isLooping` | `boolean` | État boucle |
| `tempo` | `number` | BPM courant |
| `currentNoteIndex` | `number \| null` | Pour la barre de progression |
| `totalNotes` | `number` | Pour la barre de progression |
| `onPlay/onStop` | `() => void` | Callbacks |
| `onLoopToggle` | `() => void` | Bascule boucle |
| `onTempoChange` | `(bpm: number) => void` | Slider tempo |
| `onSeek` | `(index: number) => void` | Clic sur la barre → lecture depuis cet index |

La barre de progression est cliquable : un clic calcule `Math.floor(ratio × totalNotes)` et appelle `onSeek`.

---

### `src/hooks/useMidi.ts`

Gère la connexion WebMIDI (API navigateur, HTTPS ou localhost uniquement).

- Détecte automatiquement les périphériques MIDI entrants.
- Émet des événements `noteOn` avec le numéro MIDI et la vélocité.
- Expose `midiStatus: 'unavailable' | 'no-device' | 'connected'` et `midiDeviceName`.
- Utilisé dans `App.tsx` pour valider la note jouée contre `activeNoteIndices[0]`.

---

### `src/utils/exerciseGenerator.ts`

Génération algorithmique d'exercices.

- Types : gamme, arpège, tierces.
- 6 tonalités : C, G, D, A, F, B♭.
- 3 niveaux : débutant (1 oct.), intermédiaire (2 oct.), avancé (3 oct.).
- Directions : montant, aller-retour (`[...ascending, ...ascending.slice(1).reverse()]`).
- Retourne `Note[]` compatibles avec le reste de l'app.

---

### `src/utils/llmExercise.ts`

Appel à l'API Claude (Anthropic) pour générer un exercice depuis une description en langage naturel.

- Modèle : `claude-sonnet-4-6` (configurable).
- La clé API est stockée en `localStorage` côté client — ne pas exposer en production.
- Retourne `GeneratedExercise` (notes + titre), ou lève une erreur descriptive.

---

### `src/utils/musicxmlExport.ts`

Exporte `Note[]` vers un fichier MusicXML 3.1 téléchargeable.

- `escapeXml(s)` — protège titre et textes contre l'injection XML (`&`, `<`, `>`).
- Génère des mesures de 4/4 avec durées correctes.

---

### `src/utils/history.ts`

Persistance `localStorage` — clé `sonare-history`.

- Maximum 20 entrées (FIFO).
- Par entrée : `id`, `title`, `loadedAt`, `playCount`, `practiceSessions[]`.
- `practiceSessions` : tableau `{ correct, total }` pour calculer le meilleur score.

---

### `src/utils/i18n.ts`

Dictionnaire statique `T['fr' | 'en']`. Toutes les chaînes UI sont centralisées ici.

- `STEP_FR` : mapping `C→Do, D→Ré, E→Mi, F→Fa, G→Sol, A→La, B→Si` pour l'affichage en mode FR.

---

### `src/utils/midiMapper.ts`

`pitchToMidi(step, octave, alter)` — convertit une note MusicXML en numéro MIDI standard (60 = C4).

---

## Structure des fichiers

```
src/
├── App.tsx                    # État global, moteur audio, orchestration
├── main.tsx                   # Point d'entrée React 18
├── styles.css                 # Thème vert forêt, dark/light via CSS variables
├── components/
│   ├── HarpModel.tsx          # Harpe 3D procédurale — 36 cordes (R3F)
│   ├── ScoreLoader.tsx        # Upload + parsing MusicXML/MXL
│   ├── ScoreDisplay.tsx       # Notation musicale VexFlow
│   ├── UIControls.tsx         # Lecture / arrêt / tempo / boucle / scrubbing
│   ├── ExercisePanel.tsx      # Formulaire d'exercices progressifs
│   ├── LlmPanel.tsx           # Génération d'exercices par IA (API Claude)
│   └── HistoryPanel.tsx       # Historique des partitions et scores
├── hooks/
│   └── useMidi.ts             # WebMIDI — connexion + événements note
└── utils/
    ├── noteMapper.ts          # Pitch → index corde (0–35) + collectChordGroup
    ├── xmlParser.ts           # XML/MXL → Note[] + divisions + title
    ├── scoreSplitter.ts       # Note[] → mesures (beats) pour VexFlow
    ├── exerciseGenerator.ts   # Gammes / arpèges / tierces → Note[]
    ├── llmExercise.ts         # Description → exercice via Claude API
    ├── musicxmlExport.ts      # Note[] → fichier MusicXML téléchargeable
    ├── midiMapper.ts          # Pitch MusicXML → numéro MIDI
    ├── history.ts             # Persistance localStorage
    └── i18n.ts                # Traductions FR / EN + STEP_FR

public/
├── models/harp/               # Unity2Skfb.gltf (présent, non utilisé)
└── scores/
    └── Peaceful_Waters.mxl    # Partition d'exemple

docs/
├── ARCHITECTURE.md            # Ce fichier
└── ROADMAP.md                 # Feuille de route

.github/
└── workflows/
    └── ci.yml                 # lint → tests → coverage → build (Node 22)
```

---

## Contraintes importantes

- **Offline-first** : tout fonctionne sans réseau (sauf API Claude et échantillons harpe CDN).
- **Audio lazily loaded** : Tone.js est importé dynamiquement au premier clic (réduction du bundle initial).
- **Sampler avec fallback** : `Tone.Sampler` charge les échantillons en arrière-plan ; le pool `PluckSynth` prend le relais immédiatement si le CDN est inaccessible.
- **Accords simultanés** : `activeNoteIndices: number[]` permet d'allumer plusieurs cordes en même temps. `collectChordGroup` collecte toutes les notes d'un accord MusicXML (structure plate : note de base + notes avec `chord !== undefined`).
- **Typage strict** : `strict: true`, `noUnusedLocals`, `noUnusedParameters` — vérifiés à chaque `npm run build` (`tsc -b`).
- **MIDI** : WebMIDI API requiert HTTPS (ou `localhost`). En HTTP sur réseau local, le hook renvoie `midiStatus: 'unavailable'` sans erreur bloquante.
