import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Note } from 'musicxml-interfaces';
import { mapPitchToString } from '../utils/noteMapper';
import { HARP_STRING_BY_MODEL } from '../utils/harpTuning';

// ── Palette ──────────────────────────────────────────────────────────────────

const WOOD_LIGHT = '#C5893C'; // chêne/cerisier clair
const WOOD_DARK = '#8A5828'; // corps/table foncé
const STRING_C = '#CC3333'; // cordes Do — rouge (repère harpiste)
const STRING_F = '#1A1A2A'; // cordes Fa — noir/bleu foncé (repère harpiste)
const STRING_NATURAL = '#C8C8C8'; // cordes diatoniques ordinaires
const STRING_ACTIVE = '#FFE45A'; // corde en cours de jeu
const PIN_COLOR = '#A8A8A8'; // chevilles métalliques

// ── Géométrie structurelle ────────────────────────────────────────────────────
//
// Système de coordonnées (local, avant décalage du groupe) :
//   X+ → vers la table d'harmonie (droite)
//   Y+ → vers le haut
//   Z+ → vers le spectateur
//
// Pilier : tube organique, bas gauche → haut gauche, légère courbure vers l'avant
// Console (cou) : arche prononcée depuis le sommet du pilier jusqu'à la tête de renard
// Table d'harmonie : face droite, cordes fixées sur sa face avant (z ≈ +0.29)
// Cordes : de neckPoint(i) (console) à boardPoint(i) (table), angle décroissant

const PILLAR_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-1.5, -5.7, 0),
  new THREE.Vector3(-1.9, -3.0, 0.14),
  new THREE.Vector3(-1.65, 0.0, 0.08),
  new THREE.Vector3(-1.1, 2.8, 0),
  new THREE.Vector3(-0.4, 4.6, 0),
]);

// Arche nettement relevée : sommet du pilier (-0.4, 4.6) → tête de renard (4.6, 6.1).
// Le pic de l'arche est à environ y=7.8, bien au-dessus du sommet de la table (y≈5.4).
const NECK_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.4, 4.6, 0),
  new THREE.Vector3(0.8, 7.1, 0),
  new THREE.Vector3(2.5, 7.9, 0),
  new THREE.Vector3(3.7, 7.5, 0),
  new THREE.Vector3(4.6, 6.1, 0),
]);

const VISUAL_STRINGS = 36; // harpe celtique folk

// Point d'attache de la corde i sur la console.
// i=0 → corde basse (proche du pilier), i=35 → corde aiguë (proche du renard).
function neckPoint(i: number): THREE.Vector3 {
  const t = 0.06 + (i / (VISUAL_STRINGS - 1)) * 0.83;
  return NECK_CURVE.getPoint(t);
}

// Point d'attache de la corde i sur la face avant de la table d'harmonie.
// y=-5.0 (basse) → y=4.5 (aiguë) ; x légèrement décroissant vers la table (réaliste).
function boardPoint(i: number): THREE.Vector3 {
  const t = i / (VISUAL_STRINGS - 1);
  const y = -5.0 + t * 9.5;
  const x = 2.2 + (1 - t) * 0.15;
  return new THREE.Vector3(x, y, 0.29);
}

// Construit position/quaternion pour un cylindre allant du point A au point B.
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

function stringColor(modelIndex: number, isActive: boolean): string {
  if (isActive) return STRING_ACTIVE;
  const s = HARP_STRING_BY_MODEL[modelIndex];
  if (!s) return STRING_NATURAL;
  if (s.color === 'red') return STRING_C;
  if (s.color === 'black') return STRING_F;
  return STRING_NATURAL;
}

// Rayon décroissant du grave (épais) vers l'aigu (fin), comme sur une vraie harpe.
function stringRadius(i: number): number {
  return 0.026 - (i / (VISUAL_STRINGS - 1)) * 0.014; // 0.026 (basse) → 0.012 (aiguë)
}

// ── Composant React ───────────────────────────────────────────────────────────

interface HarpModelProps {
  notes: Note[];
  activeNoteIndices: number[];
}

