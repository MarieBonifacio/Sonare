# Sonare — CLAUDE.md

## Project Overview

Sonare is a React + TypeScript web application that parses MusicXML music scores and visualizes them on an interactive 3D harp model. Users upload a `.musicxml`, `.xml`, or `.mxl` file; the app extracts notes and highlights the corresponding strings on a 3D rendered harp.

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
| tone.js | 15.0 | Web Audio API (imported, not yet wired up) |
| @tonejs/midi | 2.0 | MIDI parsing (imported, not yet wired up) |
| JSZip | 3.10 | Decompresses `.mxl` (ZIP) files |
| xmldom | 0.6 | DOM-based XML parser (browser-compatible) |
| musicxml-interfaces | 0.0.21 | TypeScript types for MusicXML notes |
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
│   ├── App.tsx                 # Root component — state + layout
│   ├── styles.css              # Global styles (Roboto, emerald green theme)
│   ├── vite-env.d.ts           # Vite type shims
│   ├── assets/
│   │   └── react.svg
│   └── components/
│       ├── HarpModel.tsx       # 3D harp string renderer (react-three/fiber)
│       ├── ScoreLoader.tsx     # MusicXML file upload + parser
│       └── UIControls.tsx      # Stub — currently empty
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
```

No test suite exists yet.

---

## Architecture & Data Flow

```
User uploads file
      │
      ▼
ScoreLoader.tsx
  ├── Reads ArrayBuffer via FileReader
  ├── If .mxl → JSZip decompresses → extracts score.xml
  ├── DOMParser (xmldom) parses XML
  └── Emits Note[] via onLoad callback
      │
      ▼
App.tsx  (notes state: Note[])
  ├── Renders note cards in .notes-container grid
  └── Passes notes[] to HarpModel
          │
          ▼
      HarpModel.tsx
        ├── mapPitchToString() maps Note pitch → string index (0–36)
        └── Renders 37 cylinder meshes; active string highlighted yellow
```

---

## Component Reference

### `App.tsx`
- Root component holding `notes` state (`useState<any[]>`)
- Layout: `.header` (ScoreLoader) | `.content` (notes grid + Canvas) | `.footer`
- Passes `notes` down to `<HarpModel useManualStrings={true} notes={notes} />`
- Camera positioned at `[0, 0, 20]` with `fov: 75`

### `ScoreLoader.tsx`
- Props: `{ onLoad: (notes: Note[]) => void }`
- Accepts `.musicxml`, `.xml`, `.mxl` via hidden `<input type="file">`
- MXL decompression looks specifically for `score.xml` inside the ZIP
- Uses `xmldom`'s `DOMParser` (not the browser native one) for XML parsing
- Extracts per-note: `step` (C–B), `octave` (int), `duration` (int), `alter` (int, default 0)

### `HarpModel.tsx` (exported as `HarpStringModel`)
- Props: `{ useManualStrings?: boolean; notes: any[] }`
- `mapPitchToString(pitch)` → `stepIndex + octave * 7 + alter`, clamped to 0–36
- `useEffect` on `notes` sets `activeString` to the first note's mapped string index
- 37 `<mesh>` cylinders; spacing: `zPosition = index * 0.5 - (37 * 0.5) / 2`
- String length increases with index: `1 + index * 0.5` (range 1–18.5 units)
- Click on a string sets `activeString` manually
- Active string: `yellow`; others: `hsl(index * 10, 100%, 50%)`

### `UIControls.tsx`
- Currently an empty file — no exports or logic yet

---

## Code Conventions

### Language
- UI labels and code comments are written in **French** — continue this convention
- Example: `// État pour stocker les notes extraites de la partition`

### TypeScript
- Strict mode is on (`strict: true` in tsconfig.app.json)
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` are enabled
- **Known issue**: `App.tsx` uses `any[]` for notes instead of `Note[]` — prefer fixing when touching that file

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
Recent examples: `feat: implement MusicXML parsing and note handling`, `fix-css-and-start-mapping`

---

## Known Issues & TODOs

| Area | Issue |
|---|---|
| `App.tsx:10` | `notes` typed as `any[]` — should be `Note[]` from `musicxml-interfaces` |
| `UIControls.tsx` | Empty stub, needs implementation |
| Audio | `tone` and `@tonejs/midi` installed but not used anywhere |
| Tests | No test suite exists (no Vitest, Jest, or similar) |
| CI/CD | No `.github/workflows` — no automated checks on push |
| GLTF model | `public/models/harp/Unity2Skfb.gltf` is loaded but `HarpModel` uses procedural cylinders, not the GLTF model |
| Note playback | Only the first note is highlighted; sequential playback is not implemented |

---

## Key Algorithms

### Note-to-string mapping (`HarpModel.tsx:9-17`)
```ts
const notesOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const stringIndex = stepIndex + pitch.octave * 7 + pitch.alter;
// Valid range: 0–36 (37 strings total)
```
This maps diatonic notes linearly: C4 = 4*7 = 28, D4 = 29, … with `alter` (±1) for accidentals.

### MXL decompression (`ScoreLoader.tsx:41-53`)
JSZip opens the ZIP archive and looks for exactly `score.xml` by filename. Other XML files inside the archive are ignored.
