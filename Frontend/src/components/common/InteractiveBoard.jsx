import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import boardImage from '../../assets/board.png';

// ═══════════════════════════════════════════════════════════════════
//  EMBEDDED HOLD DATA  (225 holds — 165 hand + 60 foot)
//  Pixel positions calibrated to an 800×1200 board frame.
//  cx/cy = center, r = radius, f = foothold flag
// ═══════════════════════════════════════════════════════════════════
const ALL_HOLDS = [
  // ── HANDHOLDS (165) — integer grid positions, r=37 ──
  {x:0,y:14,cx:35.8,cy:42.2,r:37,f:false},{x:1,y:14,cx:109.5,cy:42.2,r:37,f:false},{x:2,y:14,cx:182.1,cy:42.2,r:37,f:false},{x:3,y:14,cx:253.7,cy:42.2,r:37,f:false},{x:4,y:14,cx:327.4,cy:42.2,r:37,f:false},{x:5,y:14,cx:398,cy:42.2,r:37,f:false},{x:6,y:14,cx:473.6,cy:42.2,r:37,f:false},{x:7,y:14,cx:545.3,cy:42.2,r:37,f:false},{x:8,y:14,cx:616.9,cy:42.2,r:37,f:false},{x:9,y:14,cx:691.5,cy:42.2,r:37,f:false},{x:10,y:14,cx:762.2,cy:42.2,r:37,f:false},
  {x:0,y:13,cx:35.8,cy:122.9,r:37,f:false},{x:1,y:13,cx:109.5,cy:122.9,r:37,f:false},{x:2,y:13,cx:182.1,cy:122.9,r:37,f:false},{x:3,y:13,cx:253.7,cy:122.9,r:37,f:false},{x:4,y:13,cx:327.4,cy:122.9,r:37,f:false},{x:5,y:13,cx:398,cy:122.9,r:37,f:false},{x:6,y:13,cx:473.6,cy:122.9,r:37,f:false},{x:7,y:13,cx:545.3,cy:122.9,r:37,f:false},{x:8,y:13,cx:616.9,cy:122.9,r:37,f:false},{x:9,y:13,cx:691.5,cy:122.9,r:37,f:false},{x:10,y:13,cx:762.2,cy:122.9,r:37,f:false},
  {x:0,y:12,cx:35.8,cy:202.3,r:37,f:false},{x:1,y:12,cx:109.5,cy:202.3,r:37,f:false},{x:2,y:12,cx:182.1,cy:202.3,r:37,f:false},{x:3,y:12,cx:253.7,cy:202.3,r:37,f:false},{x:4,y:12,cx:327.4,cy:202.3,r:37,f:false},{x:5,y:12,cx:398,cy:202.3,r:37,f:false},{x:6,y:12,cx:473.6,cy:202.3,r:37,f:false},{x:7,y:12,cx:545.3,cy:202.3,r:37,f:false},{x:8,y:12,cx:616.9,cy:202.3,r:37,f:false},{x:9,y:12,cx:691.5,cy:202.3,r:37,f:false},{x:10,y:12,cx:762.2,cy:202.3,r:37,f:false},
  {x:0,y:11,cx:35.8,cy:283.1,r:37,f:false},{x:1,y:11,cx:109.5,cy:283.1,r:37,f:false},{x:2,y:11,cx:182.1,cy:283.1,r:37,f:false},{x:3,y:11,cx:253.7,cy:283.1,r:37,f:false},{x:4,y:11,cx:327.4,cy:283.1,r:37,f:false},{x:5,y:11,cx:398,cy:283.1,r:37,f:false},{x:6,y:11,cx:473.6,cy:283.1,r:37,f:false},{x:7,y:11,cx:545.3,cy:283.1,r:37,f:false},{x:8,y:11,cx:616.9,cy:283.1,r:37,f:false},{x:9,y:11,cx:691.5,cy:283.1,r:37,f:false},{x:10,y:11,cx:762.2,cy:283.1,r:37,f:false},
  {x:0,y:10,cx:35.8,cy:361.8,r:37,f:false},{x:1,y:10,cx:109.5,cy:361.8,r:37,f:false},{x:2,y:10,cx:182.1,cy:361.8,r:37,f:false},{x:3,y:10,cx:253.7,cy:361.8,r:37,f:false},{x:4,y:10,cx:327.4,cy:361.8,r:37,f:false},{x:5,y:10,cx:398,cy:361.8,r:37,f:false},{x:6,y:10,cx:473.6,cy:361.8,r:37,f:false},{x:7,y:10,cx:545.3,cy:361.8,r:37,f:false},{x:8,y:10,cx:616.9,cy:361.8,r:37,f:false},{x:9,y:10,cx:691.5,cy:361.8,r:37,f:false},{x:10,y:10,cx:762.2,cy:361.8,r:37,f:false},
  {x:0,y:9,cx:35.8,cy:439.9,r:37,f:false},{x:1,y:9,cx:109.5,cy:439.9,r:37,f:false},{x:2,y:9,cx:182.1,cy:439.9,r:37,f:false},{x:3,y:9,cx:253.7,cy:439.9,r:37,f:false},{x:4,y:9,cx:327.4,cy:439.9,r:37,f:false},{x:5,y:9,cx:398,cy:439.9,r:37,f:false},{x:6,y:9,cx:473.6,cy:439.9,r:37,f:false},{x:7,y:9,cx:545.3,cy:439.9,r:37,f:false},{x:8,y:9,cx:616.9,cy:439.9,r:37,f:false},{x:9,y:9,cx:691.5,cy:439.9,r:37,f:false},{x:10,y:9,cx:762.2,cy:439.9,r:37,f:false},
  {x:0,y:8,cx:35.8,cy:520.6,r:37,f:false},{x:1,y:8,cx:109.5,cy:520.6,r:37,f:false},{x:2,y:8,cx:182.1,cy:520.6,r:37,f:false},{x:3,y:8,cx:253.7,cy:520.6,r:37,f:false},{x:4,y:8,cx:327.4,cy:520.6,r:37,f:false},{x:5,y:8,cx:398,cy:520.6,r:37,f:false},{x:6,y:8,cx:473.6,cy:520.6,r:37,f:false},{x:7,y:8,cx:545.3,cy:520.6,r:37,f:false},{x:8,y:8,cx:616.9,cy:520.6,r:37,f:false},{x:9,y:8,cx:691.5,cy:520.6,r:37,f:false},{x:10,y:8,cx:762.2,cy:520.6,r:37,f:false},
  {x:0,y:7,cx:35.8,cy:603.3,r:37,f:false},{x:1,y:7,cx:109.5,cy:603.3,r:37,f:false},{x:2,y:7,cx:182.1,cy:603.3,r:37,f:false},{x:3,y:7,cx:253.7,cy:603.3,r:37,f:false},{x:4,y:7,cx:327.4,cy:603.3,r:37,f:false},{x:5,y:7,cx:398,cy:603.3,r:37,f:false},{x:6,y:7,cx:473.6,cy:603.3,r:37,f:false},{x:7,y:7,cx:545.3,cy:603.3,r:37,f:false},{x:8,y:7,cx:616.9,cy:603.3,r:37,f:false},{x:9,y:7,cx:691.5,cy:603.3,r:37,f:false},{x:10,y:7,cx:762.2,cy:603.3,r:37,f:false},
  {x:0,y:6,cx:35.8,cy:681.1,r:37,f:false},{x:1,y:6,cx:109.5,cy:681.1,r:37,f:false},{x:2,y:6,cx:182.1,cy:681.1,r:37,f:false},{x:3,y:6,cx:253.7,cy:681.1,r:37,f:false},{x:4,y:6,cx:327.4,cy:681.1,r:37,f:false},{x:5,y:6,cx:398,cy:681.1,r:37,f:false},{x:6,y:6,cx:473.6,cy:681.1,r:37,f:false},{x:7,y:6,cx:545.3,cy:681.1,r:37,f:false},{x:8,y:6,cx:616.9,cy:681.1,r:37,f:false},{x:9,y:6,cx:691.5,cy:681.1,r:37,f:false},{x:10,y:6,cx:762.2,cy:681.1,r:37,f:false},
  {x:0,y:5,cx:35.8,cy:763.8,r:37,f:false},{x:1,y:5,cx:109.5,cy:763.8,r:37,f:false},{x:2,y:5,cx:182.1,cy:763.8,r:37,f:false},{x:3,y:5,cx:253.7,cy:763.8,r:37,f:false},{x:4,y:5,cx:327.4,cy:763.8,r:37,f:false},{x:5,y:5,cx:398,cy:763.8,r:37,f:false},{x:6,y:5,cx:473.6,cy:763.8,r:37,f:false},{x:7,y:5,cx:545.3,cy:763.8,r:37,f:false},{x:8,y:5,cx:616.9,cy:763.8,r:37,f:false},{x:9,y:5,cx:691.5,cy:763.8,r:37,f:false},{x:10,y:5,cx:762.2,cy:763.8,r:37,f:false},
  {x:0,y:4,cx:35.8,cy:843.5,r:37,f:false},{x:1,y:4,cx:109.5,cy:843.5,r:37,f:false},{x:2,y:4,cx:182.1,cy:843.5,r:37,f:false},{x:3,y:4,cx:253.7,cy:843.5,r:37,f:false},{x:4,y:4,cx:327.4,cy:843.5,r:37,f:false},{x:5,y:4,cx:398,cy:843.5,r:37,f:false},{x:6,y:4,cx:473.6,cy:843.5,r:37,f:false},{x:7,y:4,cx:545.3,cy:843.5,r:37,f:false},{x:8,y:4,cx:616.9,cy:843.5,r:37,f:false},{x:9,y:4,cx:691.5,cy:843.5,r:37,f:false},{x:10,y:4,cx:762.2,cy:843.5,r:37,f:false},
  {x:0,y:3,cx:35.8,cy:922.3,r:37,f:false},{x:1,y:3,cx:109.5,cy:922.3,r:37,f:false},{x:2,y:3,cx:182.1,cy:922.3,r:37,f:false},{x:3,y:3,cx:253.7,cy:922.3,r:37,f:false},{x:4,y:3,cx:327.4,cy:922.3,r:37,f:false},{x:5,y:3,cx:398,cy:922.3,r:37,f:false},{x:6,y:3,cx:473.6,cy:922.3,r:37,f:false},{x:7,y:3,cx:545.3,cy:922.3,r:37,f:false},{x:8,y:3,cx:616.9,cy:922.3,r:37,f:false},{x:9,y:3,cx:691.5,cy:922.3,r:37,f:false},{x:10,y:3,cx:762.2,cy:922.3,r:37,f:false},
  {x:0,y:2,cx:35.8,cy:1002,r:37,f:false},{x:1,y:2,cx:109.5,cy:1002,r:37,f:false},{x:2,y:2,cx:182.1,cy:1002,r:37,f:false},{x:3,y:2,cx:253.7,cy:1002,r:37,f:false},{x:4,y:2,cx:327.4,cy:1002,r:37,f:false},{x:5,y:2,cx:398,cy:1002,r:37,f:false},{x:6,y:2,cx:473.6,cy:1002,r:37,f:false},{x:7,y:2,cx:545.3,cy:1002,r:37,f:false},{x:8,y:2,cx:616.9,cy:1002,r:37,f:false},{x:9,y:2,cx:691.5,cy:1002,r:37,f:false},{x:10,y:2,cx:762.2,cy:1002,r:37,f:false},
  {x:0,y:1,cx:35.8,cy:1082.7,r:37,f:false},{x:1,y:1,cx:109.5,cy:1082.7,r:37,f:false},{x:2,y:1,cx:182.1,cy:1082.7,r:37,f:false},{x:3,y:1,cx:253.7,cy:1082.7,r:37,f:false},{x:4,y:1,cx:327.4,cy:1082.7,r:37,f:false},{x:5,y:1,cx:398,cy:1082.7,r:37,f:false},{x:6,y:1,cx:473.6,cy:1082.7,r:37,f:false},{x:7,y:1,cx:545.3,cy:1082.7,r:37,f:false},{x:8,y:1,cx:616.9,cy:1082.7,r:37,f:false},{x:9,y:1,cx:691.5,cy:1082.7,r:37,f:false},{x:10,y:1,cx:762.2,cy:1082.7,r:37,f:false},
  {x:0,y:0,cx:35.8,cy:1165.4,r:37,f:false},{x:1,y:0,cx:109.5,cy:1165.4,r:37,f:false},{x:2,y:0,cx:182.1,cy:1165.4,r:37,f:false},{x:3,y:0,cx:253.7,cy:1165.4,r:37,f:false},{x:4,y:0,cx:327.4,cy:1165.4,r:37,f:false},{x:5,y:0,cx:398,cy:1165.4,r:37,f:false},{x:6,y:0,cx:473.6,cy:1165.4,r:37,f:false},{x:7,y:0,cx:545.3,cy:1165.4,r:37,f:false},{x:8,y:0,cx:616.9,cy:1165.4,r:37,f:false},{x:9,y:0,cx:691.5,cy:1165.4,r:37,f:false},{x:10,y:0,cx:762.2,cy:1165.4,r:37,f:false},
  // ── FOOTHOLDS (60) — .5 grid positions, r=20 ──
  {x:0.5,y:11.5,cx:72.6,cy:244.5,r:20,f:true},{x:2.5,y:11.5,cx:217.9,cy:241.5,r:20,f:true},{x:4.5,y:11.5,cx:364.2,cy:242.5,r:20,f:true},{x:6.5,y:11.5,cx:511.4,cy:243.5,r:20,f:true},{x:8.5,y:11.5,cx:652.8,cy:237.5,r:20,f:true},
  {x:1.5,y:10.5,cx:150.2,cy:323.6,r:20,f:true},{x:3.5,y:10.5,cx:292.5,cy:325.6,r:20,f:true},{x:5.5,y:10.5,cx:436.8,cy:325.6,r:20,f:true},{x:7.5,y:10.5,cx:583.1,cy:324.6,r:20,f:true},{x:9.5,y:10.5,cx:726.4,cy:325.6,r:20,f:true},
  {x:0.5,y:9.5,cx:76.6,cy:405.3,r:20,f:true},{x:2.5,y:9.5,cx:220.9,cy:406.3,r:20,f:true},{x:4.5,y:9.5,cx:363.2,cy:402.3,r:20,f:true},{x:6.5,y:9.5,cx:507.5,cy:399.3,r:20,f:true},{x:8.5,y:9.5,cx:654.7,cy:404.3,r:20,f:true},
  {x:1.5,y:8.5,cx:150.2,cy:478.1,r:20,f:true},{x:3.5,y:8.5,cx:289.6,cy:483.1,r:20,f:true},{x:5.5,y:8.5,cx:435.8,cy:482.1,r:20,f:true},{x:7.5,y:8.5,cx:573.1,cy:486,r:20,f:true},{x:9.5,y:8.5,cx:722.4,cy:482.1,r:20,f:true},
  {x:0.5,y:7.5,cx:70.6,cy:563.8,r:20,f:true},{x:2.5,y:7.5,cx:221.9,cy:564.8,r:20,f:true},{x:4.5,y:7.5,cx:363.2,cy:566.8,r:20,f:true},{x:6.5,y:7.5,cx:505.5,cy:563.8,r:20,f:true},{x:8.5,y:7.5,cx:650.7,cy:563.8,r:20,f:true},
  {x:1.5,y:6.5,cx:149.3,cy:645.5,r:20,f:true},{x:3.5,y:6.5,cx:295.5,cy:646.8,r:20,f:true},{x:5.5,y:6.5,cx:441.8,cy:643.9,r:20,f:true},{x:7.5,y:6.5,cx:582.1,cy:643.9,r:20,f:true},{x:9.5,y:6.5,cx:726.4,cy:641.9,r:20,f:true},
  {x:0.5,y:5.5,cx:78.6,cy:724.3,r:20,f:true},{x:2.5,y:5.5,cx:220.9,cy:724.2,r:20,f:true},{x:4.5,y:5.5,cx:365.2,cy:721.3,r:20,f:true},{x:6.5,y:5.5,cx:507.5,cy:720.3,r:20,f:true},{x:8.5,y:5.5,cx:650.7,cy:720.3,r:20,f:true},
  {x:1.5,y:4.5,cx:151.2,cy:805,r:20,f:true},{x:3.5,y:4.5,cx:293.5,cy:805,r:20,f:true},{x:5.5,y:4.5,cx:436.8,cy:804,r:20,f:true},{x:7.5,y:4.5,cx:581.1,cy:804,r:20,f:true},{x:9.5,y:4.5,cx:727.4,cy:801,r:20,f:true},
  {x:0.5,y:3.5,cx:77.6,cy:884.7,r:20,f:true},{x:2.5,y:3.5,cx:220.9,cy:883.7,r:20,f:true},{x:4.5,y:3.5,cx:364.2,cy:883.7,r:20,f:true},{x:6.5,y:3.5,cx:508.5,cy:883.7,r:20,f:true},{x:8.5,y:3.5,cx:654.7,cy:879.7,r:20,f:true},
  {x:1.5,y:2.5,cx:149.3,cy:960.1,r:20,f:true},{x:3.5,y:2.5,cx:293.5,cy:964.1,r:20,f:true},{x:5.5,y:2.5,cx:435.8,cy:962.1,r:20,f:true},{x:7.5,y:2.5,cx:579.1,cy:963.1,r:20,f:true},{x:9.5,y:2.5,cx:723.4,cy:966.1,r:20,f:true},
  {x:0.5,y:1.5,cx:67.7,cy:1035.9,r:20,f:true},{x:2.5,y:1.5,cx:217.9,cy:1045.8,r:20,f:true},{x:4.5,y:1.5,cx:361.2,cy:1042.9,r:20,f:true},{x:6.5,y:1.5,cx:507.5,cy:1044.9,r:20,f:true},{x:8.5,y:1.5,cx:648.8,cy:1046.8,r:20,f:true},
  {x:1.5,y:0.5,cx:145.3,cy:1122.6,r:20,f:true},{x:3.5,y:0.5,cx:289.6,cy:1123.6,r:20,f:true},{x:5.5,y:0.5,cx:432.8,cy:1121.6,r:20,f:true},{x:7.5,y:0.5,cx:580.1,cy:1125.6,r:20,f:true},{x:9.5,y:0.5,cx:725.4,cy:1124.6,r:20,f:true},
];

