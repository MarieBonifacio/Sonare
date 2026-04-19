# Roadmap Sonare

## v1.0 — Stabilisation ✅ (fait)

- [x] Parsing MusicXML (.xml, .musicxml, .mxl)
- [x] Rendu 3D de 37 cordes procédurales (Three.js)
- [x] Corps de harpe GLTF (Unity2Skfb.gltf)
- [x] Lecture séquentielle avec durées MusicXML réelles
- [x] Synthèse audio (Tone.js PolySynth triangle) — lazy-loadé
- [x] UIControls : bouton Lecture/Arrêter + slider Tempo
- [x] Scroll automatique vers la note active
- [x] Gestion d'erreurs visible (fichier invalide, archive sans score.xml)
- [x] Types TypeScript stricts (plus de `any[]`)
- [x] ESLint v9 + Prettier configurés
- [x] Tests unitaires Vitest — 34 tests, 61% couverture
- [x] README.md, CONTRIBUTING.md, CLAUDE.md, docs/
- [x] CI/CD GitHub Actions (lint + test + build)

---

## v1.1 — Qualité et précision (next)

### Mapping des cordes
- [ ] Passer à 47 cordes (harpe de concert : C1–G7)
- [ ] Recalibrer la formule note→corde sur la vraie gamme d'une harpe pédagogique

### Audio
- [ ] Remplacer la synthèse triangle par des échantillons WAV réels de corde de harpe
- [ ] Gérer les silences (notes `<rest>` dans le MusicXML)
- [ ] Polyphonie : jouer les accords simultanément

### Parsing MusicXML
- [ ] Supporter les liaisons (tied notes)
- [ ] Supporter les dynamiques (p, f, mf…)
- [ ] Lire le tempo directement depuis le fichier (`<sound tempo="120">`)

### UI / UX
- [ ] Affichage du titre de la partition (depuis `<movement-title>` ou `<work-title>`)
- [ ] Indicateur de progression (barre de lecture)
- [ ] Boucle sur une section (mode répétition)

---

## v1.2 — Pédagogie

- [ ] Mode "doigté" : afficher le doigt recommandé par corde (1–5)
- [ ] Détection des erreurs si connecté à un clavier MIDI
- [ ] Historique : tracker les morceaux joués et le temps de pratique

---

## v2.0 — Fonctionnalités avancées

- [ ] Génération d'exercices progressifs (intégration LLM optionnelle)
- [ ] Synchronisation MIDI temps réel (WebMIDI API)
- [ ] Export de partitions simplifiées (MusicXML ou PDF)
- [ ] Sauvegarde de la progression (localStorage ou backend optionnel)
- [ ] Support multilingue (FR / EN)

---

## Non-objectifs

- Pas de lecture de fichiers audio (MP3, WAV) — Sonare lit des partitions, pas des enregistrements
- Pas d'édition de partition — visualisation et apprentissage uniquement
- Pas de backend obligatoire — offline-first est un principe fondamental
