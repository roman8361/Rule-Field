import { useState, useRef } from "react";
import { toast } from "sonner";
import rouletteImg from "@/assets/roulette_field.png";
import { generateRound, chipColor, chipTextColor, type BetDef, type GameRound, ROW_Y, COL_X } from "@/lib/rouletteEngine";
import { playSpinSound, playCorrectSound, playWrongSound } from "@/lib/sounds";

// ─── Image dimensions ─────────────────────────────────────────────────────────
const W = 1893;
const H = 831;

const ZERO_LEFT  = 126;
const ZERO_RIGHT = 243;
const ZERO_TOP   = 112;
const ZERO_BOT   = 502;
const CORNER_CUT = 22;

// ─── Zone polygon helpers ─────────────────────────────────────────────────────
interface Pt { x: number; y: number }
function pStr(ps: Pt[]) { return ps.map(p => `${p.x},${p.y}`).join(" ") }

function buildZones() {
  const zones: { number: number; points: Pt[]; cx: number; cy: number }[] = [];

  const zp: Pt[] = [
    { x: ZERO_LEFT + CORNER_CUT, y: ZERO_TOP },
    { x: ZERO_RIGHT,             y: ZERO_TOP },
    { x: ZERO_RIGHT,             y: ZERO_BOT },
    { x: ZERO_LEFT,              y: ZERO_BOT },
    { x: ZERO_LEFT,              y: ZERO_TOP + CORNER_CUT },
  ];
  zones.push({ number: 0, points: zp, cx: (ZERO_LEFT + ZERO_RIGHT) / 2, cy: (ZERO_TOP + ZERO_BOT) / 2 });

  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 3; row++) {
      const num = 3 * (col + 1) - row;
      const x1 = COL_X[col], x2 = COL_X[col + 1];
      const y1 = ROW_Y[row], y2 = ROW_Y[row + 1];
      zones.push({
        number: num,
        points: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }],
        cx: (x1 + x2) / 2, cy: (y1 + y2) / 2,
      });
    }
  }
  return zones;
}

const ZONES = buildZones();

// ─── Chip SVG component ───────────────────────────────────────────────────────
const CHIP_R = 32;

function Chip({ bet }: { bet: BetDef }) {
  const fill = chipColor(bet.denomination);
  const text = chipTextColor(bet.denomination);
  return (
    <g>
      {/* Shadow */}
      <circle cx={bet.chipX + 2} cy={bet.chipY + 2} r={CHIP_R} fill="rgba(0,0,0,0.45)" />
      {/* Body */}
      <circle cx={bet.chipX} cy={bet.chipY} r={CHIP_R} fill={fill} stroke="#ffd700" strokeWidth="2.5" />
      {/* Inner ring */}
      <circle cx={bet.chipX} cy={bet.chipY} r={CHIP_R * 0.72} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
      {/* Denomination */}
      <text
        x={bet.chipX} y={bet.chipY}
        textAnchor="middle" dominantBaseline="central"
        fontSize="26" fontWeight="bold" fill={text}
        style={{ fontFamily: "sans-serif", userSelect: "none" }}
      >
        {bet.denomination}
      </text>
    </g>
  );
}

// ─── Winning number highlight ─────────────────────────────────────────────────
function WinHighlight({ number }: { number: number }) {
  const zone = ZONES.find(z => z.number === number);
  if (!zone) return null;
  return (
    <polygon
      points={pStr(zone.points)}
      fill="rgba(255,215,0,0.35)"
      stroke="#ffd700"
      strokeWidth="3"
    />
  );
}

