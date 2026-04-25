import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Note } from 'musicxml-interfaces';
import { mapPitchToString } from '../utils/noteMapper';
import { HARP_STRING_BY_MODEL } from '../utils/harpTuning';

// ── Palette ──────────────────────────────────────────────────────────────────

const WOOD_LIGHT = '#C8904A'; // cerisier clair — corps principal
const WOOD_MID = '#A06828'; // cerisier mi-ton — table d'harmonie
const WOOD_DARK = '#6E3F10'; // cerisier foncé — nez, détails sculptés
const STRING_C = '#E03030'; // cordes Do — rouge vif (repère harpiste)
const STRING_F = '#3A3AB0'; // cordes Fa — bleu nuit visible sur fond sombre
const STRING_NATURAL = '#D8CFA8'; // cordes diatoniques — ivoire chaud
const STRING_ACTIVE = '#FFE45A'; // corde en cours de jeu
const PIN_COLOR = '#C0B060'; // chevilles — laiton doré

// ── Géométrie structurelle ────────────────────────────────────────────────────
//
// Repère local (avant décalage du groupe) :
//   X+ → vers la table d'harmonie (droite), X- → vers le pilier (gauche)
//   Y+ → vers le haut
//   Z+ → vers le spectateur
//
// Le pilier et la console sont des planches plates (scale Z ≈ 0.20) :
//   - De face (vue joueur) on voit la face large de la planche
//   - De côté on voit le chant fin, comme sur une vraie harpe sculptée
//
// La tête de renard est à l'extrémité de la console, face orientée vers -X
// (le renard "regarde" les cordes, vers le joueur).

const PILLAR_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-1.5, -5.7, 0),
  new THREE.Vector3(-1.85, -2.8, 0),
  new THREE.Vector3(-1.6, 0.2, 0),
  new THREE.Vector3(-1.1, 3.0, 0),
  new THREE.Vector3(-0.4, 4.6, 0),
]);

// Arche douce : sommet du pilier → tête de renard.
// Pic à y≈8.0, légèrement au-delà du haut de la table (y≈5.3).
const NECK_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.4, 4.6, 0),
  new THREE.Vector3(0.9, 7.3, 0),
  new THREE.Vector3(2.6, 8.0, 0),
  new THREE.Vector3(3.8, 7.6, 0),
  new THREE.Vector3(4.7, 6.0, 0),
]);

const VISUAL_STRINGS = 36;

function neckPoint(i: number): THREE.Vector3 {
  const t = 0.06 + (i / (VISUAL_STRINGS - 1)) * 0.83;
  return NECK_CURVE.getPoint(t);
}

function boardPoint(i: number): THREE.Vector3 {
  const t = i / (VISUAL_STRINGS - 1);
  const y = -5.0 + t * 9.5;
  const x = 2.2 + (1 - t) * 0.15;
  return new THREE.Vector3(x, y, 0.29);
}

function cylinderBetween(
  a: THREE.Vector3,
  b: THREE.Vector3,
): {
  position: [number, number, number];
  quaternion: THREE.Quaternion;
  length: number;
} {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const mid = a.clone().lerp(b, 0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize(),
  );
  return {
    position: mid.toArray() as [number, number, number],
    quaternion: q,
    length: len,
  };
}

// ── Couleur et épaisseur des cordes ──────────────────────────────────────────

function stringColor(modelIndex: number): string {
  const s = HARP_STRING_BY_MODEL[modelIndex];
  if (!s) return STRING_NATURAL;
  if (s.color === 'red') return STRING_C;
  if (s.color === 'black') return STRING_F;
  return STRING_NATURAL;
}

// Rayon décroissant grave → aigu. Valeurs calibrées pour fov=75, camera z=20.
function stringRadius(i: number): number {
  return 0.065 - (i / (VISUAL_STRINGS - 1)) * 0.035;
}

// ── Matériau bois partagé (helper) ───────────────────────────────────────────

function WoodMat({ color = WOOD_LIGHT }: { color?: string }) {
  return (
    <meshStandardMaterial color={color} roughness={0.68} metalness={0.03} />
  );
}

