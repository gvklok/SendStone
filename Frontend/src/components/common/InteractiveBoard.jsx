import React, { useEffect, useState } from 'react';
import boardImage from '../../assets/board.png';

// Calibrated grid configuration for Kilter Board
// X: 0-10 with 0.5 steps, Y: 0-14 with 0.5 steps
const BOARD_CONFIG = {
  x: {
    values: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10],
    guides: [0.000, 0.0727, 0.11, 0.1688, 0.2013, 0.2575, 0.295, 0.3488, 0.3863, 0.4388, 0.4738, 0.5265, 0.564, 0.6175, 0.6563, 0.7125, 0.745, 0.7975, 0.8375, 0.8914, 0.9213]
  },
  y: {
    values: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14],
    guides: [0, 0.0538, 0.0788, 0.1185, 0.1452, 0.181, 0.2121, 0.2512, 0.2785, 0.319, 0.3449, 0.3849, 0.4141, 0.4467, 0.4759, 0.5159, 0.5436, 0.5868, 0.6151, 0.6529, 0.6779, 0.7167, 0.7425, 0.7836, 0.81, 0.8602, 0.8762, 0.9643, 0.9403]
  }
};

// Type to color mapping
const TYPE_TO_COLOR = { 1: 'blue', 2: 'green', 3: 'yellow', 4: 'red' };

// Hold colors for display
const HOLD_COLORS = {
  1: { bg: 'rgba(5, 103, 232, 1)', label: 'Middle' },
  2: { bg: 'rgb(34, 197, 94)', label: 'Start' },
  3: { bg: 'rgb(234, 179, 8)', label: 'Foothold' },
  4: { bg: 'rgb(239, 68, 68)', label: 'Finish' }
};

