import React from 'react';
import { Note } from 'musicxml-interfaces';
import { useGLTF } from '@react-three/drei';
import { mapPitchToString, STRING_COUNT } from '../utils/noteMapper';

useGLTF.preload('/models/harp/Unity2Skfb.gltf');

interface HarpModelProps {
  notes: Note[];
  activeNoteIndex: number | null;
}

const HarpStringModel: React.FC<HarpModelProps> = ({
  notes,
  activeNoteIndex,
}) => {
  const { scene } = useGLTF('/models/harp/Unity2Skfb.gltf');

  const activeString =
    activeNoteIndex !== null && notes[activeNoteIndex]?.pitch
      ? mapPitchToString({
          step: notes[activeNoteIndex].pitch!.step ?? '',
          octave: notes[activeNoteIndex].pitch!.octave,
          alter: notes[activeNoteIndex].pitch!.alter ?? 0,
        })
      : null;

  return (
    <group>
      {/* Corps de la harpe (modèle 3D GLTF) */}
      <primitive
        object={scene}
        scale={6}
        position={[0, -4, 0]}
        rotation={[0, -Math.PI / 6, 0]}
      />

      {/* 47 cordes procédurales — C1 (basse, longue) à G7 (aigüe, courte) */}
      {Array.from({ length: STRING_COUNT }, (_, index) => {
        const zPosition = index * 0.5 - (STRING_COUNT * 0.5) / 2;
        // Les cordes graves (index bas) sont plus longues
        const stringLength = 1 + (STRING_COUNT - 1 - index) * 0.4;
        return (
          <mesh key={index} position={[0, 0, zPosition]}>
            <cylinderGeometry args={[0.1, 0.1, stringLength]} />
            <meshStandardMaterial
              color={
                activeString === index
                  ? 'yellow'
                  : `hsl(${index * 10}, 100%, 50%)`
              }
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default HarpStringModel;
