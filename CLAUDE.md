# Sonare — CLAUDE.md

## Project Overview

Sonare is a React + TypeScript web application that parses MusicXML music scores and visualizes them on an interactive 3D harp model. Users upload a `.musicxml`, `.xml`, or `.mxl` file; the app extracts notes and highlights the corresponding strings on a 3D rendered harp while playing audio via Tone.js.

---

## Tech Stack

| Tool | Version | Role |
|---|---|---|
| Vite | 6.0 | Build tool & dev server |
| React | 18.3 | UI framework |
| TypeScript | 5.6 | Type safety (strict mode) |
| Three.js | 0.171 | 3D rendering |
| @react-three/fiber | 8.17 | React renderer for Three.js |
| @react-three/drei | 9.120 | Three.js helpers (OrbitControls, etc.) |
| Tone.js | 15.0 | Web Audio API — PolySynth triangle oscillator |
| @tonejs/midi | 2.0 | MIDI parsing (installed, not yet wired up) |
| JSZip | 3.10 | Decompresses `.mxl` (ZIP) files |
| @xmldom/xmldom | 0.9.6 | DOM-based XML parser (browser-compatible) |
| musicxml-interfaces | 0.0.21 | TypeScript types for MusicXML notes |
| Vitest | 2.x | Unit test runner |
| ESLint | 9.17 | Linting (flat config format) |
| Prettier | 3.4 | Code formatting |

---

## Directory Structure

```
Sonare/
├── index.html                  # Vite HTML entry point
├── vite.config.ts              # Vite config — includes GLTF asset handling
├── tsconfig.json               # TS project references root
├── tsconfig.app.json           # App TS config (strict, ES2020, react-jsx)
├── tsconfig.node.json          # Node/Vite TS config
├── eslint.config.js            # ESLint flat config (v9+)
├── .prettierrc                 # Prettier config
├── package.json                # Dependencies and scripts
├── src/
│   ├── main.tsx                # React 18 entry — mounts <App> into #root
│   ├── App.tsx                 # Root component — state + layout + audio engine
│   ├── styles.css              # Global styles (Roboto, emerald green theme)
│   ├── vite-env.d.ts           # Vite type shims
│   ├── assets/
│   │   └── react.svg
│   ├── components/
│   │   ├── HarpModel.tsx       # 3D harp string renderer (react-three/fiber)
│   │   ├── ScoreLoader.tsx     # MusicXML file upload + parser
│   │   ├── ScoreLoader.test.tsx
│   │   ├── UIControls.tsx      # Play/Stop button + Tempo slider
│   │   └── UIControls.test.tsx
│   └── utils/
│       ├── noteMapper.ts       # Pitch → string index (0–36) mapping
│       ├── noteMapper.test.ts
│       ├── xmlParser.ts        # MusicXML note extraction
│       └── xmlParser.test.ts
└── public/
    ├── models/harp/            # GLTF harp model + textures (Unity2Skfb.gltf/.bin)
    └── scores/
        └── Peaceful_Waters.mxl # Sample MusicXML score for testing
```

---

## Development Commands

```bash
npm run dev       # Start Vite dev server (hot reload)
npm run build     # Type-check then Vite production build
npm run lint      # Run ESLint across all files
npm run preview   # Serve the production build locally
npm test          # Run unit tests once (Vitest)
npm run test:watch  # Run tests in watch mode
npm run coverage  # Generate HTML coverage report
```

---

## Architecture & Data Flow

```
User uploads file
      │
      ▼
ScoreLoader.tsx
  ├── Reads ArrayBuffer via FileReader
  ├── If .mxl → JSZip decompresses → extracts score.xml
  ├── DOMParser (@xmldom/xmldom) parses XML
  └── Emits Note[] + divisions via onLoad callback
      │
      ▼
App.tsx  (notes: Note[], divisions, activeNoteIndex, isPlaying, tempo)
  ├── Renders note cards in .notes-container grid (scroll-synced to active)
  ├── Passes notes[] + activeNoteIndex to HarpModel
  └── UIControls triggers play/stop → jouerDepuis() recursive timer loop
          │
          ▼
      HarpModel.tsx
        ├── mapPitchToString() maps Note pitch → string index (0–36)
        └── Renders 37 cylinder meshes; active string highlighted yellow
```

### Audio engine (`App.tsx`)

Tone.js is loaded eagerly. `getSynth()` lazily initialises a `PolySynth` (triangle oscillator) on first play. `jouerDepuis()` is a recursive `setTimeout` loop that honours real MusicXML note durations (converted from `divisions` units to milliseconds at the current BPM).

---

## Component Reference

### `App.tsx`
- Root component holding `notes: Note[]`, `divisions`, `activeNoteIndex`, `isPlaying`, `tempo` state
- Layout: `.header` (ScoreLoader) | `.content` (notes grid + Canvas) | `.footer`
- `getSynth()` — lazy singleton `Tone.PolySynth` (triangle oscillator)
- `jouerNote(note)` — plays one pitch via the synth; silently ignores out-of-range notes
- `jouerDepuis(index, notes, bpm, divisions)` — recursive playback loop with real durations
- Passes `notes` and `activeNoteIndex` to `<HarpModel>` and `<UIControls>`
- Camera positioned at `[0, 0, 20]` with `fov: 75`

