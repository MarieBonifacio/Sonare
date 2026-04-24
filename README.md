# Sonare

Application d'apprentissage de la harpe — visualisation 3D interactive synchronisée avec l'import de partitions MusicXML, génération d'exercices techniques, et retour MIDI en temps réel.

## Fonctionnalités

- **Import de partitions** `.musicxml`, `.xml`, `.mxl` — décompression ZIP incluse
- **Harpe celtique 36 cordes en 3D** (C2–C7, accord do majeur diatonique) — rotation / zoom à la souris
- **Couleurs de repère** : cordes C en rouge, cordes F en noir, convention harpe celtique
- **Lecture synchronisée** — corde active mise en évidence, défilement automatique des notes, durées MusicXML réelles
- **Audio PluckSynth** (synthèse de corde Karplus-Strong) via Tone.js — tempo 40–240 BPM, boucle de lecture
- **Doigté recommandé** — affichage pédagogique pouce–annulaire par note
- **Exercices techniques** — gammes, arpèges, tierces ; 6 tonalités (C, G, D, A, F, B♭) ; 3 niveaux
- **Génération par langage naturel** — description libre → exercice via API Claude (Anthropic)
- **Export MusicXML** de la partition chargée ou de l'exercice généré
- **Historique** des partitions chargées : compteurs de lectures, sessions de pratique, meilleur score
- **MIDI entrant** (WebMIDI API) — validation des notes jouées sur un clavier physique
- **Interface bilingue** FR / EN (mémorisé dans `localStorage`)
- **Thème sombre / clair** (mémorisé dans `localStorage`)

## Démarrage rapide

```bash
npm install
npm run dev        # Serveur de développement → http://localhost:5173
```

> **API Claude (optionnel)** : la génération d'exercices par langage naturel requiert une clé API Anthropic. Saisissez-la dans le panneau LLM directement dans l'interface. Ne déployez pas de clé côté client en production.

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur Vite (hot reload) |
| `npm run build` | Type-check TypeScript + build production |
| `npm run preview` | Servir le build de production en local |
| `npm run lint` | ESLint + Prettier sur tous les fichiers |
| `npm test` | Suite de tests Vitest (une fois) |
| `npm run test:watch` | Tests en mode watch |
| `npm run coverage` | Rapport de couverture HTML |

## Architecture

```
src/
├── App.tsx                    # Composant racine — état global + moteur audio + mise en page
├── main.tsx                   # Point d'entrée React 18
├── styles.css                 # Styles globaux (thème vert forêt, dark/light, CSS variables)
├── components/
│   ├── HarpModel.tsx          # Harpe 3D procédurale (@react-three/fiber) — 36 cordes
│   ├── ScoreLoader.tsx        # Upload + parsing MusicXML/MXL
│   ├── UIControls.tsx         # Lecture / arrêt / tempo / boucle / barre de progression
│   ├── ExercisePanel.tsx      # Générateur d'exercices (formulaire)
│   ├── LlmPanel.tsx           # Génération par langage naturel (API Claude)
│   └── HistoryPanel.tsx       # Historique des partitions et scores
├── hooks/
│   └── useMidi.ts             # Entrée MIDI (WebMIDI API)
└── utils/
    ├── noteMapper.ts          # Pitch MusicXML → index de corde (0–35)
    ├── harpTuning.ts          # Table des 36 cordes : note, fréquence, couleur
    ├── xmlParser.ts           # Extraction de notes depuis XML/MXL
    ├── exerciseGenerator.ts   # Génération algorithmique d'exercices
    ├── llmExercise.ts         # Appel API Claude (génération langage naturel)
    ├── musicxmlExport.ts      # Export MusicXML des notes
    ├── midiMapper.ts          # Pitch → numéro MIDI
    ├── history.ts             # Persistance historique (localStorage)
    └── i18n.ts                # Traductions FR / EN
```

### Flux de données

```
Fichier MusicXML / Exercice généré
    → ScoreLoader / ExercisePanel / LlmPanel
    → App.tsx [notes: Note[], activeNoteIndex, volumes[]]
    ├── HarpModel (noteMapper + harpTuning) — corde active illuminée
    └── UIControls — lecture audio (Tone.js PluckSynth) + progression
          └── useMidi — validation MIDI entrant → feedback correct / erreur
```

## Stack technique

| Outil | Version | Rôle |
|---|---|---|
| Vite | 6.0 | Build & dev server |
| React | 18.3 | Framework UI |
| TypeScript | 5.6 | Typage strict |
| Three.js | 0.171 | Moteur 3D |
| @react-three/fiber | 8.17 | Renderer React pour Three.js |
| @react-three/drei | 9.120 | OrbitControls + helpers Three.js |
| Tone.js | 15.0 | Synthèse audio Web (PluckSynth) |
| @tonejs/midi | 2.0 | Parsing MIDI |
| @anthropic-ai/sdk | 0.90 | API Claude (génération LLM) |
| JSZip | 3.10 | Décompression `.mxl` |
| @xmldom/xmldom | 0.9.6 | Parser XML compatible navigateur |
| musicxml-interfaces | 0.0.21 | Types TypeScript MusicXML |
| Vitest | 2.x | Tests unitaires |
| ESLint | 9.17 | Linting (flat config v9+) |
| Prettier | 3.4 | Formatage du code |

## Tests

```bash
npm test             # Lance les 117 tests une fois
npm run test:watch   # Mode watch (développement)
npm run coverage     # Rapport de couverture HTML
```

| Fichier | Tests | Périmètre |
|---|---|---|
| `utils/xmlParser.test.ts` | 25 | Parsing XML/MXL, volumes, titres, erreurs |
| `utils/noteMapper.test.ts` | 22 | Mapping pitch→corde, accidentaux, plages |
| `utils/exerciseGenerator.test.ts` | 21 | Gammes, arpèges, tierces, montant-descendant |
| `components/UIControls.test.tsx` | 14 | Lecture/arrêt/tempo/boucle/progression |
| `utils/musicxmlExport.test.ts` | 11 | Export XML, mesures, durées |
| `utils/history.test.ts` | 11 | Persistance, compteurs, scores |
| `utils/midiMapper.test.ts` | 9 | Conversion pitch→MIDI |
| `components/ScoreLoader.test.tsx` | 4 | Upload, formats acceptés |

## Limitations connues

| Zone | Limitation |
|---|---|
| Accord | Harpe accordée en do majeur diatonique — les accidentaux sont arrondis à la corde voisine |
| Polyphonie | Les accords (`<chord/>`) sont lus séquentiellement, non simultanément |
| Liaisons | `<tie type="stop"/>` non géré — les notes liées sont ré-attaquées |
| Clé API | La clé Anthropic est saisie côté client — ne pas exposer en production |
| CI/CD | Pas de workflow GitHub Actions — aucune vérification automatisée sur push |
| Tests | Pas de tests de composants complets (rendu Three.js) ni de tests E2E |