const InteractiveBoard = ({ onHoldsChange }) => {
  const [holds, setHolds] = useState([]);
  const [showGrid, setShowGrid] = useState(false);

  // Find lower bound grid value from click ratio
  const findLowerBoundGridValue = (ratio, axis) => {
    const { values, guides } = BOARD_CONFIG[axis];
    let lowerIndex = 0;
    for (let i = 0; i < guides.length; i++) {
      if (guides[i] <= ratio) lowerIndex = i;
      else break;
    }
    return values[lowerIndex];
  };

  // Notify parent of hold changes
  useEffect(() => {
    if (onHoldsChange) {
      const exportHolds = holds.map(h => ({
        x: h.gridX,
        y: h.gridY,
        color: TYPE_TO_COLOR[h.type] || 'blue'
      }));
      onHoldsChange(exportHolds);
    }
  }, [holds, onHoldsChange]);

  const handleBoardClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    // Store exact click position as percentage (for display)
    const displayX = xRatio * 100;
    const displayY = yRatio * 100;

    // Calculate grid coords (for data export)
    const yRatioFlipped = 1 - yRatio;
    const gridX = findLowerBoundGridValue(xRatio, 'x');
    const gridY = findLowerBoundGridValue(yRatioFlipped, 'y');

    // Check if clicking on existing hold (within ~3% radius)
    const existingHoldIndex = holds.findIndex(
      hold => Math.abs(hold.displayX - displayX) < 3 && Math.abs(hold.displayY - displayY) < 3
    );

    if (existingHoldIndex !== -1) {
      const updatedHolds = [...holds];
      const currentType = updatedHolds[existingHoldIndex].type;
      if (currentType === 4) {
        updatedHolds.splice(existingHoldIndex, 1);
      } else {
        updatedHolds[existingHoldIndex].type = currentType + 1;
      }
      setHolds(updatedHolds);
    } else {
      setHolds([...holds, { displayX, displayY, gridX, gridY, type: 1 }]);
    }
  };

  // Grid overlay
  const renderGridOverlay = () => {
    if (!showGrid) return null;
    const lines = [];

    BOARD_CONFIG.x.values.forEach((val, i) => {
      const ratio = BOARD_CONFIG.x.guides[i];
      const isInteger = Math.abs(val % 1) < 0.001;
      lines.push(
        <line key={`x-${i}`} x1={`${ratio * 100}%`} y1="0%" x2={`${ratio * 100}%`} y2="100%"
          stroke={isInteger ? 'rgba(0, 255, 0, 0.6)' : 'rgba(0, 255, 0, 0.25)'}
          strokeWidth={isInteger ? 2 : 1} />
      );
      if (isInteger) {
        lines.push(
          <text key={`x-label-${i}`} x={`${ratio * 100 + 0.5}%`} y="3%" fill="#00ff00" fontSize="10" fontFamily="monospace" fontWeight="bold">{val}</text>
        );
      }
    });

    BOARD_CONFIG.y.values.forEach((val, i) => {
      const ratio = BOARD_CONFIG.y.guides[i];
      const yPos = (1 - ratio) * 100;
      const isInteger = Math.abs(val % 1) < 0.001;
      lines.push(
        <line key={`y-${i}`} x1="0%" y1={`${yPos}%`} x2="100%" y2={`${yPos}%`}
          stroke={isInteger ? 'rgba(0, 255, 0, 0.6)' : 'rgba(0, 255, 0, 0.25)'}
          strokeWidth={isInteger ? 2 : 1} />
      );
      if (isInteger) {
        lines.push(
          <text key={`y-label-${i}`} x="1%" y={`${yPos - 0.5}%`} fill="#00ff00" fontSize="10" fontFamily="monospace" fontWeight="bold">{val}</text>
        );
      }
    });

    return <svg className="absolute inset-0 w-full h-full pointer-events-none">{lines}</svg>;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 p-4 bg-white border-2 border-gray-900">
        <button onClick={() => setShowGrid(!showGrid)}
          className={`px-4 py-2 font-bold text-sm uppercase border-2 ${showGrid ? 'bg-green-500 text-white border-green-600' : 'bg-gray-100 text-gray-700 border-gray-900'}`}>
          {showGrid ? 'Grid ON' : 'Grid OFF'}
        </button>
        <button onClick={() => setHolds([])}
          className="px-4 py-2 font-bold text-sm uppercase border-2 border-gray-900 bg-red-500 text-white">
          Clear All
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 p-4 bg-white border-2 border-gray-900">
        <span className="text-xs font-black uppercase text-gray-900">Click to cycle:</span>
        {[1, 2, 3, 4].map(type => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: HOLD_COLORS[type].bg }}></div>
            <span className="text-xs font-bold text-gray-700">{HOLD_COLORS[type].label}</span>
            {type < 4 && <span className="text-gray-400">→</span>}
          </div>
        ))}
        <span className="text-xs font-bold text-red-600">→ Delete</span>
      </div>

      {/* Board */}
      <div className="relative bg-neutral-900 border-4 border-gray-900 aspect-[3/4] cursor-crosshair overflow-hidden max-w-md mx-auto"
        onClick={handleBoardClick}>
        <img src={boardImage} alt="Board" className="w-full h-full object-contain opacity-90 pointer-events-none select-none" draggable="false" />
        {renderGridOverlay()}

        {/* Simple dots where you click */}
        {holds.map((hold, index) => (
          <div key={index} className="absolute pointer-events-none"
            style={{
              left: `${hold.displayX}%`,
              top: `${hold.displayY}%`,
              transform: 'translate(-50%, -50%)',
            }}>
            {/* Colored dot with white border */}
            <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
              style={{ backgroundColor: HOLD_COLORS[hold.type].bg }}>
              <span className="text-white text-[10px] font-bold">{index + 1}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Debug info */}
      {holds.length > 0 && (
        <div className="p-3 bg-gray-800 text-green-400 font-mono text-xs rounded border border-gray-700">
          <div className="font-bold mb-1">Holds ({holds.length}):</div>
          {holds.map((h, i) => (
            <div key={i}>#{i + 1}: ({h.gridX.toFixed(1)}, {h.gridY.toFixed(1)}) - {TYPE_TO_COLOR[h.type]}</div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map(type => (
          <div key={type} className="bg-white border-2 border-gray-900 p-2 text-center">
            <div className="w-5 h-5 mx-auto mb-1 rounded-full" style={{ backgroundColor: HOLD_COLORS[type].bg }}></div>
            <div className="text-xl font-black text-gray-900">{holds.filter(h => h.type === type).length}</div>
            <div className="text-[10px] font-bold text-gray-600 uppercase">{HOLD_COLORS[type].label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InteractiveBoard;
