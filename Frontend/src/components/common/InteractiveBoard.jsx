import React, { useState } from 'react';
import boardImage from '../../assets/board.png';

const InteractiveBoard = () => {
  const [holds, setHolds] = useState([]);

  const holdTypes = {
    0: { color: 'transparent', label: 'None', ring: '' },
    1: { color: 'rgba(5, 103, 232, 1)', label: 'Middle', ring: 'ring-4 ring-blue-400' }, // Brighter Blue
    2: { color: 'rgb(34, 197, 94)', label: 'Start', ring: 'ring-4 ring-green-500' },   // Green
    3: { color: 'rgb(234, 179, 8)', label: 'Foothold', ring: 'ring-4 ring-yellow-500' }, // Yellow
    4: { color: 'rgb(239, 68, 68)', label: 'Finish', ring: 'ring-4 ring-red-500' }    // Red
  };

  const handleBoardClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if clicking on existing hold
    const existingHoldIndex = holds.findIndex(
      hold => Math.abs(hold.x - x) < 3 && Math.abs(hold.y - y) < 3
    );

    if (existingHoldIndex !== -1) {
      // Cycle through hold types
      const updatedHolds = [...holds];
      const currentType = updatedHolds[existingHoldIndex].type;
      const nextType = (currentType + 1) % 5; // Cycles 0 -> 1 -> 2 -> 3 -> 4 -> 0

      if (nextType === 0) {
        // Remove hold if cycling back to "None"
        updatedHolds.splice(existingHoldIndex, 1);
      } else {
        updatedHolds[existingHoldIndex].type = nextType;
      }
      setHolds(updatedHolds);
    } else {
      // Add new hold starting with type 1 (Middle/Blue)
      setHolds([...holds, { x, y, type: 1 }]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 p-4 bg-white border-2 border-gray-900">
        <div className="text-xs md:text-sm font-black uppercase tracking-wider text-gray-900">
          Click holds:
        </div>
        {[1, 2, 3, 4].map(type => (
          <div key={type} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${holdTypes[type].ring}`} 
                 style={{ backgroundColor: holdTypes[type].color }}></div>
            <span className="text-xs md:text-sm font-bold text-gray-700">
              {holdTypes[type].label}
            </span>
          </div>
        ))}
      </div>

      {/* Interactive Board */}
      <div 
        className="relative bg-neutral-900 border-4 border-gray-900 aspect-[3/4] cursor-crosshair overflow-hidden max-w-md mx-auto"
        onClick={handleBoardClick}
      >
        <img 
          src={boardImage} 
          alt="Climbing board" 
          className="w-full h-full object-contain opacity-90 pointer-events-none select-none"
          draggable="false"
        />
        
        {/* Render hold markers */}
        {holds.map((hold, index) => (
          <div
            key={index}
            className={`absolute w-1 h-8 md:w-10 md:h-10 rounded-full border-3 ${holdTypes[hold.type].ring} pointer-events-none transition-all duration-200`}
            style={{
              left: `${hold.x}%`,
              top: `${hold.y}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: `${holdTypes[hold.type].color}40`, // 40 = 25% opacity
              borderColor: holdTypes[hold.type].color,
            }}
          >
            <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                 style={{ backgroundColor: holdTypes[hold.type].color }}></div>
          </div>
        ))}
      </div>

      {/* Hold Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(type => {
          const count = holds.filter(h => h.type === type).length;
          return (
            <div key={type} className="bg-white border-2 border-gray-900 p-3 text-center">
              <div className={`w-6 h-6 mx-auto mb-2 rounded-full`}
                   style={{ backgroundColor: holdTypes[type].color }}></div>
              <div className="text-2xl font-black text-gray-900">{count}</div>
              <div className="text-xs font-bold text-gray-600 uppercase">{holdTypes[type].label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InteractiveBoard;
