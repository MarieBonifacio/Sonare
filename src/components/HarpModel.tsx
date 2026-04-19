import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Note } from 'musicxml-interfaces';
import { mapPitchToString, STRING_COUNT } from '../utils/noteMapper';

// Harpe celtique/folk : 36 cordes
const VISUAL_STRINGS = 36;

// Teintes bois chaud (chêne/cerisier)
const WOOD_LIGHT = '#C5893C';
const WOOD_DARK = '#8A5828';
const STRING_IDLE = '#BEBEBE';
const STRING_ACTIVE = '#FFE45A';
const PIN_COLOR = '#A8A8A8';

// Map index harpe de concert (0–46) → index visuel (0–35)
const toVisual = (idx: number): number =>
  Math.round((idx / (STRING_COUNT - 1)) * (VISUAL_STRINGS - 1));

// ── Courbes structurelles ──────────────────────────────────────────────────

const PILLAR_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-1.5, -5.5, 0),
  new THREE.Vector3(-1.9, -3.0, 0.12),
  new THREE.Vector3(-1.65, 0.0, 0.06),
  new THREE.Vector3(-1.1, 2.8, 0),
  new THREE.Vector3(-0.4, 4.6, 0),
]);

const NECK_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.4, 4.6, 0),
  new THREE.Vector3(0.4, 6.1, 0),
  new THREE.Vector3(2.0, 6.45, 0),
  new THREE.Vector3(3.1, 5.9, 0),
  new THREE.Vector3(3.8, 4.85, 0),
]);

// Point d'attache de la corde i sur le cou (basse i=0 côté pilier, aigu i=35 côté renard)
function neckPoint(i: number): THREE.Vector3 {
  const t = 0.07 + (i / (VISUAL_STRINGS - 1)) * 0.8;
  return NECK_CURVE.getPoint(t);
}

// Point d'attache de la corde i sur la table d'harmonie
function boardPoint(i: number): THREE.Vector3 {
  const y = -4.3 + (i / (VISUAL_STRINGS - 1)) * 7.9;
  const x = 2.1 + (1 - i / (VISUAL_STRINGS - 1)) * 0.16;
  return new THREE.Vector3(x, y, 0.28);
}

// Calcule position/quaternion pour un cylindre allant de A à B
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

interface HarpModelProps {
  notes: Note[];
  activeNoteIndex: number | null;
}

