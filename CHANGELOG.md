# Changelog

Toutes les modifications notables sont documentées ici.
Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [Unreleased] — branche feat-next-iteration

### Ajouté
- Modèle 3D GLTF réel (`Unity2Skfb.gltf`) affiché comme corps de harpe
- CI/CD GitHub Actions : lint + tests + build sur push et pull request
- `docs/ARCHITECTURE.md` — description du flux de données et des modules
- `docs/ROADMAP.md` — plan de développement par version
- `CHANGELOG.md` (ce fichier)
- 47 cordes (C1–G7) avec formule recalibrée (offset C1=0, G7=46)
- Gestion des silences (`<rest/>`) dans le parser et la lecture
- Accords (`<chord/>`) joués simultanément sans avancer l'index
- Liaisons (`<tie type="stop"/>`) : pas de re-attaque sur la note tenue
- Tempo extrait de `<sound tempo="X">` — remplace le 120 BPM par défaut
- Titre de la partition depuis `<movement-title>` ou `<work-title>`
- Barre de progression (aria-progressbar) dans UIControls
- Bouton ↺ Boucle pour rejouer la partition en boucle
- Silences affichés "Silence" dans la liste des notes

- Dynamiques MusicXML (`<dynamics><f/>`, `<sound dynamics="X">`) appliquées comme vélocité Tone.js
- Mode doigté : bouton ✋ Doigté dans le panneau des notes, affiche le doigt recommandé (1–4) par note
- `getRecommendedFinger(step)` dans `noteMapper.ts` (C/F=1, D/G=2, E/A=3, B=4)

### Modifié
- Tone.js chargé en import dynamique (`import('tone')`) — réduit le bundle initial
- `<HarpModel>` enveloppé dans `<Suspense>` pour le chargement asynchrone du GLTF
- Cordes : longueurs inversées (graves = plus longues, conformément à une vraie harpe)
- `getSynth()` encapsule le `PolySynth` dans un type minimal — isole l'API Tone.js
- Tests : 60 tests (dont 9 nouveaux pour dynamiques/volumes et doigté)

---

## [1.0.0] — 2026-04-19

### Ajouté
- Parsing MusicXML complet (`.xml`, `.musicxml`, `.mxl` via JSZip)
- Extraction des `<divisions>` pour des durées de lecture rythmiquement correctes
- Lecture séquentielle des notes avec synthèse audio (Tone.js PolySynth triangle)
- UIControls : bouton Lecture/Arrêter + slider Tempo (40–240 BPM)
- Scroll automatique vers la note active dans la liste
- Gestion d'erreurs visible dans ScoreLoader (fichier invalide, archive sans score.xml)
- Utils extraits et testables : `noteMapper.ts`, `xmlParser.ts`
- Suite de tests Vitest : 34 tests, 61% couverture
- `README.md` avec documentation réelle du projet
- `CONTRIBUTING.md` — guide pour les contributeurs
- `CLAUDE.md` — documentation pour les assistants IA

### Modifié
- Types TypeScript stricts : `any[]` → `Note[]` dans tous les composants
- `HarpModel.tsx` refactorisé en composant contrôlé (prop `activeNoteIndex`)
- `UIControls.tsx` implémenté (était un stub vide)
- `ESLint.config.js` corrigé (config v9 cassée depuis l'origine)

### Corrigé
- `parseXmlToNotes('')` ne plante plus sur un XML vide
- Import `React` inutile supprimé de `App.tsx`
- Propriétés Three.js (`position`, `args`, `intensity`) ajoutées à la liste d'ignore ESLint

---

## [0.1.0] — 2026-04-12

### Ajouté
- Structure initiale Vite + React + TypeScript
- Parser MusicXML basique (xmldom)
- Rendu 3D de 37 cordes procédurales (Three.js / react-three/fiber)
- Chargement du fichier MusicXML via `<input type="file">`
- Mise en évidence de la première note chargée
