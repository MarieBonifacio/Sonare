# Sonare

Logiciel d'apprentissage de la harpe : import de partitions MusicXML, visualisation 3D interactive synchronisée avec la lecture audio, exercices progressifs, pratique MIDI et génération d'exercices par IA.

## Fonctionnalités

- **Import de partitions** `.musicxml`, `.xml`, `.mxl` avec décompression ZIP intégrée
- **Harpe 3D interactive** — modèle renard procédural (36 cordes celtiques), rotation/zoom libre
- **Lecture séquentielle** avec durées MusicXML réelles, tempo ajustable (40–240 BPM)
- **Synthèse audio Karplus-Strong** (PluckSynth Tone.js) — timbre de corde pincée réaliste
- **Dynamiques** — nuances MusicXML (p, mf, f…) traduites en volume par note
- **Boucle** — lecture en boucle continue sur la partition chargée
- **Pratique MIDI** — connexion WebMIDI automatique, retour visuel note correcte/incorrecte
- **Exercices progressifs** — gammes, arpèges, tierces — 6 tonalités, 3 niveaux, aller-retour
- **Exercices par IA** — description en langage naturel → exercice généré via Claude (clé API optionnelle)
- **Export MusicXML** — téléchargement de la partition active ou de l'exercice en cours
- **Historique** — morceaux chargés, nombre de lectures, sessions de pratique, meilleur score
- **Mode doigté** — affiche le doigt recommandé pour chaque note
- **Interface bilingue** FR / EN avec persistance
- **Thème sombre / clair** avec persistance

## Démarrage rapide

```bash
npm install
npm run dev        # Serveur de développement → http://localhost:5173
```

Un fichier MusicXML d'exemple est disponible dans `public/scores/Peaceful_Waters.mxl`.

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur Vite (hot reload) |
| `npm run build` | Type-check TypeScript + build production |
| `npm run preview` | Servir le build de production en local |
| `npm run lint` | ESLint + Prettier sur tous les fichiers |
| `npm test` | Suite de tests Vitest (run unique) |
| `npm run test:watch` | Tests en mode watch |
| `npm run coverage` | Rapport de couverture HTML |

## Architecture

```
src/
├── App.tsx                       # Composant racine — état global + mise en page
├── main.tsx                      # Point d'entrée React 18
├── styles.css                    # Styles globaux (thème vert profond, dark/light)
├── components/
│   ├── HarpModel.tsx             # Rendu 3D procédural (@react-three/fiber)
│   ├── ScoreLoader.tsx           # Upload + parsing MusicXML/MXL
│   ├── UIControls.tsx            # Lecture/arrêt, tempo, boucle, progression
│   ├── ExercisePanel.tsx         # Sélecteur d'exercices progressifs
│   ├── LlmPanel.tsx              # Génération d'exercices par description IA
│   ├── HistoryPanel.tsx          # Historique de pratique
│   └── (HarpModel gère le fox harp 36 cordes)
├── hooks/
│   └── useMidi.ts                # WebMIDI API — détection + événements note
└── utils/
    ├── xmlParser.ts              # Extraction Note[] depuis XML/MXL (JSZip + xmldom)
    ├── noteMapper.ts             # Pitch MusicXML → index de corde (0–35)
    ├── midiMapper.ts             # Note MusicXML → numéro MIDI
    ├── exerciseGenerator.ts      # Génération gammes/arpèges/tierces
    ├── llmExercise.ts            # Appel Claude API (claude-sonnet-4-6)
    ├── musicxmlExport.ts         # Export Note[] → MusicXML 3.1
    ├── history.ts                # Persistance localStorage (chargements, sessions)
    └── i18n.ts                   # Dictionnaire FR/EN
```

### Flux de données

```
Fichier MusicXML / Exercice généré
    → ScoreLoader / ExercisePanel / LlmPanel
    → App.tsx [notes: Note[], activeNoteIndex, volumes]
    ├── HarpModel — corde active illuminée (Three.js)
    ├── UIControls — lecture Tone.js (PluckSynth), tempo, progression
    ├── useMidi — entrée MIDI → comparaison note attendue
    └── musicxmlExport — téléchargement MusicXML
```

## Stack technique

| Outil | Version | Rôle |
|---|---|---|
| Vite | 6.0 | Build & dev server |
| React | 18.3 | Framework UI |
| TypeScript | 5.6 | Typage strict (strict, noUnusedLocals) |
| Three.js | 0.171 | Moteur 3D |
| @react-three/fiber | 8.17 | Renderer React pour Three.js |
| @react-three/drei | 9.120 | OrbitControls |
| Tone.js | 15.0 | Synthèse audio Web (PluckSynth) |
| @anthropic-ai/sdk | 0.90 | Génération d'exercices LLM (Claude) |
| JSZip | 3.10 | Décompression `.mxl` |
| @xmldom/xmldom | 0.9.6 | Parser XML compatible navigateur |
| musicxml-interfaces | 0.0.21 | Types TypeScript MusicXML |
| Vitest | 2.x | Tests unitaires |
| ESLint | 9.17 | Linting (flat config) |
| Prettier | 3.4 | Formatage |

## Tests

```bash
npm test             # Lance les 112 tests une fois
npm run test:watch   # Mode watch (développement)
npm run coverage     # Rapport de couverture HTML
```

Les 8 fichiers de test couvrent :

| Fichier | Tests |
|---|---|
| `xmlParser.test.ts` | Parsing XML/MXL, silences, accords, liaisons, dynamiques |
| `exerciseGenerator.test.ts` | Gammes, arpèges, tierces, 6 tonalités, aller-retour |
| `noteMapper.test.ts` | Mapping pitch → corde, limites, altérations |
| `musicxmlExport.test.ts` | Export XML, mesures, types de durée, accidentels |
| `history.test.ts` | Chargement, lecture, pratique, sessions, max 20 entrées |
| `midiMapper.test.ts` | Conversion note → MIDI, altérations, octaves |
| `ScoreLoader.test.tsx` | Rendu, input file, formats acceptés |
| `UIControls.test.tsx` | Boutons, slider tempo, boucle, barre de progression |

## Limitations connues

| Zone | Limitation |
|---|---|
| Tests | Pas de tests de composants React complexes (App, HarpModel, LlmPanel) ni de tests E2E |
| GLTF | Un modèle `public/models/harp/` est présent mais non utilisé — la harpe est procédurale |
| LLM | La clé API Anthropic est gérée côté client (localStorage) — ne pas utiliser en production publique sans proxy |
| Audio | Pas d'échantillons réels de harpe — synthèse Karplus-Strong uniquement |
