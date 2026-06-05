import { useState } from "react";
import rouletteImg from "@assets/rulet_field_1780658722589.png";

const BASE_W = 1894;
const BASE_H = 830;

interface Zone {
  number: number;
  points: { x: number; y: number }[];
  centerX: number;
  centerY: number;
}

function centroid(pts: { x: number; y: number }[]) {
  const n = pts.length;
  const x = pts.reduce((s, p) => s + p.x, 0) / n;
  const y = pts.reduce((s, p) => s + p.y, 0) / n;
  return { x, y };
}

function pStr(pts: { x: number; y: number }[]) {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/*
  Coordinate system based on the 1894×830 image.

  The roulette table layout (approximate pixel values measured from image):

  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │  WOOD RAIL (top ≈40px)                                                               │
  │  ┌───┬──────────────────────────────────────────────────────────────────────┬──────┐ │
  │  │ 0 │  3  │  6  │  9  │ 12  │ 15  │ 18  │ 21  │ 24  │ 27  │ 30  │ 33  │ 36 │2to1│ │
  │  │   │  2  │  5  │  8  │ 11  │ 14  │ 17  │ 20  │ 23  │ 26  │ 29  │ 32  │ 35 │    │ │
  │  │   │  1  │  4  │  7  │ 10  │ 13  │ 16  │ 19  │ 22  │ 25  │ 28  │ 31  │ 34 │    │ │
  │  └───┴──────────────────────────────────────────────────────────────────────┴──────┘ │
  │  ...dozen and even-money rows below...                                               │
  └──────────────────────────────────────────────────────────────────────────────────────┘

  Measured approximate boundaries (at 1894×830 resolution):
    Zero left edge  : x =  74
    Zero right edge : x = 228
    Grid left edge  : x = 228
    Grid right edge : x = 1760  (before the 2:1 column)
    Grid top        : y =  90
    Grid bottom     : y = 472

  Perspective: the table top is very slightly narrower than the bottom.
  We apply a small linear taper of ~8px total across the width.
*/

const ZERO_LEFT = 74;
const ZERO_RIGHT = 228;
const ZERO_TOP = 90;
const ZERO_BOT = 472;

const GRID_LEFT = 228;
const GRID_RIGHT = 1760;
const GRID_TOP = 90;
const GRID_BOT = 472;

const NUM_COLS = 12;
const NUM_ROWS = 3;

const COL_W = (GRID_RIGHT - GRID_LEFT) / NUM_COLS;
const ROW_H = (GRID_BOT - GRID_TOP) / NUM_ROWS;

const PERSPECTIVE_TAPER = 8;

function colX(col: number, row: number, side: "left" | "right"): number {
  const xBase = GRID_LEFT + col * COL_W + (side === "right" ? COL_W : 0);
  const frac = (row * ROW_H) / (GRID_BOT - GRID_TOP);
  const offset = PERSPECTIVE_TAPER * frac;
  return xBase + offset;
}

function buildZones(): Zone[] {
  const zones: Zone[] = [];

  const zeroPts = [
    { x: ZERO_LEFT, y: ZERO_TOP },
    { x: ZERO_RIGHT, y: ZERO_TOP },
    { x: ZERO_RIGHT, y: ZERO_BOT },
    { x: ZERO_LEFT, y: ZERO_BOT },
  ];
  const zc = centroid(zeroPts);
  zones.push({ number: 0, points: zeroPts, centerX: zc.x, centerY: zc.y });

  for (let col = 0; col < NUM_COLS; col++) {
    for (let row = 0; row < NUM_ROWS; row++) {
      const num = 3 * col + (NUM_ROWS - row);
      const y1 = GRID_TOP + row * ROW_H;
      const y2 = GRID_TOP + (row + 1) * ROW_H;

      const pts = [
        { x: colX(col, row, "left"), y: y1 },
        { x: colX(col, row, "right"), y: y1 },
        { x: colX(col, row + 1, "right"), y: y2 },
        { x: colX(col, row + 1, "left"), y: y2 },
      ];
      const c = centroid(pts);
      zones.push({ number: num, points: pts, centerX: c.x, centerY: c.y });
    }
  }

  return zones;
}

export const rouletteZones: Zone[] = buildZones();

export default function RouletteField() {
  const [showGrid, setShowGrid] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 gap-4">
      <div
        className="relative w-full"
        style={{ maxWidth: BASE_W, aspectRatio: `${BASE_W}/${BASE_H}` }}
      >
        <img
          src={rouletteImg}
          alt="Рулеточное поле"
          className="block w-full h-full select-none"
          draggable={false}
        />

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${BASE_W} ${BASE_H}`}
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {showGrid &&
            rouletteZones.map((zone) => (
              <g key={zone.number}>
                <polygon
                  points={pStr(zone.points)}
                  fill="rgba(255, 230, 0, 0.18)"
                  stroke="#ffe600"
                  strokeWidth="2.5"
                />
                <text
                  x={zone.centerX}
                  y={zone.centerY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="22"
                  fontWeight="bold"
                  fill="#ffe600"
                  stroke="#000"
                  strokeWidth="0.8"
                  paintOrder="stroke"
                  style={{ fontFamily: "sans-serif", userSelect: "none" }}
                >
                  {zone.number}
                </text>
              </g>
            ))}
        </svg>
      </div>

      <button
        onClick={() => setShowGrid((v) => !v)}
        className="px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-150"
        style={{
          background: showGrid ? "#ffe600" : "#1a1a1a",
          color: showGrid ? "#111" : "#ffe600",
          border: "2px solid #ffe600",
          cursor: "pointer",
          letterSpacing: "0.05em",
        }}
      >
        {showGrid ? "Скрыть сетку" : "Показать сетку"}
      </button>
    </div>
  );
}
