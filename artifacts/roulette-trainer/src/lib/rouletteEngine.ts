// ─── Grid constants (must match RouletteField.tsx) ───────────────────────────
export const ROW_Y = [112, 240, 371, 502] as const;
export const COL_X = [243, 367, 494, 619, 744, 869, 992, 1118, 1242, 1364, 1490, 1612, 1737] as const;

// ─── Number ↔ grid position ──────────────────────────────────────────────────

/** Returns {col: 0..11, row: 0..2} for numbers 1-36.
 *  Row 0 = top (3,6,9..36), row 2 = bottom (1,4,7..34). */
function numInfo(n: number): { col: number; row: number } {
  const col = Math.floor((n - 1) / 3);
  const rem = n % 3;
  const row = rem === 0 ? 0 : rem === 2 ? 1 : 2;
  return { col, row };
}

/** Number from grid position: col 0..11, row 0..2 */
function numAt(col: number, row: number): number {
  return 3 * (col + 1) - row;
}

function colCenterX(col: number): number {
  return (COL_X[col] + COL_X[col + 1]) / 2;
}
function rowCenterY(row: number): number {
  return (ROW_Y[row] + ROW_Y[row + 1]) / 2;
}

// ─── Bet types ────────────────────────────────────────────────────────────────

export type BetType = "straight" | "split" | "street" | "corner" | "sixline";

export interface BetDef {
  type: BetType;
  numbers: number[];
  chipX: number;
  chipY: number;
  payout: number;
  denomination: number;
  label: string;
}

// ─── Bet builders ─────────────────────────────────────────────────────────────

function makeStraight(n: number): BetDef {
  if (n === 0) {
    return {
      type: "straight", numbers: [0], payout: 35, denomination: 1,
      chipX: (126 + 243) / 2, chipY: (112 + 502) / 2,
      label: "Straight Up 0",
    };
  }
  const { col, row } = numInfo(n);
  return {
    type: "straight", numbers: [n], payout: 35, denomination: 1,
    chipX: colCenterX(col), chipY: rowCenterY(row),
    label: `Straight Up ${n}`,
  };
}

function makeSplitH(n1: number, n2: number, colBoundary: number, row: number): BetDef {
  const nums = [n1, n2].sort((a, b) => a - b);
  return {
    type: "split", numbers: nums, payout: 17, denomination: 1,
    chipX: COL_X[colBoundary], chipY: rowCenterY(row),
    label: `Split ${nums.join("-")}`,
  };
}

function makeSplitV(n1: number, n2: number, col: number, rowBoundary: number): BetDef {
  const nums = [n1, n2].sort((a, b) => a - b);
  return {
    type: "split", numbers: nums, payout: 17, denomination: 1,
    chipX: colCenterX(col), chipY: ROW_Y[rowBoundary],
    label: `Split ${nums.join("-")}`,
  };
}

function makeStreet(col: number): BetDef {
  const nums = [numAt(col, 0), numAt(col, 1), numAt(col, 2)].sort((a, b) => a - b);
  return {
    type: "street", numbers: nums, payout: 11, denomination: 1,
    chipX: colCenterX(col), chipY: ROW_Y[0],
    label: `Street ${nums.join("-")}`,
  };
}

function makeCorner(leftCol: number, topRow: number): BetDef {
  const nums = [
    numAt(leftCol, topRow), numAt(leftCol, topRow + 1),
    numAt(leftCol + 1, topRow), numAt(leftCol + 1, topRow + 1),
  ].sort((a, b) => a - b);
  return {
    type: "corner", numbers: nums, payout: 8, denomination: 1,
    chipX: COL_X[leftCol + 1], chipY: ROW_Y[topRow + 1],
    label: `Corner ${nums.join("-")}`,
  };
}

function makeSixLine(leftCol: number): BetDef {
  const nums = [
    numAt(leftCol, 0), numAt(leftCol, 1), numAt(leftCol, 2),
    numAt(leftCol + 1, 0), numAt(leftCol + 1, 1), numAt(leftCol + 1, 2),
  ].sort((a, b) => a - b);
  return {
    type: "sixline", numbers: nums, payout: 5, denomination: 1,
    chipX: COL_X[leftCol + 1], chipY: ROW_Y[0],
    label: `Six-Line ${nums[0]}-${nums[nums.length - 1]}`,
  };
}

// ─── Build pool of all valid bets containing `winningNumber` ─────────────────

function buildPool(winningNumber: number): BetDef[] {
  if (winningNumber === 0) return [makeStraight(0)];

  const { col, row } = numInfo(winningNumber);
  const pool: BetDef[] = [];

  pool.push(makeStraight(winningNumber));

  // Splits – horizontal (same row, adjacent col)
  if (col > 0)  pool.push(makeSplitH(numAt(col - 1, row), winningNumber, col, row));
  if (col < 11) pool.push(makeSplitH(winningNumber, numAt(col + 1, row), col + 1, row));

  // Splits – vertical (same col, adjacent row)
  if (row > 0) pool.push(makeSplitV(numAt(col, row - 1), winningNumber, col, row));
  if (row < 2) pool.push(makeSplitV(winningNumber, numAt(col, row + 1), col, row + 1));

  // Street
  pool.push(makeStreet(col));

  // Corners
  if (col > 0  && row > 0) pool.push(makeCorner(col - 1, row - 1));
  if (col < 11 && row > 0) pool.push(makeCorner(col,     row - 1));
  if (col > 0  && row < 2) pool.push(makeCorner(col - 1, row));
  if (col < 11 && row < 2) pool.push(makeCorner(col,     row));

  // Six-Lines
  if (col > 0)  pool.push(makeSixLine(col - 1));
  if (col < 11) pool.push(makeSixLine(col));

  return pool;
}

// ─── Random helpers ───────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CHIP_DENOMINATIONS = [1, 2, 3, 4] as const;

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GameRound {
  winningNumber: number;
  bets: BetDef[];
  correctAnswer: number;
}

export function generateRound(): GameRound {
  const winningNumber = Math.floor(Math.random() * 37); // 0-36

  const pool = shuffle(buildPool(winningNumber));
  const betCount = Math.min(pool.length, Math.floor(Math.random() * 4) + 1); // 1-4
  const bets: BetDef[] = pool.slice(0, betCount).map(b => ({
    ...b,
    denomination: CHIP_DENOMINATIONS[Math.floor(Math.random() * CHIP_DENOMINATIONS.length)],
  }));

  const correctAnswer = bets.reduce((sum, b) => sum + b.denomination * b.payout, 0);

  return { winningNumber, bets, correctAnswer };
}

export function chipColor(denomination: number): string {
  return ["", "#e8e8e0", "#1a56c4", "#1a8c1a", "#c41a1a"][denomination] ?? "#888";
}

export function chipTextColor(denomination: number): string {
  return denomination === 1 ? "#111" : "#fff";
}
