import { useState, useRef } from "react";
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
const CHIP_R = 24;

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
        fontSize="15" fontWeight="bold" fill={text}
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
    } else {
      setCheckResult("wrong");
      playWrongSound();
    }
    setPhase("checked");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleCheck();
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>

      {/* ── Field wrapper ───────────────────────────────────────────────── */}
      <div style={{ position: "relative", width: "100%", maxWidth: W, aspectRatio: `${W} / ${H}` }}>
        <img
          src={rouletteImg}
          alt="Рулеточное поле"
          style={{ display: "block", width: "100%", height: "100%", userSelect: "none",
                   opacity: phase === "spinning" ? 0.5 : 1, transition: "opacity 0.3s" }}
          draggable={false}
        />

        {/* SVG overlay */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
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
            <div style={styles.spinBall}>🎰</div>
            <div style={styles.spinText}>Вращение…</div>
          </div>
        )}
      </div>

      {/* ── Bottom UI ───────────────────────────────────────────────────── */}
      <div style={styles.bottomPanel}>

        {/* Idle: just SPIN */}
        {phase === "idle" && (
          <button style={styles.btnSpin} onClick={handleSpin}>SPIN</button>
        )}

        {/* Spinning: disabled SPIN */}
        {phase === "spinning" && (
          <button style={{ ...styles.btnSpin, opacity: 0.5, cursor: "not-allowed" }} disabled>
            SPIN
          </button>
        )}

        {/* Playing / Checked */}
        {(phase === "playing" || phase === "checked") && round && (
          <>
            {/* Winning number */}
            <div style={styles.winRow}>
              <span style={styles.winLabel}>Выпавший номер:</span>
              <span style={styles.winNumber}>{round.winningNumber}</span>
            </div>

            {/* Bets breakdown */}
            <div style={styles.betsBox}>
              {round.bets.map((bet, i) => (
                <div key={i} style={styles.betRow}>
                  <span style={{ ...styles.betChip, background: chipColor(bet.denomination), color: chipTextColor(bet.denomination) }}>
                    {bet.denomination}
                  </span>
                  <span style={styles.betLabel}>{bet.label}</span>
                  <span style={styles.betCalc}>× {bet.payout} = {bet.denomination * bet.payout}</span>
                </div>
              ))}
            </div>

            {/* Answer input */}
            {phase === "playing" && (
              <div style={styles.inputRow}>
                <span style={styles.inputLabel}>Итого выплата:</span>
                <input
                  ref={inputRef}
                  type="number"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ваш ответ"
                  style={styles.input}
                />
                <button
                  style={styles.btnCheck}
                  onClick={handleCheck}
                  disabled={!userInput.trim()}
                >
                  Проверить
                </button>
              </div>
            )}

            {/* Result */}
            {phase === "checked" && checkResult && (
              <div style={styles.resultRow}>
                <div style={{ ...styles.resultBadge, background: checkResult === "correct" ? "#1a6e1a" : "#7a1a1a" }}>
                  {checkResult === "correct"
                    ? `✅ Верно! Правильный ответ: ${round.correctAnswer}`
                    : `❌ Неверно. Правильный ответ: ${round.correctAnswer}`}
                </div>
                <button style={styles.btnSpin} onClick={handleSpin}>SPIN снова</button>
              </div>
            )}
          </>
        )}

        {/* Grid toggle — always visible */}
        <button
          onClick={() => setShowGrid(v => !v)}
          style={{ ...styles.btnGrid, background: showGrid ? "#ffd700" : "#1a1a1a", color: showGrid ? "#111" : "#ffd700" }}
        >
          {showGrid ? "Скрыть сетку" : "Показать сетку"}
        </button>
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
    justifyContent: "center",
    padding: "12px 16px",
    gap: "14px",
  },
  spinOverlay: {
    position: "absolute", inset: 0,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: "12px",
  },
  spinBall: { fontSize: "52px", animation: "spin 0.6s linear infinite" },
  spinText: { fontSize: "22px", fontWeight: 700, color: "#ffd700", letterSpacing: "0.1em" },
  bottomPanel: {
    width: "100%",
    maxWidth: "900px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  btnSpin: {
    padding: "10px 48px",
    fontSize: "18px",
    fontWeight: 800,
    letterSpacing: "0.15em",
    borderRadius: "8px",
    border: "2px solid #ffd700",
    background: "#ffd700",
    color: "#111",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  winRow: {
    display: "flex", alignItems: "center", gap: "14px",
  },
  winLabel: { fontSize: "18px", color: "#aaa", fontWeight: 500 },
  winNumber: {
    fontSize: "36px", fontWeight: 900, color: "#ffd700",
    background: "#1a1a00", border: "2px solid #ffd700",
    borderRadius: "8px", padding: "2px 20px",
    minWidth: "64px", textAlign: "center",
  },
  betsBox: {
    background: "#181818",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "10px 18px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    width: "100%",
    maxWidth: "520px",
  },
  betRow: {
    display: "flex", alignItems: "center", gap: "10px", fontSize: "15px",
  },
  betChip: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: "26px", height: "26px", borderRadius: "50%",
    fontWeight: 800, fontSize: "13px",
    border: "2px solid #ffd700", flexShrink: 0,
  },
  betLabel: { flex: 1, color: "#e0e0e0" },
  betCalc: { color: "#ffd700", fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  inputRow: {
    display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "center",
  },
  inputLabel: { fontSize: "16px", color: "#bbb", fontWeight: 600 },
  input: {
    padding: "8px 14px", fontSize: "18px", fontWeight: 700,
    borderRadius: "8px", border: "2px solid #ffd700",
    background: "#111", color: "#ffd700",
    width: "130px", outline: "none",
    textAlign: "center",
  },
  btnCheck: {
    padding: "9px 28px", fontSize: "15px", fontWeight: 700,
    borderRadius: "8px", border: "2px solid #ffd700",
    background: "#ffd700", color: "#111", cursor: "pointer",
  },
  resultRow: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
  },
  resultBadge: {
    padding: "10px 28px", borderRadius: "8px",
    fontSize: "17px", fontWeight: 700, color: "#fff",
    border: "1px solid rgba(255,255,255,0.2)",
    letterSpacing: "0.04em",
  },
  btnGrid: {
    padding: "6px 22px", borderRadius: "8px", fontWeight: 600,
    fontSize: "13px", letterSpacing: "0.05em", cursor: "pointer",
    transition: "all 0.15s", border: "2px solid #ffd700",
    marginTop: "4px",
  },
};
