# Guide du contributeur — Sonare

## Prérequis

- Node.js ≥ 18
- npm ≥ 9

## Installation

```bash
git clone <url-du-repo>
cd Sonare
npm install
npm run dev   # http://localhost:5173
```

## Commandes utiles

```bash
npm run dev       # Serveur de développement (hot reload)
npm run build     # Build de production (tsc + vite)
npm run lint      # ESLint sur tous les fichiers
npm test          # Tests unitaires (une fois)
npm run test:watch  # Tests en mode watch
npm run coverage  # Rapport de couverture HTML
```

## Workflow Git

1. Créer une branche depuis `main` : `git checkout -b feat-ma-feature`
2. Développer avec des commits atomiques
3. Lancer `npm run lint && npm test` avant de pousser
4. Ouvrir une Pull Request vers `main`

### Convention de nommage des branches

```
feat-<description>      # Nouvelle fonctionnalité
fix-<description>       # Correction de bug
docs-<description>      # Documentation uniquement
refactor-<description>  # Refactorisation sans changement de comportement
```

### Convention des messages de commit

Format : `type: description courte`

```
feat: ajouter la lecture MIDI
fix: corriger le mapping des cordes bémol
docs: mettre à jour CONTRIBUTING.md
refactor: extraire la logique de parsing XML
test: couvrir les cas limites de noteMapper
```

## Architecture

```
src/
├── App.tsx                  # Composant racine — état + mise en page
├── components/
│   ├── HarpModel.tsx        # Rendu 3D (react-three/fiber) — composant contrôlé
│   ├── ScoreLoader.tsx      # Upload de fichier + appel xmlParser
│   └── UIControls.tsx       # Boutons lecture/arrêt + slider tempo
└── utils/
    ├── noteMapper.ts        # Algorithme pitch → index de corde
    └── xmlParser.ts         # Parsing MusicXML + décompression MXL
```

Règle : **toute logique métier** (pas de JSX) va dans `src/utils/` afin d'être testable indépendamment.

## Tests

Les tests se trouvent dans les mêmes dossiers que le code (`*.test.ts` / `*.test.tsx`).

```bash
npm test          # Lance vitest run
npm run coverage  # Génère un rapport dans coverage/
```

**Objectif de couverture** : ≥ 50% (actuellement ~61%).

Pour ajouter un test :
1. Créer `src/utils/maFonction.test.ts` à côté de `maFonction.ts`
2. Importer `describe`, `it`, `expect` depuis `'vitest'`
3. Pour les composants React : importer `render`, `screen` depuis `'@testing-library/react'`

## Style de code

- **Langue** : commentaires et chaînes UI en français
- **Formatage** : Prettier (lancé automatiquement par `npm run lint`)
- **Guillemets** : simples (`'`) sauf si la chaîne contient une apostrophe → double (`"`)
- **TypeScript** : strict mode activé — éviter `any`, toujours typer les props

## Ajouter une dépendance

```bash
npm install <package>          # dépendance de production
npm install -D <package>       # dépendance de développement
```

Mettre à jour `README.md` si la dépendance change la stack.