const HarpStringModel: React.FC<HarpModelProps> = ({
  notes,
  activeNoteIndex,
}) => {
  // Corde active mappée sur le visuel 36 cordes
  const activeVisual = useMemo(() => {
    if (activeNoteIndex === null || !notes[activeNoteIndex]?.pitch) return null;
    const p = notes[activeNoteIndex].pitch!;
    const idx = mapPitchToString({
      step: p.step ?? '',
      octave: p.octave,
      alter: p.alter ?? 0,
    });
    return idx >= 0 ? toVisual(idx) : null;
  }, [notes, activeNoteIndex]);

  const pillarGeo = useMemo(
    () => new THREE.TubeGeometry(PILLAR_CURVE, 52, 0.22, 10, false),
    [],
  );
  const neckGeo = useMemo(
    () => new THREE.TubeGeometry(NECK_CURVE, 52, 0.17, 10, false),
    [],
  );

  // Transforms des 36 cordes (mémoïsés, indépendants de l'état)
  const strings = useMemo(
    () =>
      Array.from({ length: VISUAL_STRINGS }, (_, i) => ({
        ...cylinderBetween(neckPoint(i), boardPoint(i)),
        index: i,
      })),
    [],
  );

  const foxPos = NECK_CURVE.getPoint(1).toArray() as [number, number, number];

  return (
    <group position={[-1.2, -0.3, 0]}>
      {/* Lumière chaude pour valoriser le bois */}
      <pointLight position={[4, 4, 5]} intensity={1.5} color='#FFC870' />

      {/* ── Pilier ── */}
      <mesh geometry={pillarGeo}>
        <meshStandardMaterial
          color={WOOD_LIGHT}
          roughness={0.72}
          metalness={0.03}
        />
      </mesh>

      {/* ── Console (cou) ── */}
      <mesh geometry={neckGeo}>
        <meshStandardMaterial
          color={WOOD_LIGHT}
          roughness={0.72}
          metalness={0.03}
        />
      </mesh>

      {/* ── Table d'harmonie — corps principal ── */}
      <mesh position={[2.2, -0.35, 0]}>
        <boxGeometry args={[1.0, 10.3, 0.5]} />
        <meshStandardMaterial
          color={WOOD_DARK}
          roughness={0.8}
          metalness={0.02}
        />
      </mesh>
      {/* Face avant (grain bois clair) */}
      <mesh position={[2.2, -0.35, 0.27]}>
        <boxGeometry args={[0.88, 10.05, 0.03]} />
        <meshStandardMaterial
          color={WOOD_LIGHT}
          roughness={0.65}
          metalness={0.02}
        />
      </mesh>

      {/* ── Socle ── */}
      <mesh position={[0.4, -5.75, 0]}>
        <boxGeometry args={[4.4, 0.32, 0.72]} />
        <meshStandardMaterial
          color={WOOD_DARK}
          roughness={0.8}
          metalness={0.02}
        />
      </mesh>

      {/* ── 36 cordes ── */}
      {strings.map(({ position, quaternion, length, index }) => (
        <mesh key={index} position={position} quaternion={quaternion}>
          <cylinderGeometry args={[0.018, 0.018, length, 5]} />
          <meshStandardMaterial
            color={activeVisual === index ? STRING_ACTIVE : STRING_IDLE}
            roughness={0.15}
            metalness={0.85}
            emissive={activeVisual === index ? STRING_ACTIVE : '#000000'}
            emissiveIntensity={activeVisual === index ? 0.55 : 0}
          />
        </mesh>
      ))}

      {/* ── Chevilles d'accordage ── */}
      {Array.from({ length: VISUAL_STRINGS }, (_, i) => {
        const pt = neckPoint(i);
        return (
          <mesh
            key={`pin-${i}`}
            position={[pt.x, pt.y, pt.z + 0.27]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.036, 0.036, 0.15, 6]} />
            <meshStandardMaterial
              color={PIN_COLOR}
              roughness={0.25}
              metalness={0.9}
            />
          </mesh>
        );
      })}

      {/* ── Tête de renard ── */}
      <group position={foxPos} rotation={[0, 0, -0.28]}>
        {/* Crâne */}
        <mesh>
          <sphereGeometry args={[0.38, 16, 12]} />
          <meshStandardMaterial
            color={WOOD_LIGHT}
            roughness={0.72}
            metalness={0.03}
          />
        </mesh>
        {/* Museau allongé */}
        <mesh position={[-0.48, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.11, 0.19, 0.52, 10]} />
          <meshStandardMaterial
            color={WOOD_LIGHT}
            roughness={0.72}
            metalness={0.03}
          />
        </mesh>
        {/* Oreille gauche */}
        <mesh position={[0.08, 0.44, 0.19]} rotation={[0.2, 0, 0.15]}>
          <coneGeometry args={[0.1, 0.38, 8]} />
          <meshStandardMaterial
            color={WOOD_LIGHT}
            roughness={0.72}
            metalness={0.03}
          />
        </mesh>
        {/* Oreille droite */}
        <mesh position={[0.08, 0.44, -0.19]} rotation={[-0.2, 0, 0.15]}>
          <coneGeometry args={[0.1, 0.38, 8]} />
          <meshStandardMaterial
            color={WOOD_LIGHT}
            roughness={0.72}
            metalness={0.03}
          />
        </mesh>
        {/* Yeux gravés */}
        <mesh position={[-0.21, 0.07, 0.24]}>
          <sphereGeometry args={[0.052, 8, 8]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.35} />
        </mesh>
        <mesh position={[-0.21, 0.07, -0.24]}>
          <sphereGeometry args={[0.052, 8, 8]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.35} />
        </mesh>
        {/* Pattes repliées sous le menton */}
        <mesh position={[-0.44, -0.33, 0.14]} rotation={[0.35, 0, -0.55]}>
          <capsuleGeometry args={[0.062, 0.2, 4, 8]} />
          <meshStandardMaterial
            color={WOOD_LIGHT}
            roughness={0.72}
            metalness={0.03}
          />
        </mesh>
        <mesh position={[-0.44, -0.33, -0.14]} rotation={[-0.35, 0, -0.55]}>
          <capsuleGeometry args={[0.062, 0.2, 4, 8]} />
          <meshStandardMaterial
            color={WOOD_LIGHT}
            roughness={0.72}
            metalness={0.03}
          />
        </mesh>
      </group>
    </group>
  );
};

export default HarpStringModel;