const HarpStringModel: React.FC<HarpModelProps> = ({
  notes,
  activeNoteIndices,
}) => {
  // Ensemble des indices visuels de cordes actives (0–35) — supporte les accords
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

  // Géométries mémoïsées (tube pilier et tube console)
  const pillarGeo = useMemo(
    () => new THREE.TubeGeometry(PILLAR_CURVE, 56, 0.23, 10, false),
    [],
  );
  const neckGeo = useMemo(
    () => new THREE.TubeGeometry(NECK_CURVE, 64, 0.18, 10, false),
    [],
  );

  // Transformations des 36 cordes (indépendantes de l'état actif → mémoïsées)
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

  // Décalage du groupe : centrage de l'ensemble dans la vue.
  // Emprise locale X [-1.9 … 4.6], Y [-5.7 … 7.9] → centre ≈ (1.35, 1.1)
  return (
    <group position={[-1.3, -1.0, 0]}>
      {/* Lumière chaude pour valoriser les teintes bois */}
      <pointLight position={[4, 5, 6]} intensity={1.8} color='#FFC870' />

      {/* ── Pilier ── */}
      <mesh geometry={pillarGeo}>
        <meshStandardMaterial
          color={WOOD_LIGHT}
          roughness={0.72}
          metalness={0.03}
        />
      </mesh>

      {/* ── Console (cou) — arche prononcée ── */}
      <mesh geometry={neckGeo}>
        <meshStandardMaterial
          color={WOOD_LIGHT}
          roughness={0.72}
          metalness={0.03}
        />
      </mesh>

      {/* ── Table d'harmonie — corps ── */}
      <mesh position={[2.25, -0.2, 0]}>
        <boxGeometry args={[0.95, 11.2, 0.54]} />
        <meshStandardMaterial
          color={WOOD_DARK}
          roughness={0.82}
          metalness={0.02}
        />
      </mesh>
      {/* Face avant (grain bois clair, plan des chevilles de table) */}
      <mesh position={[2.25, -0.2, 0.29]}>
        <boxGeometry args={[0.82, 10.9, 0.03]} />
        <meshStandardMaterial
          color={WOOD_LIGHT}
          roughness={0.65}
          metalness={0.02}
        />
      </mesh>

      {/* ── Socle ── */}
      <mesh position={[0.4, -5.88, 0]}>
        <boxGeometry args={[4.3, 0.34, 0.75]} />
        <meshStandardMaterial
          color={WOOD_DARK}
          roughness={0.82}
          metalness={0.02}
        />
      </mesh>

      {/* ── 36 cordes ── */}
      {strings.map(({ position, quaternion, length, index, radius }) => (
        <mesh key={index} position={position} quaternion={quaternion}>
          <cylinderGeometry args={[radius, radius, length, 5]} />
          <meshStandardMaterial
            color={stringColor(index, activeVisualSet.has(index))}
            roughness={0.12}
            metalness={0.88}
            emissive={activeVisualSet.has(index) ? STRING_ACTIVE : '#000000'}
            emissiveIntensity={activeVisualSet.has(index) ? 0.6 : 0}
          />
        </mesh>
      ))}

      {/* ── Chevilles d'accordage ── */}
      {Array.from({ length: VISUAL_STRINGS }, (_, i) => {
        const pt = neckPoint(i);
        return (
          <mesh
            key={`pin-${i}`}
            position={[pt.x, pt.y, pt.z + 0.26]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.038, 0.038, 0.16, 6]} />
            <meshStandardMaterial
              color={PIN_COLOR}
              roughness={0.22}
              metalness={0.92}
            />
          </mesh>
        );
      })}

      {/* ── Tête de renard (bout de la console) ── */}
      {/*
       * Orientation : rotation [0.15, 0, -0.32] — le renard regarde légèrement
       * vers les cordes (vers la gauche) et légèrement vers le spectateur.
       * Le museau (cylindre tronconique) pointe dans la direction −X du groupe du renard.
       */}
      <group position={foxPos} rotation={[0.15, 0, -0.32]}>
        {/* Crâne */}
        <mesh>
          <sphereGeometry args={[0.52, 18, 14]} />
          <meshStandardMaterial
            color={WOOD_LIGHT}
            roughness={0.72}
            metalness={0.03}
          />
        </mesh>

        {/* Museau allongé (cône tronqué, base large côté crâne) */}
        <mesh position={[-0.62, -0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.24, 0.72, 12]} />
          <meshStandardMaterial
            color={WOOD_LIGHT}
            roughness={0.72}
            metalness={0.03}
          />
        </mesh>

        {/* Bout du nez */}
        <mesh position={[-0.99, -0.14, 0]}>
          <sphereGeometry args={[0.12, 10, 8]} />
          <meshStandardMaterial
            color={WOOD_DARK}
            roughness={0.55}
            metalness={0.04}
          />
        </mesh>

        {/* Oreille gauche — grande, pointue */}
        <mesh position={[0.14, 0.58, 0.24]} rotation={[0.2, 0, 0.12]}>
          <coneGeometry args={[0.13, 0.62, 8]} />
          <meshStandardMaterial
            color={WOOD_LIGHT}
            roughness={0.72}
            metalness={0.03}
          />
        </mesh>

        {/* Oreille droite */}
        <mesh position={[0.14, 0.58, -0.24]} rotation={[-0.2, 0, 0.12]}>
          <coneGeometry args={[0.13, 0.62, 8]} />
          <meshStandardMaterial
            color={WOOD_LIGHT}
            roughness={0.72}
            metalness={0.03}
          />
        </mesh>

        {/* Yeux gravés */}
        <mesh position={[-0.26, 0.1, 0.32]}>
          <sphereGeometry args={[0.065, 8, 8]} />
          <meshStandardMaterial
            color={WOOD_DARK}
            roughness={0.35}
            metalness={0.0}
          />
        </mesh>
        <mesh position={[-0.26, 0.1, -0.32]}>
          <sphereGeometry args={[0.065, 8, 8]} />
          <meshStandardMaterial
            color={WOOD_DARK}
            roughness={0.35}
            metalness={0.0}
          />
        </mesh>

        {/* Pattes avant repliées sous le menton */}
        <mesh position={[-0.52, -0.46, 0.18]} rotation={[0.38, 0, -0.62]}>
          <capsuleGeometry args={[0.085, 0.28, 4, 8]} />
          <meshStandardMaterial
            color={WOOD_LIGHT}
            roughness={0.72}
            metalness={0.03}
          />
        </mesh>
        <mesh position={[-0.52, -0.46, -0.18]} rotation={[-0.38, 0, -0.62]}>
          <capsuleGeometry args={[0.085, 0.28, 4, 8]} />
          <meshStandardMaterial
            color={WOOD_LIGHT}
            roughness={0.72}
            metalness={0.03}
          />
        </mesh>

        {/* Fourrure de gorge — sphère aplatie sous le menton */}
        <mesh position={[-0.3, -0.38, 0]} scale={[0.6, 0.35, 0.9]}>
          <sphereGeometry args={[0.38, 10, 8]} />
          <meshStandardMaterial
            color={WOOD_LIGHT}
            roughness={0.85}
            metalness={0.0}
          />
        </mesh>
      </group>
    </group>
  );
};

export default HarpStringModel;