// ─── Roulette wheel SVG icon ──────────────────────────────────────────────────
function RouletteWheelIcon({ size = 48, spinning = false }: { size?: number; spinning?: boolean }) {
  const pockets = 37;
  const r = 46;
  const innerR = 28;
  const segments: React.ReactNode[] = [];
  for (let i = 0; i < pockets; i++) {
    const a1 = (i / pockets) * 2 * Math.PI - Math.PI / 2;
    const a2 = ((i + 1) / pockets) * 2 * Math.PI - Math.PI / 2;
    const x1 = 50 + r * Math.cos(a1), y1 = 50 + r * Math.sin(a1);
    const x2 = 50 + r * Math.cos(a2), y2 = 50 + r * Math.sin(a2);
    const xi1 = 50 + innerR * Math.cos(a1), yi1 = 50 + innerR * Math.sin(a1);
    const xi2 = 50 + innerR * Math.cos(a2), yi2 = 50 + innerR * Math.sin(a2);
    const RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    const num = i === 0 ? 0 : i;
    const fill = num === 0 ? "#1a6b1a" : RED.includes(num) ? "#8b1a1a" : "#1a1a1a";
    segments.push(
      <path key={i}
        d={`M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 0 0 ${xi1} ${yi1} Z`}
        fill={fill} stroke="#d4a832" strokeWidth="0.6"
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100"
      style={spinning ? { animation: "spin 0.6s linear infinite" } : undefined}>
      <circle cx="50" cy="50" r="49" fill="#111" stroke="#d4a832" strokeWidth="1.5" />
      {segments}
      <circle cx="50" cy="50" r={innerR - 2} fill="#0d0d0d" stroke="#d4a832" strokeWidth="1" />
      <circle cx="50" cy="50" r="8" fill="#d4a832" />
      <circle cx="50" cy="50" r="4" fill="#111" />
    </svg>
  );
}

// ─── Game state type ──────────────────────────────────────────────────────────
type Phase = "idle" | "spinning" | "playing" | "checked";

// ─── Main component ───────────────────────────────────────────────────────────
export default function RouletteField() {
  const [showGrid, setShowGrid]     = useState(false);
  const [phase, setPhase]           = useState<Phase>("idle");
  const [round, setRound]           = useState<GameRound | null>(null);
  const [userInput, setUserInput]   = useState("");
  const [checkResult, setCheckResult] = useState<"correct" | "wrong" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Spin ──────────────────────────────────────────────────────────────────
  async function handleSpin() {
    setPhase("spinning");
    setRound(null);
    setUserInput("");
    setCheckResult(null);

    await playSpinSound();

    const newRound = generateRound();
    setRound(newRound);
    setPhase("playing");

    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // ── Check answer ─────────────────────────────────────────────────────────
  function handleCheck() {
    if (!round) return;
    const val = parseInt(userInput.trim(), 10);
    if (isNaN(val)) return;
    if (val === round.correctAnswer) {
      setCheckResult("correct");
      playCorrectSound();
      setPhase("checked");
      toast.success(`✅ Верно! Правильный ответ: ${round.correctAnswer}`);
    } else {
      setCheckResult("wrong");
      playWrongSound();
      toast.error("❌ Неверно. Попробуй ещё раз.");
      setUserInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleCheck();
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>

      {/* ── Field wrapper ───────────────────────────────────────────────── */}
      {/* CROP_BOT: clip bottom green strip (~70px out of 831px) */}
      <div style={{ position: "relative", width: "100%", maxWidth: W, aspectRatio: `${W} / ${H - 70}`, overflow: "hidden" }}>
        <img
          src={rouletteImg}
          alt="Рулеточное поле"
          style={{ display: "block", width: "100%", height: "auto", userSelect: "none",
                   opacity: phase === "spinning" ? 0.5 : 1, transition: "opacity 0.3s" }}
          draggable={false}
        />

        {/* SVG overlay */}
        <svg
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "auto", pointerEvents: "none" }}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
        >
          {/* Debug grid */}
          {showGrid && ZONES.map(zone => (
            <g key={zone.number}>
              <polygon points={pStr(zone.points)} fill="rgba(255,220,0,0.18)" stroke="#ffd700" strokeWidth="2" />
              <text x={zone.cx} y={zone.cy} textAnchor="middle" dominantBaseline="central"
                fontSize={zone.number === 0 ? 28 : 20} fontWeight="bold"
                fill="#ffd700" stroke="#000" strokeWidth="0.8" paintOrder="stroke"
                style={{ fontFamily: "sans-serif", userSelect: "none" }}>
                {zone.number}
              </text>
            </g>
          ))}

          {/* Winning number highlight */}
          {round && (phase === "playing" || phase === "checked") && (
            <WinHighlight number={round.winningNumber} />
          )}

          {/* Chips */}
          {round && (phase === "playing" || phase === "checked") &&
            round.bets.map((bet, i) => <Chip key={i} bet={bet} />)
          }
        </svg>

        {/* Spinning overlay */}
        {phase === "spinning" && (
          <div style={styles.spinOverlay}>
            <RouletteWheelIcon size={80} spinning />
            <div style={styles.spinText}>Вращение…</div>
          </div>
        )}
      </div>

      {/* ── ЗАДАНИЕ panel ───────────────────────────────────────────────── */}
      <div style={styles.zadanieBox}>

        {/* ── Left: info ── */}
        <div style={styles.infoGroup}>
          <div style={styles.infoCell}>
            <div style={styles.infoCellLabel}>Выпавший номер</div>
            <div style={styles.infoCellValue}>
              {round ? round.winningNumber : "—"}
            </div>
          </div>

          {round && (phase === "playing" || phase === "checked") && (
            <div style={styles.betsBox}>
              {round.bets.map((bet, i) => (
                <div key={i} style={styles.betRow}>
                  <span style={{ ...styles.betChip, background: chipColor(bet.denomination), color: chipTextColor(bet.denomination) }}>
                    {bet.denomination}
                  </span>
                  <span style={styles.betLabel}>{bet.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* ── Right: controls ── */}
        <div style={styles.controlGroup}>
          <button
            style={{ ...styles.btnSpin, opacity: phase === "spinning" ? 0.5 : 1, cursor: phase === "spinning" ? "not-allowed" : "pointer" }}
            onClick={handleSpin}
            disabled={phase === "spinning"}
          >
            SPIN
          </button>

          <div style={styles.answerRow}>
            <input
              ref={inputRef}
              type="number"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Сумма"
              style={styles.input}
              disabled={phase !== "playing"}
            />
            <button
              style={{ ...styles.btnCheck, opacity: phase !== "playing" || !userInput.trim() ? 0.5 : 1, cursor: phase !== "playing" || !userInput.trim() ? "not-allowed" : "pointer" }}
              onClick={handleCheck}
              disabled={phase !== "playing" || !userInput.trim()}
            >
              ПРОВЕРИТЬ
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0d0d0d",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "16px 16px 24px",
    gap: "16px",
  },
  spinOverlay: {
    position: "absolute", inset: 0,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: "12px",
  },
  spinBall: { fontSize: "52px" },
  spinText: { fontSize: "22px", fontWeight: 700, color: "#d4a832", letterSpacing: "0.1em" },

  // ── ЗАДАНИЕ box ──────────────────────────────────────────────────────────
  zadanieBox: {
    width: "100%",
    maxWidth: "960px",
    background: "#0d0d0d",
    border: "1px solid #d4a832",
    borderRadius: "8px",
    padding: "10px 20px",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "16px",
    flexWrap: "nowrap",
  },
  infoGroup: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "12px",
    flexShrink: 0,
  },
  divider: {
    width: "1px",
    alignSelf: "stretch",
    background: "#d4a832",
    opacity: 0.3,
    flexShrink: 0,
  },
  controlGroup: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "12px",
    flex: 1,
    minWidth: 0,
  },
  zadanieTitle: {
    fontFamily: "'Times New Roman', Georgia, serif",
    fontSize: "22px",
    fontWeight: 700,
    letterSpacing: "0.22em",
    color: "#d4a832",
    textAlign: "center",
  },
  zadanieDivider: {
    height: "1px",
    background: "#d4a832",
    opacity: 0.4,
    marginTop: "-6px",
  },
  infoRow: {
    display: "flex",
    gap: "16px",
  },
  infoCell: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flexShrink: 0,
  },
  infoCellLabel: {
    fontSize: "10px",
    color: "#a0a0a0",
    letterSpacing: "0.03em",
    whiteSpace: "nowrap",
  },
  infoCellValue: {
    background: "#161616",
    border: "1px solid #d4a832",
    borderRadius: "6px",
    padding: "4px 14px",
    fontSize: "22px",
    fontWeight: 800,
    color: "#d4a832",
    textAlign: "center",
    letterSpacing: "0.04em",
    minWidth: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Bets ─────────────────────────────────────────────────────────────────
  betsBox: {
    background: "#111",
    border: "1px solid #2a2410",
    borderRadius: "6px",
    padding: "3px 8px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "220px",
  },
  betRow: {
    display: "flex", alignItems: "center", gap: "6px", fontSize: "10px",
  },
  betChip: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: "16px", height: "16px", borderRadius: "50%",
    fontWeight: 800, fontSize: "9px",
    border: "1px solid #d4a832", flexShrink: 0,
  },
  betLabel: { flex: 1, color: "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  // ── SPIN button ───────────────────────────────────────────────────────────
  btnSpin: {
    flexShrink: 0,
    padding: "12px 28px",
    fontSize: "16px",
    fontWeight: 900,
    letterSpacing: "0.2em",
    borderRadius: "6px",
    border: "1px solid #b8902a",
    background: "#d4a832",
    color: "#111",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  },

  // ── Answer block ──────────────────────────────────────────────────────────
  answerBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  answerLabel: {
    fontSize: "13px",
    color: "#a0a0a0",
  },
  answerRow: {
    display: "flex",
    gap: "6px",
    flex: 1,
    minWidth: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    maxWidth: "120px",
    padding: "4px 8px",
    fontSize: "13px",
    fontWeight: 600,
    borderRadius: "6px",
    border: "1px solid #d4a832",
    background: "#111",
    color: "#e8e8e8",
    outline: "none",
  },
  btnCheck: {
    flexShrink: 0,
    padding: "12px 28px",
    fontSize: "16px",
    fontWeight: 900,
    letterSpacing: "0.2em",
    borderRadius: "6px",
    border: "1px solid #b8902a",
    background: "#d4a832",
    color: "#111",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  },
  resultStatus: {
    fontSize: "12px",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  // ── Grid toggle ───────────────────────────────────────────────────────────
  btnGrid: {
    alignSelf: "center",
    padding: "3px 10px",
    borderRadius: "4px",
    fontWeight: 600,
    fontSize: "10px",
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "all 0.15s",
    border: "1px solid #d4a832",
  },
};
