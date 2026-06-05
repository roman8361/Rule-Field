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

      {/* ── ЗАДАНИЕ panel ───────────────────────────────────────────────── */}
      <div style={styles.zadanieBox}>

        {/* Title */}
        <div style={styles.zadanieTitle}>ЗАДАНИЕ</div>
        <div style={styles.zadanieDivider} />

        {/* Winning number + chip count row */}
        <div style={styles.infoRow}>
          <div style={styles.infoCell}>
            <div style={styles.infoCellLabel}>Выпавший номер</div>
            <div style={styles.infoCellValue}>
              {round ? round.winningNumber : "—"}
            </div>
          </div>
        </div>

        {/* Bets breakdown (показываем только когда есть раунд) */}
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

        {/* SPIN button */}
        <button
          style={{ ...styles.btnSpin, opacity: phase === "spinning" ? 0.5 : 1, cursor: phase === "spinning" ? "not-allowed" : "pointer" }}
          onClick={handleSpin}
          disabled={phase === "spinning"}
        >
          SPIN
        </button>

        {/* Answer block */}
        <div style={styles.answerBlock}>
          <div style={styles.answerLabel}>Ваш ответ</div>
          <div style={styles.answerRow}>
            <input
              ref={inputRef}
              type="number"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Введите сумму"
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

          {/* Result status */}
          {checkResult && (
            <div style={{
              ...styles.resultStatus,
              color: checkResult === "correct" ? "#4caf50" : "#e53935",
            }}>
              {checkResult === "correct"
                ? `✅ Верно! Правильный ответ: ${round?.correctAnswer}`
                : `❌ Неверно. Правильный ответ: ${round?.correctAnswer}`}
            </div>
          )}
        </div>

        {/* Grid toggle */}
        <button
          onClick={() => setShowGrid(v => !v)}
          style={{ ...styles.btnGrid, background: showGrid ? "#d4a832" : "transparent", color: showGrid ? "#111" : "#d4a832" }}
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
    maxWidth: "560px",
    background: "#0d0d0d",
    border: "1px solid #d4a832",
    borderRadius: "6px",
    padding: "20px 24px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
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
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  infoCellLabel: {
    fontSize: "12px",
    color: "#a0a0a0",
    letterSpacing: "0.03em",
  },
  infoCellValue: {
    background: "#161616",
    border: "1px solid #d4a832",
    borderRadius: "6px",
    padding: "10px 0",
    fontSize: "32px",
    fontWeight: 800,
    color: "#d4a832",
    textAlign: "center",
    letterSpacing: "0.04em",
    minHeight: "58px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Bets ─────────────────────────────────────────────────────────────────
  betsBox: {
    background: "#111",
    border: "1px solid #2a2410",
    borderRadius: "6px",
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  betRow: {
    display: "flex", alignItems: "center", gap: "10px", fontSize: "13px",
  },
  betChip: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: "24px", height: "24px", borderRadius: "50%",
    fontWeight: 800, fontSize: "11px",
    border: "1.5px solid #d4a832", flexShrink: 0,
  },
  betLabel: { flex: 1, color: "#ccc" },

  // ── SPIN button ───────────────────────────────────────────────────────────
  btnSpin: {
    width: "100%",
    padding: "13px 0",
    fontSize: "16px",
    fontWeight: 800,
    letterSpacing: "0.2em",
    borderRadius: "6px",
    border: "1px solid #7a1515",
    background: "#7a1515",
    color: "#fff",
    transition: "all 0.15s",
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
    gap: "10px",
  },
  input: {
    flex: 1,
    padding: "10px 14px",
    fontSize: "15px",
    fontWeight: 600,
    borderRadius: "6px",
    border: "1px solid #d4a832",
    background: "#111",
    color: "#e8e8e8",
    outline: "none",
  },
  btnCheck: {
    padding: "10px 18px",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    borderRadius: "6px",
    border: "1px solid #d4a832",
    background: "transparent",
    color: "#d4a832",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  },
  resultStatus: {
    fontSize: "13px",
    letterSpacing: "0.02em",
  },

  // ── Grid toggle ───────────────────────────────────────────────────────────
  btnGrid: {
    alignSelf: "center",
    padding: "5px 18px",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "12px",
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "all 0.15s",
    border: "1px solid #d4a832",
  },
};
