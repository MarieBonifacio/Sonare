import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import HarpModel from './components/HarpModel';

function App() {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <HarpModel />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default App;
