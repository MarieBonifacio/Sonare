# Sonare

Logiciel d'apprentissage de la harpe : visualisation 3D interactive synchronisée avec l'import de partitions MusicXML.

## Fonctionnalités

- Import de partitions `.musicxml`, `.xml`, `.mxl`
- Harpe 3D interactive (37 cordes) — rotation/zoom à la souris
- Lecture séquentielle des notes avec mise en évidence de la corde active
- Audio synthétisé (ton triangle, rendu harpistique) via Tone.js
- Contrôle du tempo (40–240 BPM)

## Démarrage rapide

```bash
npm install
npm run dev        # Serveur de développement → http://localhost:5173
```

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur Vite (hot reload) |
| `npm run build` | Type-check TypeScript + build production |
| `npm run preview` | Servir le build de production en local |
| `npm run lint` | ESLint sur tous les fichiers |
| `npm test` | Suite de tests Vitest |
| `npm run coverage` | Rapport de couverture de tests |

## Architecture

```
src/
├── App.tsx                  # Composant racine — état + mise en page
├── main.tsx                 # Point d'entrée React 18
├── styles.css               # Styles globaux (thème vert émeraude)
├── components/
│   ├── HarpModel.tsx        # Rendu 3D des cordes (@react-three/fiber)
│   ├── ScoreLoader.tsx      # Upload + parsing MusicXML
│   └── UIControls.tsx       # Bouton lecture/arrêt + slider tempo
└── utils/
    ├── noteMapper.ts        # Mapping pitch MusicXML → index de corde (0–36)
    └── xmlParser.ts         # Extraction de notes depuis XML/MXL
```

### Flux de données

```
Fichier MusicXML
    → ScoreLoader (xmlParser.ts)
    → App.tsx [notes: Note[], activeNoteIndex]
    → HarpModel (noteMapper.ts) — corde illuminée en jaune
    → UIControls — lecture audio (Tone.js PolySynth)
```

## Stack technique

| Outil | Version | Rôle |
|---|---|---|
| Vite | 6.0 | Build & dev server |
| React | 18.3 | Framework UI |
| TypeScript | 5.6 | Typage strict |
| Three.js | 0.171 | Moteur 3D |
| @react-three/fiber | 8.17 | Renderer React pour Three.js |
| Tone.js | 15.0 | Synthèse audio Web |
| JSZip | 3.10 | Décompression `.mxl` |
| xmldom | 0.6 | Parser XML compatible navigateur |
| Vitest | 2.x | Tests unitaires |

## Tests

```bash
npm test             # Lance les tests une fois
npm run test:watch   # Mode watch (développement)
npm run coverage     # Rapport de couverture HTML
```

Les tests couvrent :
- `noteMapper.ts` — mapping note→corde (11 cas)
- `xmlParser.ts` — parsing XML/MXL (7 cas, dont gestion d'erreurs)

## Fichiers de test inclus

Un fichier MusicXML d'exemple est disponible :

```
public/scores/Peaceful_Waters.mxl
```

## Limitations connues

| Zone | Limitation |
|---|---|
| Mapping cordes | 37 cordes couvrent C0–G5 ; les harpes réelles en ont 47 |
| Playback | Durées MusicXML ignorées ; tempo = 1 note/battement |
| Audio | Synthèse triangle ; pas d'échantillons réels de corde de harpe |
| GLTF | Modèle 3D `public/models/harp/` présent mais non utilisé (cordes procédurales) |
| Tests | Pas de tests de composants React ni de tests E2E |