### `ScoreLoader.tsx`
- Props: `{ onLoad: (notes: Note[], divisions: number) => void }`
- Accepts `.musicxml`, `.xml`, `.mxl` via hidden `<input type="file">`
- MXL decompression looks specifically for `score.xml` inside the ZIP
- Uses `@xmldom/xmldom`'s `DOMParser` (not the browser native one) for XML parsing
- Extracts per-note: `step` (C–B), `octave` (int), `duration` (int), `alter` (int, default 0)

### `HarpModel.tsx`
- Props: `{ notes: Note[]; activeNoteIndex: number | null }`
- Delegates pitch→string mapping to `noteMapper.ts::mapPitchToString()`
- 37 `<mesh>` cylinders; spacing: `zPosition = index * 0.5 - (37 * 0.5) / 2`
- String length increases with index: `1 + index * 0.5` (range 1–18.5 units)
- Click on a string sets `activeString` manually
- Active string: `yellow`; others: `hsl(index * 10, 100%, 50%)`

### `UIControls.tsx`
- Props: `{ isPlaying, tempo, onPlay, onStop, onTempoChange, disabled }`
- Single toggle button: `▶ Lecture` when stopped, `⏹ Arrêter` when playing
- Tempo slider: 40–240 BPM (disabled during playback)

---

## Utils Reference

### `noteMapper.ts`
- `mapPitchToString(pitch: Pitch): number` — returns 0–36 or -1 if out of range
- Formula: `stepIndex + octave * 7 + alter`, clamped to `[0, STRING_COUNT)`
- `STRING_COUNT = 37`; `NOTE_ORDER = ['C','D','E','F','G','A','B']`

### `xmlParser.ts`
- Parses a raw XML string using `@xmldom/xmldom`
- Returns `{ notes: Note[]; divisions: number }`
- Handles `.mxl` decompression upstream (in `ScoreLoader`)

---

## Tests

```bash
npm test          # Run all tests once
npm run coverage  # HTML coverage report (opens in browser)
```

Current test suite: **34 tests across 4 files**

| File | Tests |
|---|---|
| `utils/noteMapper.test.ts` | 11 — pitch→string mapping, edge cases |
| `utils/xmlParser.test.ts` | 11 — XML/MXL parsing, error handling |
| `components/ScoreLoader.test.tsx` | 4 — file upload, invalid input |
| `components/UIControls.test.tsx` | 8 — play/stop/tempo interactions |

---

## Code Conventions

### Language
- UI labels and code comments are written in **French** — continue this convention
- Example: `// État pour stocker les notes extraites de la partition`

### TypeScript
- Strict mode is on (`strict: true` in tsconfig.app.json)
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` are enabled
- All state is properly typed: `notes` is `Note[]` from `musicxml-interfaces`

### Formatting (Prettier)
- Semicolons: `true`
- Quotes: single (`'`) for JS/TS, single for JSX
- Trailing commas: `all`
- Run `npm run lint` before committing to catch Prettier and ESLint issues

### ESLint
- Flat config (`eslint.config.js`) — ESLint v9+ format
- React plugin enabled; `react/prop-types` rule disabled (TypeScript handles it)
- `eslint-plugin-react-refresh` enforces only component exports from modules

### Component style
- Functional components with `React.FC<Props>` typing
- Props interfaces defined inline above the component
- Default exports at the bottom of each file
- Internal helper functions defined as `const` above the component

### Styling
- Global styles in `src/styles.css` — no CSS modules or styled-components
- Emerald green accent: `#2ecc71` / `#27ae60`
- Background: `#f0f2f5`; text: `#333`; headings: `#2c3e50`
- Card pattern: white background, `border-radius: 10px`, box-shadow
- Inline styles acceptable for one-off layout (see ScoreLoader)

---

## Git Conventions

Branch naming: `kebab-case` (e.g., `feat-score-loader`, `fix-chord-display`)

Commit message style: conventional commits prefix
```
feat: <description>
fix: <description>
```

---

## Known Issues & TODOs

| Area | Issue |
|---|---|
| GLTF model | `public/models/harp/Unity2Skfb.gltf` is loaded but `HarpModel` uses procedural cylinders, not the GLTF mesh |
| Audio polyphony | `jouerDepuis` plays one note at a time; chord notes (`<chord/>`) are not yet handled |
| Tied notes | `<tie type="stop"/>` is not yet parsed; tied notes are re-attacked instead of held |
| @tonejs/midi | Installed but not yet used anywhere |
| CI/CD | No `.github/workflows` — no automated checks on push |
| String range | 37 strings cover C0–G5; real concert harps have 47 strings (C1–G7) |

---

## Key Algorithms

### Note-to-string mapping (`utils/noteMapper.ts`)
```ts
const NOTE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const stringIndex = stepIndex + pitch.octave * 7 + pitch.alter;
// Valid range: 0–36 (37 strings total); returns -1 if out of range
```
This maps diatonic notes linearly: C4 → 4×7=28, D4 → 29, … with `alter` (±1) for accidentals.

### MXL decompression (`ScoreLoader.tsx`)
JSZip opens the ZIP archive and looks for exactly `score.xml` by filename. Other XML files inside the archive are ignored.

### Playback timing (`App.tsx — jouerDepuis`)
```
msPerBeat = 60_000 / bpm
noteMs   = (note.duration / divisions) * msPerBeat
```
`divisions` is the number of MusicXML ticks per quarter note, read directly from `<divisions>` in the score.
