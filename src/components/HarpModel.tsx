import React from 'react';

interface HarpModelProps {
  useManualStrings?: boolean;
  notes: any[];
}

const HarpStringModel: React.FC<HarpModelProps> = ({ useManualStrings = true }) => {
  if (useManualStrings) {
    const strings = Array.from({ length: 37 }, (_, index) => {
      const yPosition = 0;
      const zPosition = index * 0.5 - (37 * 0.5) / 2; // Center in depth
      const stringLength = 1 + index * 0.5; // Varying length from 1 to 18.5
      if (process.env.NODE_ENV === 'development') {
        console.log(`Corde ${index} : position Y = ${yPosition}, position Z = ${zPosition}, length = ${stringLength}`);
      }
      return (
        <mesh key={index} position={[0, yPosition, zPosition]}>
          <cylinderGeometry args={[0.1, 0.1, stringLength]} /> {/* Varying dimensions */}
          <meshStandardMaterial color="gray" /> {/* Grey color */}
        </mesh>
      );
    });

    return (
      <group>
        {strings}
      </group>
    );
  }

  return null;
};

export default HarpStringModel;
