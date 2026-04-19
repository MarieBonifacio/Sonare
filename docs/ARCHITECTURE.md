# Architecture de Sonare

## Vue d'ensemble

Sonare est une SPA (Single Page Application) React + TypeScript. Elle n'a pas de backend — tout s'exécute dans le navigateur.

## Flux de données

```
Fichier MusicXML/MXL
        │
        ▼
ScoreLoader.tsx
  ├── lireFichier()         → ArrayBuffer via FileReader
  ├── extractMxlContent()   → dézippe .mxl avec JSZip → score.xml
  └── parseXmlToNotes()     → Note[] + divisions (xmlParser.ts)
        │
        ▼
App.tsx  [notes: Note[], divisions: number, activeNoteIndex: number | null]
  ├── jouerDepuis()         → setTimeout récursif, durées issues des divisions
  ├── getSynth()            → Tone.PolySynth (import() dynamique)
  └── scrollIntoView()      → useEffect sur activeNoteIndex
        │
        ├──────────────────────────────────────┐
        ▼                                      ▼
HarpModel.tsx                         UIControls.tsx
  ├── useGLTF()  → corps 3D GLTF        ├── bouton Lecture / Arrêter
  └── mapPitchToString() → corde active └── slider Tempo (40–240 BPM)
        (noteMapper.ts)
```

## Modules

### `src/utils/noteMapper.ts`
Algorithme pur (sans dépendances React) : convertit un pitch MusicXML en index de corde (0–36).

```ts
mapPitchToString({ step: 'C', octave: 4, alter: 0 }) // → 28
```

Formule : `stepIndex + octave * 7 + alter`

### `src/utils/xmlParser.ts`
Deux fonctions exportées :
- `extractMxlContent(buffer)` — dézippe un `.mxl` et retourne le XML brut
- `parseXmlToNotes(xml)` — parse le XML et retourne `{ notes: Note[], divisions: number }`

### `src/components/HarpModel.tsx`
Composant **contrôlé** : reçoit `notes` et `activeNoteIndex` en props, ne gère aucun état interne. Affiche le corps GLTF (`useGLTF`) et 37 cordes procédurales (cylindres Three.js).

### `src/components/ScoreLoader.tsx`
Gère l'upload de fichier. Délègue le parsing à `xmlParser.ts`. Expose les états `chargement` et `erreur` dans l'UI.

### `src/components/UIControls.tsx`
Composant sans état propre : bouton Lecture/Arrêter + slider Tempo. Toute la logique est dans `App.tsx`.

## Contraintes importantes

- **Offline-first** : aucun appel réseau obligatoire
- **Audio lazily loaded** : Tone.js est importé dynamiquement au premier clic sur Lecture pour ne pas alourdir le chargement initial
- **GLTF via Suspense** : `useGLTF` est asynchrone, le composant `HarpModel` est enveloppé dans un `<Suspense fallback={null}>` dans `App.tsx`
- **Cordes procédurales** : le modèle GLTF fournit le corps visuel ; les 37 cordes restent des cylindres Three.js pour pouvoir les colorer individuellement

## Structure des fichiers

```
src/
├── App.tsx                  # État global + orchestration lecture
├── main.tsx                 # Point d'entrée React 18
├── styles.css               # Styles globaux
├── components/
│   ├── HarpModel.tsx        # Corps GLTF + cordes 3D
│   ├── ScoreLoader.tsx      # Upload + parsing
│   └── UIControls.tsx       # Contrôles de lecture
└── utils/
    ├── noteMapper.ts        # pitch → index corde
    └── xmlParser.ts         # XML/MXL → Note[]

public/
├── models/harp/             # Unity2Skfb.gltf + textures
└── scores/
    └── Peaceful_Waters.mxl  # Partition d'exemple
```
