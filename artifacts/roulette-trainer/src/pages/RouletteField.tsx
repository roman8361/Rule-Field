import { useState } from "react";
import rouletteImg from "@/assets/roulette_field.png";

// ─── Image natural size ───────────────────────────────────────────────────────
const W = 1893;
const H = 831;

// ─── Grid measurements (pixel-perfect from gold-line scan) ───────────────────
//
//  Horizontal lines:   y = 112  |  240  |  371  |  502
//  Row 0 (top):    y 112 – 240   →  3, 6, 9, …, 36
//  Row 1 (mid):    y 240 – 371   →  2, 5, 8, …, 35
//  Row 2 (bot):    y 371 – 502   →  1, 4, 7, …, 34
//
//  Vertical col boundaries (left edges of each column):
//  0-cell left : 126
//  Col 1  left : 243    Col 7  left : 992
//  Col 2  left : 367    Col 8  left : 1118
//  Col 3  left : 494    Col 9  left : 1242
//  Col 4  left : 619    Col 10 left : 1364
//  Col 5  left : 744    Col 11 left : 1490
//  Col 6  left : 869    Col 12 left : 1612
//                        Col 12 right: 1737

const ROW_Y = [112, 240, 371, 502] as const;   // top, h1, h2, bottom
const COL_X = [243, 367, 494, 619, 744, 869, 992, 1118, 1242, 1364, 1490, 1612, 1737] as const;

const ZERO_LEFT  = 126;
const ZERO_RIGHT = 243;
const ZERO_TOP   = 112;
const ZERO_BOT   = 502;
const CORNER     = 22;  // corner cut for the rounded top-left of the 0 cell

// ─── Types ───────────────────────────────────────────────────────────────────
interface Pt { x: number; y: number }
interface Zone { number: number; points: Pt[]; cx: number; cy: number }

function cx(pts: Pt[]) { return pts.reduce((s, p) => s + p.x, 0) / pts.length }
function cy(pts: Pt[]) { return pts.reduce((s, p) => s + p.y, 0) / pts.length }
function pts(arr: [number, number][]): Pt[] { return arr.map(([x, y]) => ({ x, y })) }
function pStr(ps: Pt[]) { return ps.map(p => `${p.x},${p.y}`).join(" ") }

// ─── Build all 37 zones ──────────────────────────────────────────────────────
function buildZones(): Zone[] {
  const zones: Zone[] = [];

  // ── Zero cell (6-point polygon: cut top-left corner) ──
  const zp = pts([
    [ZERO_LEFT + CORNER, ZERO_TOP],
    [ZERO_RIGHT,         ZERO_TOP],
    [ZERO_RIGHT,         ZERO_BOT],
    [ZERO_LEFT,          ZERO_BOT],
    [ZERO_LEFT,          ZERO_TOP + CORNER],
  ]);
  zones.push({ number: 0, points: zp, cx: cx(zp), cy: cy(zp) });

  // ── Numbers 1–36 ──
  // col 0-11, row 0-2
  // number = 3*(col+1) - row   (row 0=top, row 2=bottom)
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 3; row++) {
      const num = 3 * (col + 1) - row;
      const x1 = COL_X[col];
      const x2 = COL_X[col + 1];
      const y1 = ROW_Y[row];
      const y2 = ROW_Y[row + 1];
      const p = pts([[x1, y1], [x2, y1], [x2, y2], [x1, y2]]);
      zones.push({ number: num, points: p, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 });
    }
  }

  return zones;
}

export const rouletteZones: Zone[] = buildZones();

// ─── Component ───────────────────────────────────────────────────────────────
export default function RouletteField() {
  const [showGrid, setShowGrid] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        gap: "16px",
      }}
    >
      {/* Image + SVG overlay wrapper */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: W,
          aspectRatio: `${W} / ${H}`,
        }}
      >
        <img
          src={rouletteImg}
          alt="Рулеточное поле"
          style={{ display: "block", width: "100%", height: "100%", userSelect: "none" }}
          draggable={false}
        />

        {/* SVG overlay — same viewBox as image */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {showGrid &&
            rouletteZones.map(zone => (
              <g key={zone.number}>
                <polygon
                  points={pStr(zone.points)}
                  fill="rgba(255, 220, 0, 0.20)"
                  stroke="#ffd700"
                  strokeWidth="2"
                />
                <text
                  x={zone.cx}
                  y={zone.cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={zone.number === 0 ? 28 : 22}
                  fontWeight="bold"
                  fill="#ffd700"
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

      {/* Toggle button */}
      <button
        onClick={() => setShowGrid(v => !v)}
        style={{
          padding: "8px 28px",
          borderRadius: "8px",
          fontWeight: 600,
          fontSize: "14px",
          letterSpacing: "0.05em",
          cursor: "pointer",
          transition: "all 0.15s",
          background: showGrid ? "#ffd700" : "#1a1a1a",
          color: showGrid ? "#111" : "#ffd700",
          border: "2px solid #ffd700",
        }}
      >
        {showGrid ? "Скрыть сетку" : "Показать сетку"}
      </button>
    </div>
  );
}
