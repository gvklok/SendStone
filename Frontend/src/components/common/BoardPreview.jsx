import React, { useEffect, useRef, useState } from 'react';
import boardImage from '../../assets/board.png';

// ═══════════════════════════════════════════════════════════════════
//  HOLD POSITION LOOKUP (same data as InteractiveBoard)
//  225 holds — 165 hand + 60 foot, calibrated to 800×1200 frame
// ═══════════════════════════════════════════════════════════════════
const ALL_HOLDS = [
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
  // ── FOOTHOLDS (60) ──
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

// Build a fast lookup map: "x,y" → hold data
const HOLD_MAP = new Map();
ALL_HOLDS.forEach(h => HOLD_MAP.set(`${h.x},${h.y}`, h));

const BOARD_W = 800;
const BOARD_H = 1200;

const COLOR_STYLES = {
  blue:   'rgba(5,103,232,1)',
  green:  'rgb(34,197,94)',
  yellow: 'rgb(234,179,8)',
  red:    'rgb(239,68,68)',
};

/**
 * Read-only board preview that renders hold rings at exact positions.
 *
 * Props:
 *   holds     — array of { x, y, color } (grid coords + color name)
 *   path      — optional ordered array of { x, y, color } from ML prediction
 *   showPath  — whether to draw the path lines/numbers (default false)
 *   className — extra classes on the outer wrapper
 */
const BoardPreview = ({ holds = [], path = [], showPath = false, className = '' }) => {
  const frameRef = useRef(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setScale(frame.clientWidth / BOARD_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);

  // Resolve each hold from route data to pixel position
  const resolved = holds
    .map(h => {
      const key = `${h.x},${h.y}`;
      const pos = HOLD_MAP.get(key);
      if (!pos) return null;
      return { ...pos, color: h.color || 'blue' };
    })
    .filter(Boolean);

  // Resolve path holds to pixel centres
  const resolvedPath = (showPath && path.length > 1)
    ? path
        .map(h => {
          const pos = HOLD_MAP.get(`${h.x},${h.y}`);
          return pos ? { cx: pos.cx, cy: pos.cy, color: h.color } : null;
        })
        .filter(Boolean)
    : [];

  return (
    <div
      ref={frameRef}
      className={`sendstone-board-surface relative bg-neutral-900 overflow-hidden ${className}`}
      style={{ width: '100%', aspectRatio: `${BOARD_W} / ${BOARD_H}` }}
    >
      <img
        src={boardImage}
        alt="Kilter Board"
        className="sendstone-board-image pointer-events-none select-none block"
        style={{ width: '100%', height: '100%' }}
        draggable="false"
      />

      {/* Path overlay — SVG lines + step numbers */}
      {scale > 0 && resolvedPath.length > 1 && (
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
          preserveAspectRatio="none"
        >
          {resolvedPath.slice(0, -1).map((pt, i) => {
            const next = resolvedPath[i + 1];
            const dx = next.cx - pt.cx;
            const dy = next.cy - pt.cy;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const pad = 32;
            const x1 = pt.cx + (dx / len) * pad;
            const y1 = pt.cy + (dy / len) * pad;
            const x2 = next.cx - (dx / len) * pad;
            const y2 = next.cy - (dy / len) * pad;
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#F5A623" strokeWidth="5" strokeLinecap="round" strokeDasharray="14 8" />
            );
          })}
          {/* Step number badges — filled with the hold's own color */}
          {resolvedPath.map((pt, i) => {
            const fill = COLOR_STYLES[pt.color] || COLOR_STYLES.blue;
            return (
              <g key={`n${i}`}>
                <circle cx={pt.cx} cy={pt.cy} r="13" fill={fill} />
                <text
                  x={pt.cx} y={pt.cy}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="14" fontWeight="bold" fill="white"
                  fontFamily="sans-serif"
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {scale > 0 && resolved.map((h) => {
        const d = h.r * 2 * scale;
        const left = (h.cx - h.r) * scale;
        const top = (h.cy - h.r) * scale;
        const borderColor = COLOR_STYLES[h.color] || COLOR_STYLES.blue;
        const bw = Math.max(2, 3 * scale);

        return (
          <div
            key={`${h.x}-${h.y}`}
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              width: `${d}px`,
              height: `${d}px`,
              borderRadius: '50%',
              border: `${bw}px solid ${borderColor}`,
              boxShadow: `0 0 ${8 * scale}px ${borderColor}`,
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </div>
  );
};

export default BoardPreview;