// ── Composant React ───────────────────────────────────────────────────────────

interface HarpModelProps {
  notes: Note[];
  activeNoteIndices: number[];
  onStringClick?: (stringIndex: number) => void;
}

const HarpStringModel: React.FC<HarpModelProps> = ({
  notes,
  activeNoteIndices,
  onStringClick,
}) => {
  const activeVisualSet = useMemo(() => {
    const set = new Set<number>();
    for (const noteIdx of activeNoteIndices) {
      const p = notes[noteIdx]?.pitch;
      if (!p) continue;
      const idx = mapPitchToString({
        step: p.step ?? '',
        octave: p.octave,
        alter: p.alter ?? 0,
      });
      if (idx >= 0) set.add(idx);
    }
    return set;
  }, [notes, activeNoteIndices]);

  // Tube radius plus large pour compenser l'aplatissement Z
  const pillarGeo = useMemo(
    () => new THREE.TubeGeometry(PILLAR_CURVE, 60, 0.3, 12, false),
    [],
  );
  const neckGeo = useMemo(
    () => new THREE.TubeGeometry(NECK_CURVE, 70, 0.26, 12, false),
    [],
  );

  const strings = useMemo(
    () =>
      Array.from({ length: VISUAL_STRINGS }, (_, i) => ({
        ...cylinderBetween(neckPoint(i), boardPoint(i)),
        index: i,
        radius: stringRadius(i),
      })),
    [],
  );

  const foxPos = NECK_CURVE.getPoint(1).toArray() as [number, number, number];

  return (
    <group position={[-1.3, -1.1, 0]}>
      {/* ── Pilier — planche plate légèrement courbée ── */}
      {/*   scale Z = 0.22 → chant fin comme une vraie planche sculptée   */}
      <mesh geometry={pillarGeo} scale={[1, 1, 0.22]}>
        <WoodMat />
      </mesh>

      {/* Pied de pilier — raccord arrondi avec le socle */}
      <mesh position={[-1.5, -5.5, 0]} scale={[1.0, 0.7, 0.3]}>
        <sphereGeometry args={[0.55, 16, 10]} />
        <WoodMat />
      </mesh>

      {/* ── Console (cou) — planche plate en arche ── */}
      {/*   scale Z = 0.20 → ruban plat, comme la vraie console en bois   */}
      <mesh geometry={neckGeo} scale={[1, 1, 0.2]}>
        <WoodMat />
      </mesh>

      {/* ── Table d'harmonie ── */}
      <mesh position={[2.25, -0.15, 0]}>
        <boxGeometry args={[0.8, 11.0, 0.55]} />
        <WoodMat color={WOOD_MID} />
      </mesh>
      {/* Renforts latéraux (lisières de la table) */}
      <mesh position={[2.25, -0.15, 0.31]}>
        <boxGeometry args={[0.72, 10.7, 0.06]} />
        <WoodMat color={WOOD_LIGHT} />
      </mesh>
      <mesh position={[2.25, -0.15, -0.31]}>
        <boxGeometry args={[0.72, 10.7, 0.06]} />
        <WoodMat color={WOOD_LIGHT} />
      </mesh>

      {/* ── Socle ── */}
      <mesh position={[0.45, -5.72, 0]}>
        <boxGeometry args={[4.5, 0.38, 0.62]} />
        <WoodMat color={WOOD_MID} />
      </mesh>
      {/* Congé pilier → socle */}
      <mesh position={[-1.38, -5.55, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.55, 0.42, 0.5]} />
        <WoodMat />
      </mesh>

      {/* ── 36 cordes ── */}
      {strings.map(({ position, quaternion, length, index, radius }) => {
        const isActive = activeVisualSet.has(index);
        const baseColor = stringColor(index);
        return (
          <mesh
            key={index}
            position={position}
            quaternion={quaternion}
            onClick={
              onStringClick
                ? (e) => {
                    e.stopPropagation();
                    onStringClick(index);
                  }
                : undefined
            }
            onPointerOver={
              onStringClick
                ? () => {
                    document.body.style.cursor = 'pointer';
                  }
                : undefined
            }
            onPointerOut={
              onStringClick
                ? () => {
                    document.body.style.cursor = 'default';
                  }
                : undefined
            }
          >
            <cylinderGeometry args={[radius, radius, length, 8]} />
            <meshStandardMaterial
              color={isActive ? STRING_ACTIVE : baseColor}
              roughness={0.4}
              metalness={0.55}
              emissive={isActive ? STRING_ACTIVE : baseColor}
              emissiveIntensity={isActive ? 0.7 : 0.15}
            />
          </mesh>
        );
      })}

      {/* ── Chevilles d'accordage — laiton doré ── */}
      {Array.from({ length: VISUAL_STRINGS }, (_, i) => {
        const pt = neckPoint(i);
        return (
          <mesh
            key={`pin-${i}`}
            position={[pt.x, pt.y, pt.z + 0.24]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.042, 0.042, 0.18, 8]} />
            <meshStandardMaterial
              color={PIN_COLOR}
              roughness={0.18}
              metalness={0.95}
            />
          </mesh>
        );
      })}

      {/* ── Tête de renard ── */}
      {/*
       * Repère local du groupe renard (Z-rotation −0.28 sur le groupe parent) :
       *   X- = direction du museau (vers les cordes / joueur)
       *   Y+ = vers le haut (oreilles)
       *   Z± = côtés (yeux)
       *
       * Résultat en repère monde :
       *   museau pointe vers la gauche et légèrement vers le bas ✓
       *   oreilles pointent vers le haut et légèrement vers la droite ✓
       */}
      <group position={foxPos} rotation={[0.12, 0, -0.28]}>
        {/* Crâne — ellipsoïde allongé vers le museau (-X) */}
        <mesh scale={[1.55, 1.0, 0.7]}>
          <sphereGeometry args={[0.4, 22, 16]} />
          <WoodMat />
        </mesh>

        {/* Museau — long cône tronqué, incliné légèrement vers le bas */}
        {/* rotation Z = π/2 aligne l'axe Y du cylindre sur X ; -0.20 rad incline vers le bas */}
        <mesh position={[-0.82, -0.16, 0]} rotation={[0, 0, Math.PI / 2 - 0.2]}>
          <cylinderGeometry args={[0.068, 0.21, 1.15, 14]} />
          <WoodMat />
        </mesh>

        {/* Bout du museau — sphère sombre */}
        <mesh position={[-1.42, -0.36, 0]}>
          <sphereGeometry args={[0.085, 12, 10]} />
          <WoodMat color={WOOD_DARK} />
        </mesh>

        {/* Oreille gauche (Z+) — haute et pointue */}
        <mesh position={[0.18, 0.62, 0.21]} rotation={[0.08, 0, 0.06]}>
          <coneGeometry args={[0.105, 0.95, 9]} />
          <WoodMat />
        </mesh>

        {/* Oreille droite (Z-) */}
        <mesh position={[0.18, 0.62, -0.21]} rotation={[-0.08, 0, 0.06]}>
          <coneGeometry args={[0.105, 0.95, 9]} />
          <WoodMat />
        </mesh>

        {/* Oeil côté Z+ — almond sombre */}
        <mesh position={[-0.2, 0.15, 0.32]}>
          <sphereGeometry args={[0.058, 12, 10]} />
          <meshStandardMaterial
            color={WOOD_DARK}
            roughness={0.22}
            metalness={0.12}
          />
        </mesh>

        {/* Oeil côté Z- */}
        <mesh position={[-0.2, 0.15, -0.32]}>
          <sphereGeometry args={[0.058, 12, 10]} />
          <meshStandardMaterial
            color={WOOD_DARK}
            roughness={0.22}
            metalness={0.12}
          />
        </mesh>

        {/* Connexion nuque → console (raccord organique) */}
        <mesh
          position={[0.52, -0.22, 0]}
          rotation={[0, 0, 0.55]}
          scale={[1, 1, 0.55]}
        >
          <cylinderGeometry args={[0.24, 0.3, 0.65, 12]} />
          <WoodMat />
        </mesh>
      </group>
    </group>
  );
};

export default HarpStringModel;
