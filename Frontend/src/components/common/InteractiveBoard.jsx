import React, { useEffect, useState } from 'react';
import boardImage from '../../assets/board.png';

const InteractiveBoard = ({ onHoldsChange, initialHolds = [] }) => {
  const [holds, setHolds] = useState(initialHolds || []);
  const [imageMeta, setImageMeta] = useState({ data: null, width: 0, height: 0 });

  const holdTypes = {
    0: { color: 'transparent', label: 'None', ring: '' },
    1: { color: 'rgba(5, 103, 232, 1)', label: 'Middle', ring: 'ring-4 ring-blue-400' }, // Brighter Blue
    2: { color: 'rgb(34, 197, 94)', label: 'Start', ring: 'ring-4 ring-green-500' },   // Green
    3: { color: 'rgb(234, 179, 8)', label: 'Foothold', ring: 'ring-4 ring-yellow-500' }, // Yellow
    4: { color: 'rgb(239, 68, 68)', label: 'Finish', ring: 'ring-4 ring-red-500' }    // Red
  };

  useEffect(() => {
    if (initialHolds && initialHolds.length > 0) {
      setHolds(initialHolds);
    }
  }, [initialHolds]);

  useEffect(() => {
    if (onHoldsChange) {
      onHoldsChange(holds);
    }
  }, [holds, onHoldsChange]);

  // Preload the board image into a hidden canvas so we can find the nearest bright pixel (a hold)
  useEffect(() => {
    const img = new Image();
    img.src = boardImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setImageMeta({ data, width, height });
    };
  }, []);

  const findNearestHoldPixel = (px, py) => {
    const { data, width, height } = imageMeta;
    if (!data) return null;

    const threshold = 35; // brightness threshold to consider a pixel part of a hold
    const maxRadius = 50; // px search radius
    let closest = null;
    let closestDist = Infinity;

    for (let dy = -maxRadius; dy <= maxRadius; dy++) {
      const y = py + dy;
      if (y < 0 || y >= height) continue;
      for (let dx = -maxRadius; dx <= maxRadius; dx++) {
        const x = px + dx;
        if (x < 0 || x >= width) continue;
        const dist2 = dx * dx + dy * dy;
        if (dist2 > maxRadius * maxRadius || dist2 >= closestDist) continue;
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (luminance > threshold) {
          closest = { x, y };
          closestDist = dist2;
        }
      }
    }

    return closest;
  };

  const handleBoardClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    let xPercent = xRatio * 100;
    let yPercent = yRatio * 100;

    if (imageMeta.data) {
      const px = Math.round(xRatio * imageMeta.width);
      const py = Math.round(yRatio * imageMeta.height);
      const snapped = findNearestHoldPixel(px, py);

      // If no hold nearby, skip placing the marker
      if (!snapped) return;

      xPercent = (snapped.x / imageMeta.width) * 100;
      yPercent = (snapped.y / imageMeta.height) * 100;
    }

    // Check if clicking on existing hold
    const existingHoldIndex = holds.findIndex(
      hold => Math.abs(hold.x - xPercent) < 3 && Math.abs(hold.y - yPercent) < 3
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
      setHolds([...holds, { x: xPercent, y: yPercent, type: 1 }]);
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
            className={`absolute w-8 h-8 md:w-10 md:h-10 rounded-full border-3 ${holdTypes[hold.type].ring} pointer-events-none transition-all duration-200`}
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