// Board frame reference size (pixel coords above are relative to this)
const BOARD_W = 800;
const BOARD_H = 1200;

// Color cycle: blue → green → yellow → red → remove
const COLOR_CYCLE = ['blue', 'green', 'yellow', 'red'];
const COLOR_LABELS = { blue: 'Middle', green: 'Start', yellow: 'Foothold', red: 'Finish' };

const COLOR_STYLES = {
  blue:   { border: 'rgba(5,103,232,1)',   shadow: 'rgba(5,103,232,0.5)',   hoverShadow: 'rgba(5,103,232,0.7)' },
  green:  { border: 'rgb(34,197,94)',      shadow: 'rgba(34,197,94,0.5)',   hoverShadow: 'rgba(34,197,94,0.7)' },
  yellow: { border: 'rgb(234,179,8)',      shadow: 'rgba(234,179,8,0.5)',   hoverShadow: 'rgba(234,179,8,0.7)' },
  red:    { border: 'rgb(239,68,68)',      shadow: 'rgba(239,68,68,0.5)',   hoverShadow: 'rgba(239,68,68,0.7)' },
};

const InteractiveBoard = ({ onHoldsChange }) => {
  // selectedRoute: array of { x, y, color }
  const [selectedRoute, setSelectedRoute] = useState([]);
  const [scale, setScale] = useState(1);
  const frameRef = useRef(null);

  // Measure the rendered board frame and compute scale factor
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const w = frame.clientWidth;
      setScale(w / BOARD_W);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);

  // Notify parent whenever route changes
  useEffect(() => {
    if (onHoldsChange) {
      onHoldsChange(selectedRoute.map(r => ({ x: r.x, y: r.y, color: r.color })));
    }
  }, [selectedRoute, onHoldsChange]);

  // Click handler — cycle: none → blue → green → yellow → red → remove
  const onHoldClick = useCallback((holdData) => {
    setSelectedRoute(prev => {
      const idx = prev.findIndex(r => r.x === holdData.x && r.y === holdData.y);
      if (idx === -1) {
        return [...prev, { x: holdData.x, y: holdData.y, color: 'blue' }];
      }
      const cur = prev[idx].color;
      const ci = COLOR_CYCLE.indexOf(cur);
      if (ci === COLOR_CYCLE.length - 1) {
        return prev.filter((_, i) => i !== idx);
      }
      const next = [...prev];
      next[idx] = { ...next[idx], color: COLOR_CYCLE[ci + 1] };
      return next;
    });
  }, []);

  const clearRoute = () => setSelectedRoute([]);

  const getHoldColor = (hx, hy) => {
    const entry = selectedRoute.find(r => r.x === hx && r.y === hy);
    return entry ? entry.color : null;
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="sendstone-click-holds-legend px-3 py-3 md:px-4 bg-white border-2 border-gray-200 rounded-xl">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <span className="text-xs md:text-sm font-black text-gray-800 uppercase tracking-wide md:tracking-wider whitespace-nowrap">
            Click Holds:
          </span>
          {COLOR_CYCLE.map(color => (
            <div key={color} className="flex items-center gap-1.5">
              <div className="w-4 h-4 md:w-5 md:h-5 rounded-full" style={{ backgroundColor: COLOR_STYLES[color].border }} />
              <span className="text-xs md:text-sm font-semibold text-gray-600 whitespace-nowrap">{COLOR_LABELS[color]}</span>
            </div>
          ))}
          <button
            onClick={clearRoute}
            className="md:ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Clear all holds"
            aria-label="Clear all holds"
          >
            <Trash2 size={15} strokeWidth={2.25} />
            <span className="text-xs font-semibold">Clear</span>
          </button>
        </div>
      </div>

      {/* Board frame — width-driven, height follows 800:1200 ratio */}
      <div
        ref={frameRef}
        className="sendstone-board-surface relative bg-neutral-900 border-4 border-gray-900 overflow-hidden max-w-lg mx-auto"
        style={{ width: '100%', aspectRatio: `${BOARD_W} / ${BOARD_H}` }}
      >
        {/* Image stretches to fill frame exactly — no object-contain */}
        <img
          src={boardImage}
          alt="Kilter Board"
          className="sendstone-board-image pointer-events-none select-none block"
          style={{ width: '100%', height: '100%' }}
          draggable="false"
        />

        {/* Hold buttons — pixel positions scaled from 800×1200 reference */}
        {ALL_HOLDS.map((h) => {
          const isFoot = h.f;
          const color = getHoldColor(h.x, h.y);

          // Scale pixel coords to rendered size
          const d = h.r * 2 * scale;
          const left = (h.cx - h.r) * scale;
          const top = (h.cy - h.r) * scale;

          const borderWidth = color ? Math.max(3, 3 * scale) : 0;

          const style = {
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            width: `${d}px`,
            height: `${d}px`,
            borderRadius: '50%',
            border: color
              ? `${borderWidth}px solid ${COLOR_STYLES[color].border}`
              : '0px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            outline: 'none',

            zIndex: color ? 20 : (isFoot ? 10 : 5),
            boxShadow: color ? `0 0 ${10 * scale}px ${COLOR_STYLES[color].shadow}` : 'none',
            transition: 'border-color 0.1s, box-shadow 0.15s, opacity 0.15s',
            boxSizing: 'border-box',
          };

          return (
            <button
              key={`${h.x}-${h.y}`}
              title={`(${h.x}, ${h.y})`}
              style={style}
              onClick={() => onHoldClick(h)}
              onMouseEnter={(e) => {
                if (!color) {
                  e.currentTarget.style.border = `2px solid rgba(255,255,255,0.45)`;
                  e.currentTarget.style.boxShadow = '0 0 6px rgba(255,255,255,0.15)';
                } else {
                  e.currentTarget.style.boxShadow = `0 0 16px ${COLOR_STYLES[color].hoverShadow}`;
                }
              }}
              onMouseLeave={(e) => {
                if (!color) {
                  e.currentTarget.style.border = '0px solid transparent';
                  e.currentTarget.style.boxShadow = 'none';
                } else {
                  e.currentTarget.style.border = `${borderWidth}px solid ${COLOR_STYLES[color].border}`;
                  e.currentTarget.style.boxShadow = `0 0 ${10 * scale}px ${COLOR_STYLES[color].shadow}`;
                }
              }}
            />
          );
        })}
      </div>

      {/* Hold list */}
      {selectedRoute.length > 0 && (
        <div className="p-3 bg-gray-800 rounded border border-gray-700 max-h-48 overflow-y-auto">
          <div className="font-bold text-xs text-cyan-400 mb-1 uppercase tracking-wider">
            Route · {selectedRoute.length} holds
          </div>
          {[...selectedRoute]
            .sort((a, b) => b.y - a.y || a.x - b.x)
            .map((r, i) => (
              <div
                key={`${r.x}-${r.y}`}
                className="flex items-center gap-2 px-2 py-1 text-xs font-mono rounded mb-0.5"
                style={{
                  background: '#0d1b36',
                  borderLeft: `3px solid ${COLOR_STYLES[r.color].border}`,
                }}
              >
                <span className="text-gray-300">({r.x}, {r.y})</span>
                <span className="text-gray-500 ml-auto">{COLOR_LABELS[r.color]}</span>
              </div>
            ))}
        </div>
      )}

      {/* Summary counts */}
      <div className="sendstone-click-holds-summary grid grid-cols-4 gap-2">
        {COLOR_CYCLE.map(color => (
          <div key={color} className="bg-white border-2 border-gray-900 p-2 text-center">
            <div className="w-5 h-5 mx-auto mb-1 rounded-full" style={{ backgroundColor: COLOR_STYLES[color].border }} />
            <div className="text-xl font-black text-gray-900">
              {selectedRoute.filter(r => r.color === color).length}
            </div>
            <div className="text-[10px] font-bold text-gray-600 uppercase">{COLOR_LABELS[color]}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InteractiveBoard;
