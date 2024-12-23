import React from 'react';
import { useGLTF } from '@react-three/drei';

export default function HarpModel() {
  // Charge le modèle GLTF
  const { scene } = useGLTF('/models/harp/Unity2Skfb.gltf');

  return (
    // Rend le modèle 3D
    <primitive object={scene} scale={[1, 1, 1]} position={[0, 0, 0]} />
  );
}


// const HarpModel = () => {
//   const normalMap = useLoader(TextureLoader, '/models/textures/10982_MT_Harp_Normal.jpg');

//   const { scene } = useGLTF('/models/Unity2Skfb.gltf');

//   // Applique manuellement la texture au maillage
//   scene.traverse((child) => {
//     if ((child as THREE.Mesh).isMesh) {
//       ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).normalMap = normalMap;
//     }
//   });

//   return <primitive object={scene} scale={[2, 2, 2]} />;
// };

// export default HarpModel;





