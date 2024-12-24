import React from 'react';
import { useGLTF } from '@react-three/drei';
import { BoxHelper } from 'three';
import * as THREE from 'three';

interface HarpModelProps {
  useManualStrings?: boolean; // Si true, on génère des cordes par code
}

const HarpModel: React.FC<HarpModelProps> = ({ useManualStrings = true }) => {
  if (useManualStrings) {
    // Génération des 36 cordes manuellement
    const strings = Array.from({ length: 36 }, (_, index) => (
      <mesh
        key={index}
        name={`String${index}`}
        position={[0, index * 0.5 - 9, 0]} // Espacement vertical des cordes
        scale={[1, 1, 1]} // Dimensions des cordes
      >
        <cylinderGeometry args={[0.02, 0.02, 1]} />
        <meshStandardMaterial color="gray" />
        <axesHelper args={[0.1]} /> {/* Add an axes helper for each string */}
        <primitive object={new BoxHelper(new THREE.Mesh())} /> {/* Add a bounding box helper for each string */}
      </mesh>
    ));

    console.log(strings); // Debugging: Log the strings array

    return (
      <group>
        {strings}
        <axesHelper args={[10]} /> {/* Add an axes helper for debugging */}
      </group>
    );
  }

  // Chargement du modèle 3D (fichier GLTF/GLB avec les cordes nommées "String0" à "String35")
  const { scene } = useGLTF('/models/harp/harp.glb');
  return <primitive object={scene} />;
};

export default HarpModel;
