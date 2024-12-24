import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import HarpModel from './components/HarpModel';

function App() {
  const useManualStrings = true; // Assure-toi que cette valeur est true pour générer les cordes manuelles

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
      <Canvas camera={{ position: [0, 0, 25], fov: 75 }}>
      <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[10, 10, 10]} />
          {/* Grille pour repérer la scène */}
          <gridHelper args={[20, 20]} />

          {/* HarpModel affichant les cordes */}
          <HarpModel useManualStrings={useManualStrings} />

          <OrbitControls />
        </Canvas>
      </div>
    </div>
  );
}

export default App;
