/* =============================================================================
 * SUDOKU ENGINE — CORE UTILITIES
 * ========================================================================== */

const DEBUG = false;
function log(...args) {
  if (DEBUG) console.log('[engine]', ...args);
}

const GRID = { size: 9, boxH: 3, boxW: 3 };

function setGridConfig(size, boxH, boxW) {
  GRID.size = size;
  GRID.boxH = boxH;
  GRID.boxW = boxW;
}

function allMask() {
  return (1 << GRID.size) - 1;
}

function boxCount() {
  return (GRID.size / GRID.boxH) * (GRID.size / GRID.boxW);
}

function digitToMask(d) {
  return 1 << (d - 1);
}

function maskToDigits(mask) {
  const digits = [];
  for (let d = 1; d <= GRID.size; d++) {
    if (mask & digitToMask(d)) digits.push(d);
  }
  return digits;
}

function countCandidates(mask) {
  let count = 0;
  let m = mask;
  while (m) {
    m &= m - 1;
    count++;
  }
  return count;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function boxIndexOf(r, c) {
  const boxesPerRow = GRID.size / GRID.boxW;
  return Math.floor(r / GRID.boxH) * boxesPerRow + Math.floor(c / GRID.boxW);
}

function boxStartRow(box) {
  const boxesPerRow = GRID.size / GRID.boxW;
  return Math.floor(box / boxesPerRow) * GRID.boxH;
}

function boxStartCol(box) {
  const boxesPerRow = GRID.size / GRID.boxW;
  return (box % boxesPerRow) * GRID.boxW;
}

function seesEachOther(c1, c2) {
  const [r1, col1] = c1;
  const [r2, col2] = c2;
  if (r1 === r2 && col1 === col2) return false;
  if (r1 === r2) return true;
  if (col1 === col2) return true;
  if (boxIndexOf(r1, col1) === boxIndexOf(r2, col2)) return true;
  return false;
}

function getHouseCells(type, index) {
  const cells = [];
  if (type === "row") {
    for (let c = 0; c < GRID.size; c++) cells.push([index, c]);
  } else if (type === "col") {
    for (let r = 0; r < GRID.size; r++) cells.push([r, index]);
  } else if (type === "box") {
    const boxesPerRow = GRID.size / GRID.boxW;
    const startR = Math.floor(index / boxesPerRow) * GRID.boxH;
    const startC = (index % boxesPerRow) * GRID.boxW;
    for (let dr = 0; dr < GRID.boxH; dr++) {
      for (let dc = 0; dc < GRID.boxW; dc++) {
        cells.push([startR + dr, startC + dc]);
      }
    }
  } else {
    throw new Error(`Unknown house type: ${type}`);
  }
  return cells;
}

function getPeers(r, c) {
  const seen = new Set();
  const peers = [];
  const addAll = (cells) => {
    for (const [pr, pc] of cells) {
      if (pr === r && pc === c) continue;
      const key = pr * GRID.size + pc;
      if (!seen.has(key)) {
        seen.add(key);
        peers.push([pr, pc]);
      }
    }
  };
  addAll(getHouseCells("row", r));
  addAll(getHouseCells("col", c));
  addAll(getHouseCells("box", boxIndexOf(r, c)));
  return peers;
}

function getCombinations(arr, k) {
  const results = [];
  const combo = [];
  function backtrack(start) {
    if (combo.length === k) {
      results.push(combo.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      backtrack(i + 1);
      combo.pop();
    }
  }
  backtrack(0);
  return results;
}

/* =============================================================================
 * SUDOKU GRID — BOARD & STATE
 * ========================================================================== */

class SudokuGrid {
  constructor(values) {
    this.values = values
      ? values.map((row) => row.slice())
      : Array.from({ length: GRID.size }, () => Array(GRID.size).fill(0));
    this.candidates = Array.from({ length: GRID.size }, () => Array(GRID.size).fill(0));
    this.initCandidates();
  }

  initCandidates() {
    for (let r = 0; r < GRID.size; r++) {
      for (let c = 0; c < GRID.size; c++) {
        this.candidates[r][c] = this.values[r][c] === 0 ? allMask() : 0;
      }
    }
    for (let r = 0; r < GRID.size; r++) {
      for (let c = 0; c < GRID.size; c++) {
        if (this.values[r][c] !== 0) {
          this.propagateValueRemoval(r, c, this.values[r][c]);
        }
      }
    }
  }

  propagateValueRemoval(r, c, d) {
    const mask = digitToMask(d);
    for (const [pr, pc] of getPeers(r, c)) {
      if (this.values[pr][pc] === 0) {
        this.candidates[pr][pc] &= ~mask;
      }
    }
  }

  clone() {
    const g = Object.create(SudokuGrid.prototype);
    g.values = this.values.map((row) => row.slice());
    g.candidates = this.candidates.map((row) => row.slice());
    return g;
  }

  setValue(r, c, d) {
    this.values[r][c] = d;
    this.candidates[r][c] = 0;
    this.propagateValueRemoval(r, c, d);
  }

  eliminateCandidate(r, c, mask) {
    const before = this.candidates[r][c];
    const after = before & ~mask;
    if (after !== before) {
      this.candidates[r][c] = after;
      return true;
    }
    return false;
  }

  isSolved() {
    for (let r = 0; r < GRID.size; r++) {
      for (let c = 0; c < GRID.size; c++) {
        if (this.values[r][c] === 0) return false;
      }
    }
    return true;
  }

  hasContradiction() {
    for (let r = 0; r < GRID.size; r++) {
      for (let c = 0; c < GRID.size; c++) {
        if (this.values[r][c] === 0 && this.candidates[r][c] === 0) return true;
      }
    }
    return false;
  }

  toFlatString() {
    return this.values.map((row) => row.join("")).join("");
  }

  static fromFlatString(str) {
    const values = [];
    for (let r = 0; r < GRID.size; r++) {
      const row = [];
      for (let c = 0; c < GRID.size; c++) {
        const ch = str[r * GRID.size + c];
        row.push(ch === "." || ch === "0" ? 0 : parseInt(ch, 10));
      }
      values.push(row);
    }
    return new SudokuGrid(values);
  }
}

/* =============================================================================
 * UNIQUENESS VALIDATOR — countSolutions
 * ========================================================================== */

function countSolutions(values, limit = 2) {
  const grid = values.map((row) => row.slice());
  const n = GRID.size;
  const bh = GRID.boxH;
  const bw = GRID.boxW;

  function isPlacementLegal(r, c, d) {
    for (let i = 0; i < n; i++) {
      if (grid[r][i] === d) return false;
      if (grid[i][c] === d) return false;
    }
    const boxR = Math.floor(r / bh) * bh;
    const boxC = Math.floor(c / bw) * bw;
    for (let dr = 0; dr < bh; dr++) {
      for (let dc = 0; dc < bw; dc++) {
        if (grid[boxR + dr][boxC + dc] === d) return false;
      }
    }
    return true;
  }

  function findMostConstrainedCell() {
    let best = null;
    let bestCandidates = null;
    let bestCount = n + 1;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (grid[r][c] !== 0) continue;
        const candidates = [];
        for (let d = 1; d <= n; d++) {
          if (isPlacementLegal(r, c, d)) candidates.push(d);
        }
        if (candidates.length < bestCount) {
          best = [r, c];
          bestCandidates = candidates;
          bestCount = candidates.length;
          if (bestCount === 0)
            return { cell: best, candidates: bestCandidates };
        }
      }
    }
    return best === null ? null : { cell: best, candidates: bestCandidates };
  }

  let solutionCount = 0;

  function search() {
    if (solutionCount >= limit) return;
    const next = findMostConstrainedCell();
    if (next === null) {
      solutionCount++;
      return;
    }
    const { cell, candidates } = next;
    if (candidates.length === 0) return;
    const [r, c] = cell;
    for (const d of candidates) {
      grid[r][c] = d;
      search();
      grid[r][c] = 0;
      if (solutionCount >= limit) return;
    }
  }

  search();
  return solutionCount;
}

/* =============================================================================
 * TIER 1 — NAKED SINGLES, HIDDEN SINGLES
 * ========================================================================== */

function techNakedSingles(grid) {
  let changed = false;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid.values[r][c] !== 0) continue;
      const mask = grid.candidates[r][c];
      if (countCandidates(mask) === 1) {
        const d = maskToDigits(mask)[0];
        grid.setValue(r, c, d);
        changed = true;
      }
    }
  }
  return changed;
}

function techHiddenSingles(grid) {
  let changed = false;
  const houseTypes = ["row", "col", "box"];
  for (const type of houseTypes) {
    for (let index = 0; index < 9; index++) {
      const cells = getHouseCells(type, index);
      for (let d = 1; d <= 9; d++) {
        const mask = digitToMask(d);
        let candidateCells = [];
        for (const [r, c] of cells) {
          if (grid.values[r][c] === 0 && grid.candidates[r][c] & mask) {
            candidateCells.push([r, c]);
          }
        }
        if (candidateCells.length === 1) {
          const [r, c] = candidateCells[0];
          grid.setValue(r, c, d);
          changed = true;
        }
      }
    }
  }
  return changed;
}

/* =============================================================================
 * TIER 2 — INTERSECTIONS & SUBSETS
 * ========================================================================== */

function techPointingPairs(grid) {
  let changed = false;
  for (let box = 0; box < 9; box++) {
    const cells = getHouseCells("box", box);
    for (let d = 1; d <= 9; d++) {
      const mask = digitToMask(d);
      const hits = cells.filter(
        ([r, c]) => grid.values[r][c] === 0 && grid.candidates[r][c] & mask,
      );
      if (hits.length < 2) continue;

      const rows = new Set(hits.map(([r]) => r));
      const cols = new Set(hits.map(([, c]) => c));

      if (rows.size === 1) {
        const row = [...rows][0];
        for (const [r, c] of getHouseCells("row", row)) {
          if (boxIndexOf(r, c) === box) continue;
          if (grid.values[r][c] === 0 && grid.eliminateCandidate(r, c, mask))
            changed = true;
        }
      } else if (cols.size === 1) {
        const col = [...cols][0];
        for (const [r, c] of getHouseCells("col", col)) {
          if (boxIndexOf(r, c) === box) continue;
          if (grid.values[r][c] === 0 && grid.eliminateCandidate(r, c, mask))
            changed = true;
        }
      }
    }
  }
  return changed;
}

function techClaimingPairs(grid) {
  let changed = false;
  for (const type of ["row", "col"]) {
    for (let index = 0; index < 9; index++) {
      const cells = getHouseCells(type, index);
      for (let d = 1; d <= 9; d++) {
        const mask = digitToMask(d);
        const hits = cells.filter(
          ([r, c]) => grid.values[r][c] === 0 && grid.candidates[r][c] & mask,
        );
        if (hits.length < 2) continue;

        const boxes = new Set(hits.map(([r, c]) => boxIndexOf(r, c)));
        if (boxes.size === 1) {
          const box = [...boxes][0];
          for (const [r, c] of getHouseCells("box", box)) {
            const inLine = type === "row" ? r === index : c === index;
            if (inLine) continue;
            if (grid.values[r][c] === 0 && grid.eliminateCandidate(r, c, mask))
              changed = true;
          }
        }
      }
    }
  }
  return changed;
}

function techNakedSubset(grid, size) {
  let changed = false;
  const houseTypes = ["row", "col", "box"];
  for (const type of houseTypes) {
    for (let index = 0; index < 9; index++) {
      const cells = getHouseCells(type, index).filter(([r, c]) => {
        if (grid.values[r][c] !== 0) return false;
        const count = countCandidates(grid.candidates[r][c]);
        return count >= 2 && count <= size;
      });
      if (cells.length < size) continue;

      for (const combo of getCombinations(cells, size)) {
        let unionMask = 0;
        for (const [r, c] of combo) unionMask |= grid.candidates[r][c];
        if (countCandidates(unionMask) !== size) continue;

        const comboSet = new Set(combo.map(([r, c]) => r * 9 + c));
        for (const [r, c] of getHouseCells(type, index)) {
          if (comboSet.has(r * 9 + c)) continue;
          if (
            grid.values[r][c] === 0 &&
            grid.eliminateCandidate(r, c, unionMask)
          )
            changed = true;
        }
      }
    }
  }
  return changed;
}

const techNakedPairs = (grid) => techNakedSubset(grid, 2);
const techNakedTriples = (grid) => techNakedSubset(grid, 3);
const techNakedQuads = (grid) => techNakedSubset(grid, 4);

function techHiddenSubset(grid, size) {
  let changed = false;
  const houseTypes = ["row", "col", "box"];
  for (const type of houseTypes) {
    for (let index = 0; index < 9; index++) {
      const cells = getHouseCells(type, index).filter(
        ([r, c]) => grid.values[r][c] === 0,
      );
      if (cells.length < size) continue;

      const digitCells = {};
      for (let d = 1; d <= 9; d++) {
        const mask = digitToMask(d);
        const hits = cells.filter(([r, c]) => grid.candidates[r][c] & mask);
        if (hits.length >= 1 && hits.length <= size) digitCells[d] = hits;
      }
      const candidateDigits = Object.keys(digitCells).map(Number);
      if (candidateDigits.length < size) continue;

      for (const digitCombo of getCombinations(candidateDigits, size)) {
        const unionCellKeys = new Set();
        for (const d of digitCombo) {
          for (const [r, c] of digitCells[d]) unionCellKeys.add(r * 9 + c);
        }
        if (unionCellKeys.size !== size) continue;

        let digitMask = 0;
        for (const d of digitCombo) digitMask |= digitToMask(d);

        for (const key of unionCellKeys) {
          const r = Math.floor(key / 9);
          const c = key % 9;
          const eliminationMask = grid.candidates[r][c] & ~digitMask;
          if (eliminationMask && grid.eliminateCandidate(r, c, eliminationMask))
            changed = true;
        }
      }
    }
  }
  return changed;
}

const techHiddenPairs = (grid) => techHiddenSubset(grid, 2);
const techHiddenTriples = (grid) => techHiddenSubset(grid, 3);
const techHiddenQuads = (grid) => techHiddenSubset(grid, 4);

/* =============================================================================
 * TIER 3 — FISH PATTERNS (X-WING / SWORDFISH)
 * ========================================================================== */

function techFish(grid, size) {
  let changed = false;

  function fishPass(baseType, coverType) {
    let localChanged = false;
    for (let d = 1; d <= 9; d++) {
      const mask = digitToMask(d);

      const lineCoverPositions = [];
      for (let base = 0; base < 9; base++) {
        const cells = getHouseCells(baseType, base).filter(
          ([r, c]) => grid.values[r][c] === 0 && grid.candidates[r][c] & mask,
        );
        if (cells.length >= 1 && cells.length <= size) {
          const coverIndices = cells.map(([r, c]) =>
            baseType === "row" ? c : r,
          );
          lineCoverPositions.push({ base, covers: coverIndices });
        }
      }
      if (lineCoverPositions.length < size) continue;

      for (const combo of getCombinations(lineCoverPositions, size)) {
        const coverUnion = new Set();
        for (const entry of combo)
          entry.covers.forEach((x) => coverUnion.add(x));
        if (coverUnion.size !== size) continue;

        const baseLines = new Set(combo.map((entry) => entry.base));

        for (const coverIndex of coverUnion) {
          for (const [r, c] of getHouseCells(coverType, coverIndex)) {
            const baseIndex = baseType === "row" ? r : c;
            if (baseLines.has(baseIndex)) continue;
            if (
              grid.values[r][c] === 0 &&
              grid.eliminateCandidate(r, c, mask)
            ) {
              localChanged = true;
            }
          }
        }
      }
    }
    return localChanged;
  }

  if (fishPass("row", "col")) changed = true;
  if (fishPass("col", "row")) changed = true;
  return changed;
}

const techXWing = (grid) => techFish(grid, 2);
const techSwordfish = (grid) => techFish(grid, 3);

/* =============================================================================
 * TIER 3 — Y-WING / XYZ-WING
 * ========================================================================== */

function techYWing(grid) {
  let changed = false;
  const bivalueCells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (
        grid.values[r][c] === 0 &&
        countCandidates(grid.candidates[r][c]) === 2
      ) {
        bivalueCells.push([r, c]);
      }
    }
  }

  for (const pivot of bivalueCells) {
    const [pr, pc] = pivot;
    const pivotDigits = maskToDigits(grid.candidates[pr][pc]);
    const [a, b] = pivotDigits;

    const pincerCandidates = bivalueCells.filter(([r, c]) =>
      seesEachOther([pr, pc], [r, c]),
    );

    for (const combo of getCombinations(pincerCandidates, 2)) {
      const [p1, p2] = combo;
      const d1 = maskToDigits(grid.candidates[p1[0]][p1[1]]);
      const d2 = maskToDigits(grid.candidates[p2[0]][p2[1]]);

      const isValidPincerPair = (digitsX, digitsY, anchorX, anchorY) => {
        if (!digitsX.includes(anchorX)) return null;
        if (!digitsY.includes(anchorY)) return null;
        const cCandidatesX = digitsX.filter((x) => x !== anchorX);
        const cCandidatesY = digitsY.filter((x) => x !== anchorY);
        if (cCandidatesX.length !== 1 || cCandidatesY.length !== 1) return null;
        if (cCandidatesX[0] !== cCandidatesY[0]) return null;
        const c = cCandidatesX[0];
        if (c === a || c === b) return null;
        return c;
      };

      let sharedDigit = isValidPincerPair(d1, d2, a, b);
      if (sharedDigit === null) sharedDigit = isValidPincerPair(d1, d2, b, a);
      if (sharedDigit === null) continue;

      const mask = digitToMask(sharedDigit);
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (grid.values[r][c] !== 0) continue;
          if (
            (r === pr && c === pc) ||
            (r === p1[0] && c === p1[1]) ||
            (r === p2[0] && c === p2[1])
          )
            continue;
          if (seesEachOther([r, c], p1) && seesEachOther([r, c], p2)) {
            if (grid.eliminateCandidate(r, c, mask)) changed = true;
          }
        }
      }
    }
  }
  return changed;
}

function techXYZWing(grid) {
  let changed = false;
  const triCells = [];
  const biCells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid.values[r][c] !== 0) continue;
      const count = countCandidates(grid.candidates[r][c]);
      if (count === 3) triCells.push([r, c]);
      if (count === 2) biCells.push([r, c]);
    }
  }

  for (const pivot of triCells) {
    const [pr, pc] = pivot;
    const pivotDigits = maskToDigits(grid.candidates[pr][pc]);

    const neighbors = biCells.filter(([r, c]) =>
      seesEachOther([pr, pc], [r, c]),
    );
    for (const combo of getCombinations(neighbors, 2)) {
      const [p1, p2] = combo;
      const d1 = maskToDigits(grid.candidates[p1[0]][p1[1]]);
      const d2 = maskToDigits(grid.candidates[p2[0]][p2[1]]);

      const isSubset = (small, big) => small.every((x) => big.includes(x));
      if (!isSubset(d1, pivotDigits) || !isSubset(d2, pivotDigits)) continue;
      if (d1[0] === d2[0] && d1[1] === d2[1]) continue;

      const shared = d1.filter((x) => d2.includes(x));
      if (shared.length !== 1) continue;
      const z = shared[0];

      const mask = digitToMask(z);
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (grid.values[r][c] !== 0) continue;
          if (
            (r === pr && c === pc) ||
            (r === p1[0] && c === p1[1]) ||
            (r === p2[0] && c === p2[1])
          )
            continue;
          if (
            seesEachOther([r, c], pivot) &&
            seesEachOther([r, c], p1) &&
            seesEachOther([r, c], p2)
          ) {
            if (grid.eliminateCandidate(r, c, mask)) changed = true;
          }
        }
      }
    }
  }
  return changed;
}

/* =============================================================================
 * TIER 3 — SIMPLE COLORING (single-digit chains)
 * ========================================================================== */

function techSimpleColoring(grid) {
  let changed = false;

  for (let d = 1; d <= 9; d++) {
    const mask = digitToMask(d);

    const adjacency = new Map();
    const addEdge = (a, b) => {
      const ka = `${a[0]},${a[1]}`;
      const kb = `${b[0]},${b[1]}`;
      if (!adjacency.has(ka)) adjacency.set(ka, new Set());
      if (!adjacency.has(kb)) adjacency.set(kb, new Set());
      adjacency.get(ka).add(kb);
      adjacency.get(kb).add(ka);
    };

    for (const type of ["row", "col", "box"]) {
      for (let index = 0; index < 9; index++) {
        const cells = getHouseCells(type, index).filter(
          ([r, c]) => grid.values[r][c] === 0 && grid.candidates[r][c] & mask,
        );
        if (cells.length === 2) addEdge(cells[0], cells[1]);
      }
    }

    if (adjacency.size === 0) continue;

    const color = new Map();
    const visited = new Set();
    const components = [];

    for (const startKey of adjacency.keys()) {
      if (visited.has(startKey)) continue;
      const queue = [startKey];
      visited.add(startKey);
      color.set(startKey, 0);
      const componentKeys = [startKey];
      while (queue.length) {
        const cur = queue.shift();
        const curColor = color.get(cur);
        for (const next of adjacency.get(cur)) {
          if (!visited.has(next)) {
            visited.add(next);
            color.set(next, 1 - curColor);
            componentKeys.push(next);
            queue.push(next);
          }
        }
      }
      components.push(componentKeys);
    }

    const keyToCell = (key) => key.split(",").map(Number);

    for (const componentKeys of components) {
      if (componentKeys.length < 4) continue;

      for (let colorValue = 0; colorValue <= 1; colorValue++) {
        const cellsOfColor = componentKeys
          .filter((k) => color.get(k) === colorValue)
          .map(keyToCell);
        let contradiction = false;
        outer: for (let i = 0; i < cellsOfColor.length; i++) {
          for (let j = i + 1; j < cellsOfColor.length; j++) {
            if (seesEachOther(cellsOfColor[i], cellsOfColor[j])) {
              contradiction = true;
              break outer;
            }
          }
        }
        if (contradiction) {
          for (const [r, c] of cellsOfColor) {
            if (grid.eliminateCandidate(r, c, mask)) changed = true;
          }
        }
      }

      const color0Cells = componentKeys
        .filter((k) => color.get(k) === 0)
        .map(keyToCell);
      const color1Cells = componentKeys
        .filter((k) => color.get(k) === 1)
        .map(keyToCell);
      const componentSet = new Set(componentKeys);

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (grid.values[r][c] !== 0) continue;
          if (!(grid.candidates[r][c] & mask)) continue;
          if (componentSet.has(`${r},${c}`)) continue;

          const seesColor0 = color0Cells.some((cell) =>
            seesEachOther([r, c], cell),
          );
          const seesColor1 = color1Cells.some((cell) =>
            seesEachOther([r, c], cell),
          );
          if (seesColor0 && seesColor1) {
            if (grid.eliminateCandidate(r, c, mask)) changed = true;
          }
        }
      }
    }
  }

  return changed;
}

/* =============================================================================
 * TIER 3 — UNIQUE RECTANGLE TYPE 1
 * ========================================================================== */

function techUniqueRectangleType1(grid) {
  let changed = false;

  for (let r1 = 0; r1 < 9; r1++) {
    for (let r2 = r1 + 1; r2 < 9; r2++) {
      for (let c1 = 0; c1 < 9; c1++) {
        for (let c2 = c1 + 1; c2 < 9; c2++) {
          const box1 = boxIndexOf(r1, c1);
          const box2 = boxIndexOf(r1, c2);
          const box3 = boxIndexOf(r2, c1);
          const box4 = boxIndexOf(r2, c2);
          const boxSet = new Set([box1, box2, box3, box4]);
          if (boxSet.size !== 2) continue;

          const corners = [
            [r1, c1],
            [r1, c2],
            [r2, c1],
            [r2, c2],
          ];
          if (corners.some(([r, c]) => grid.values[r][c] !== 0)) continue;

          const masks = corners.map(([r, c]) => grid.candidates[r][c]);
          const pairMask = masks.find((m) => countCandidates(m) === 2);
          if (!pairMask || countCandidates(pairMask) !== 2) continue;

          const sameCount = masks.filter((m) => m === pairMask).length;
          if (sameCount !== 3) continue;

          const oddIndex = masks.findIndex((m) => m !== pairMask);
          if (oddIndex === -1) continue;
          const [orA, orB] = maskToDigits(pairMask);
          const oddMask = masks[oddIndex];
          if ((oddMask & pairMask) !== pairMask) continue;
          if (countCandidates(oddMask) <= 2) continue;

          const [er, ec] = corners[oddIndex];
          if (grid.eliminateCandidate(er, ec, pairMask)) changed = true;
        }
      }
    }
  }

  return changed;
}

/* =============================================================================
 * SHARED HELPER — bounded constraint propagation (singles only)
 * ========================================================================== */

function propagateSinglesOnly(grid) {
  let progressed = false;
  let changedThisPass = true;
  while (changedThisPass) {
    changedThisPass = false;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid.values[r][c] !== 0) continue;
        const mask = grid.candidates[r][c];
        if (mask === 0) return progressed;
        if (countCandidates(mask) === 1) {
          grid.setValue(r, c, maskToDigits(mask)[0]);
          changedThisPass = true;
          progressed = true;
        }
      }
    }
    if (grid.hasContradiction()) return progressed;

    for (const type of ["row", "col", "box"]) {
      for (let index = 0; index < 9; index++) {
        const cells = getHouseCells(type, index);
        for (let d = 1; d <= 9; d++) {
          const mask = digitToMask(d);
          const hits = cells.filter(
            ([r, c]) => grid.values[r][c] === 0 && grid.candidates[r][c] & mask,
          );
          if (hits.length === 1) {
            const [r, c] = hits[0];
            grid.setValue(r, c, d);
            changedThisPass = true;
            progressed = true;
          }
        }
      }
    }
    if (grid.hasContradiction()) return progressed;
  }
  return progressed;
}

/* =============================================================================
 * TIER 4 — DYNAMIC CELL FORCING CHAINS
 * ========================================================================== */

function techDynamicForcingChains(grid) {
  let changed = false;

  const targets = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid.values[r][c] === 0) {
        const count = countCandidates(grid.candidates[r][c]);
        if (count >= 2) targets.push([r, c]);
      }
    }
  }

  for (const [pr, pc] of targets) {
    const digits = maskToDigits(grid.candidates[pr][pc]);
    const branchResults = [];
    let anyContradiction = false;
    let contradictingDigit = null;

    for (const d of digits) {
      const branch = grid.clone();
      branch.setValue(pr, pc, d);
      propagateSinglesOnly(branch);
      if (branch.hasContradiction()) {
        anyContradiction = true;
        contradictingDigit = d;
        branchResults.push(null);
      } else {
        branchResults.push(branch);
      }
    }

    if (anyContradiction) {
      const mask = digitToMask(contradictingDigit);
      if (grid.eliminateCandidate(pr, pc, mask)) {
        changed = true;
        continue;
      }
    }

    const validBranches = branchResults.filter((b) => b !== null);
    if (validBranches.length < 2) continue;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid.values[r][c] !== 0) continue;
        const firstVal = validBranches[0].values[r][c];
        if (
          firstVal !== 0 &&
          validBranches.every((b) => b.values[r][c] === firstVal)
        ) {
          grid.setValue(r, c, firstVal);
          changed = true;
        }
      }
    }

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid.values[r][c] !== 0) continue;
        let commonSurvivingMask = grid.candidates[r][c];
        for (const b of validBranches) {
          const branchMask =
            b.values[r][c] !== 0
              ? digitToMask(b.values[r][c])
              : b.candidates[r][c];
          commonSurvivingMask &= branchMask;
        }
        const eliminationMask = grid.candidates[r][c] & ~commonSurvivingMask;
        if (eliminationMask && grid.eliminateCandidate(r, c, eliminationMask))
          changed = true;
      }
    }
  }

  return changed;
}

/* =============================================================================
 * TIER 4 — DYNAMIC REGION FORCING CHAINS
 * ========================================================================== */

function techRegionForcingChains(grid) {
  let changed = false;

  for (const type of ["row", "col", "box"]) {
    for (let index = 0; index < 9; index++) {
      const cells = getHouseCells(type, index);
      for (let d = 1; d <= 9; d++) {
        const mask = digitToMask(d);
        const hits = cells.filter(
          ([r, c]) => grid.values[r][c] === 0 && grid.candidates[r][c] & mask,
        );
        if (hits.length < 2 || hits.length > 4) continue;

        const branchResults = [];
        for (const [hr, hc] of hits) {
          const branch = grid.clone();
          branch.setValue(hr, hc, d);
          propagateSinglesOnly(branch);
          if (!branch.hasContradiction()) branchResults.push(branch);
        }

        if (branchResults.length < 2 || branchResults.length !== hits.length)
          continue;

        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (grid.values[r][c] !== 0) continue;
            const firstVal = branchResults[0].values[r][c];
            if (
              firstVal !== 0 &&
              branchResults.every((b) => b.values[r][c] === firstVal)
            ) {
              grid.setValue(r, c, firstVal);
              changed = true;
            }
          }
        }

        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (grid.values[r][c] !== 0) continue;
            let commonSurvivingMask = grid.candidates[r][c];
            for (const b of branchResults) {
              const branchMask =
                b.values[r][c] !== 0
                  ? digitToMask(b.values[r][c])
                  : b.candidates[r][c];
              commonSurvivingMask &= branchMask;
            }
            const eliminationMask =
              grid.candidates[r][c] & ~commonSurvivingMask;
            if (
              eliminationMask &&
              grid.eliminateCandidate(r, c, eliminationMask)
            )
              changed = true;
          }
        }
      }
    }
  }

  return changed;
}

/* =============================================================================
 * TIER 4 — ALMOST LOCKED SETS (ALS-XZ)
 * ========================================================================== */

function findAlmostLockedSets(grid) {
  const alsList = [];
  for (const type of ["row", "col", "box"]) {
    for (let index = 0; index < 9; index++) {
      const cells = getHouseCells(type, index).filter(
        ([r, c]) => grid.values[r][c] === 0,
      );
      for (let size = 1; size <= 3; size++) {
        if (cells.length < size) continue;
        for (const combo of getCombinations(cells, size)) {
          let unionMask = 0;
          for (const [r, c] of combo) unionMask |= grid.candidates[r][c];
          if (countCandidates(unionMask) === size + 1) {
            alsList.push({ cells: combo, mask: unionMask });
          }
        }
      }
    }
  }
  return alsList;
}

function techAlmostLockedSetsXZ(grid) {
  let changed = false;
  const alsList = findAlmostLockedSets(grid);
  if (alsList.length < 2) return false;

  const cellsOfDigitInAls = (als, digit) => {
    const mask = digitToMask(digit);
    return als.cells.filter(([r, c]) => grid.candidates[r][c] & mask);
  };

  for (let i = 0; i < alsList.length; i++) {
    for (let j = i + 1; j < alsList.length; j++) {
      const alsA = alsList[i];
      const alsB = alsList[j];

      const alsAKeys = new Set(alsA.cells.map(([r, c]) => `${r},${c}`));
      const alsBKeys = new Set(alsB.cells.map(([r, c]) => `${r},${c}`));
      if ([...alsAKeys].some((k) => alsBKeys.has(k))) continue;

      const sharedDigits = maskToDigits(alsA.mask & alsB.mask);
      if (sharedDigits.length < 2) continue;

      for (const x of sharedDigits) {
        const xCellsA = cellsOfDigitInAls(alsA, x);
        const xCellsB = cellsOfDigitInAls(alsB, x);
        const isRestrictedCommon = xCellsA.every((ca) =>
          xCellsB.every((cb) => seesEachOther(ca, cb)),
        );
        if (!isRestrictedCommon) continue;

        for (const z of sharedDigits) {
          if (z === x) continue;
          const zCellsA = cellsOfDigitInAls(alsA, z);
          const zCellsB = cellsOfDigitInAls(alsB, z);
          const zMask = digitToMask(z);

          for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
              if (grid.values[r][c] !== 0) continue;
              if (alsAKeys.has(`${r},${c}`) || alsBKeys.has(`${r},${c}`))
                continue;
              if (!(grid.candidates[r][c] & zMask)) continue;

              const seesAllA = zCellsA.every((cell) =>
                seesEachOther([r, c], cell),
              );
              const seesAllB = zCellsB.every((cell) =>
                seesEachOther([r, c], cell),
              );
              if (seesAllA && seesAllB) {
                if (grid.eliminateCandidate(r, c, zMask)) changed = true;
              }
            }
          }
        }
      }
    }
  }

  return changed;
}

/* =============================================================================
 * TIER 4 — SUE DE COQ
 * ========================================================================== */

function techSuedeCoq(grid) {
  let changed = false;

  for (let box = 0; box < 9; box++) {
    const boxCells = getHouseCells("box", box);
    const boxStartR = Math.floor(box / 3) * 3;
    const boxStartC = (box % 3) * 3;

    const lines = [
      ...[0, 1, 2].map((dr) => ({ type: "row", index: boxStartR + dr })),
      ...[0, 1, 2].map((dc) => ({ type: "col", index: boxStartC + dc })),
    ];

    for (const line of lines) {
      const intersection = boxCells.filter(([r, c]) =>
        line.type === "row" ? r === line.index : c === line.index,
      );
      const emptyIntersection = intersection.filter(
        ([r, c]) => grid.values[r][c] === 0,
      );
      if (emptyIntersection.length < 2 || emptyIntersection.length > 3)
        continue;

      let intersectionMask = 0;
      for (const [r, c] of emptyIntersection)
        intersectionMask |= grid.candidates[r][c];
      if (countCandidates(intersectionMask) < emptyIntersection.length + 2)
        continue;

      const restOfLine = getHouseCells(line.type, line.index).filter(
        ([r, c]) => grid.values[r][c] === 0 && boxIndexOf(r, c) !== box,
      );
      const restOfBox = boxCells.filter(
        ([r, c]) =>
          grid.values[r][c] === 0 &&
          !(line.type === "row" ? r === line.index : c === line.index),
      );

      for (
        let sizeLine = 1;
        sizeLine <= Math.min(2, restOfLine.length);
        sizeLine++
      ) {
        for (const lineCombo of getCombinations(restOfLine, sizeLine)) {
          let lineMask = 0;
          for (const [r, c] of lineCombo) lineMask |= grid.candidates[r][c];
          const lineOnlyMask = lineMask & intersectionMask;
          if (countCandidates(lineMask) !== sizeLine + 1) continue;
          if (countCandidates(lineOnlyMask) < 1) continue;

          for (
            let sizeBox = 1;
            sizeBox <= Math.min(2, restOfBox.length);
            sizeBox++
          ) {
            for (const boxCombo of getCombinations(restOfBox, sizeBox)) {
              let boxMask = 0;
              for (const [r, c] of boxCombo) boxMask |= grid.candidates[r][c];
              if (countCandidates(boxMask) !== sizeBox + 1) continue;
              if (boxMask & lineMask) continue;

              const combinedMask = boxMask | lineMask;
              if ((combinedMask & intersectionMask) !== intersectionMask)
                continue;
              if (
                countCandidates(combinedMask) <
                emptyIntersection.length + sizeLine + sizeBox
              )
                continue;

              const lineComboKeys = new Set(
                lineCombo.map(([r, c]) => `${r},${c}`),
              );
              const boxComboKeys = new Set(
                boxCombo.map(([r, c]) => `${r},${c}`),
              );
              const intersectionKeys = new Set(
                emptyIntersection.map(([r, c]) => `${r},${c}`),
              );

              for (const [r, c] of restOfLine) {
                const key = `${r},${c}`;
                if (lineComboKeys.has(key)) continue;
                if (grid.eliminateCandidate(r, c, lineMask)) changed = true;
              }
              for (const [r, c] of restOfBox) {
                const key = `${r},${c}`;
                if (boxComboKeys.has(key)) continue;
                if (grid.eliminateCandidate(r, c, boxMask)) changed = true;
              }
              for (const [r, c] of emptyIntersection) {
                const foreignMask = (boxMask | lineMask) & ~intersectionMask;
                if (foreignMask && grid.eliminateCandidate(r, c, foreignMask))
                  changed = true;
              }
            }
          }
        }
      }
    }
  }

  return changed;
}

/* =============================================================================
 * TIER 4 — EXOCET PATTERN CHECKING (Junior Exocet, simplified/bounded)
 * ========================================================================== */

function techExocet(grid) {
  let changed = false;

  function tryOrientation(lineType) {
    for (let lineIndex = 0; lineIndex < 9; lineIndex++) {
      const lineCells = getHouseCells(lineType, lineIndex).filter(
        ([r, c]) => grid.values[r][c] === 0,
      );
      const cellsByBox = new Map();
      for (const [r, c] of lineCells) {
        const b = boxIndexOf(r, c);
        if (!cellsByBox.has(b)) cellsByBox.set(b, []);
        cellsByBox.get(b).push([r, c]);
      }

      for (const [baseBox, baseBoxCells] of cellsByBox.entries()) {
        if (baseBoxCells.length !== 2) continue;
        const [b1, b2] = baseBoxCells;
        const baseMask =
          grid.candidates[b1[0]][b1[1]] | grid.candidates[b2[0]][b2[1]];
        const baseDigitCount = countCandidates(baseMask);
        if (baseDigitCount < 2 || baseDigitCount > 3) continue;

        const otherBoxes = [...cellsByBox.keys()].filter((b) => b !== baseBox);
        if (otherBoxes.length !== 2) continue;

        const targets = [];
        let validTargets = true;
        for (const ob of otherBoxes) {
          const cellsInBox = cellsByBox.get(ob);
          if (cellsInBox.length !== 1) {
            validTargets = false;
            break;
          }
          const [tr, tc] = cellsInBox[0];
          const targetMask = grid.candidates[tr][tc];
          if ((targetMask & ~baseMask) !== 0) {
            validTargets = false;
            break;
          }
          targets.push([tr, tc]);
        }
        if (!validTargets || targets.length !== 2) continue;

        for (const ob of otherBoxes) {
          const boxCells = getHouseCells("box", ob);
          for (const [r, c] of boxCells) {
            if (grid.values[r][c] !== 0) continue;
            const isTarget = targets.some(([tr, tc]) => tr === r && tc === c);
            if (isTarget) continue;
            if (grid.eliminateCandidate(r, c, baseMask)) changed = true;
          }
        }
      }
    }
  }

  tryOrientation("row");
  tryOrientation("col");

  return changed;
}

/* =============================================================================
 * TIER MAP — every implemented technique, grouped by difficulty tier
 * ========================================================================== */

const TIER_MAP = {
  1: [techNakedSingles, techHiddenSingles],
  2: [
    techPointingPairs,
    techClaimingPairs,
    techNakedPairs,
    techNakedTriples,
    techNakedQuads,
    techHiddenPairs,
    techHiddenTriples,
    techHiddenQuads,
  ],
  3: [
    techXWing,
    techSwordfish,
    techYWing,
    techXYZWing,
    techSimpleColoring,
    techUniqueRectangleType1,
  ],
  4: [
    techDynamicForcingChains,
    techRegionForcingChains,
    techAlmostLockedSetsXZ,
    techSuedeCoq,
    techExocet,
  ],
};

const TIER_NAMES = { 1: "Easy", 2: "Medium", 3: "Hard", 4: "Impossible" };

/* =============================================================================
 * DYNAMIC STRATEGY SELECTOR
 * ========================================================================== */

function runSolverWithRandomizedTechniques(grid, maxTier) {
  let madeProgress = true;
  const highestTierUsed = { value: 0 };
  let passes = 0;

  while (madeProgress && !grid.isSolved()) {
    madeProgress = false;
    passes++;

    for (let tier = 1; tier <= maxTier; tier++) {
      const techniques = shuffleArray(TIER_MAP[tier].slice());
      let tierProgress = false;

      for (const technique of techniques) {
        if (technique(grid)) {
          log(`Solver pass ${passes}: ${technique.name || 'unknown'} (Tier ${tier}) made progress`);
          tierProgress = true;
          if (tier > highestTierUsed.value) {
            highestTierUsed.value = tier;
            log(`Highest tier used now: ${tier}`);
          }
          break;
        }
      }

      if (tierProgress) {
        madeProgress = true;
        break;
      }

      if (grid.hasContradiction()) {
        log('Solver: contradiction reached');
        return {
          solved: false,
          highestTier: highestTierUsed.value,
          contradiction: true,
        };
      }
    }
  }

  const solved = grid.isSolved();
  log(`Solver finished: solved=${solved}, highestTier=${highestTierUsed.value}, passes=${passes}`);
  return {
    solved: solved,
    highestTier: highestTierUsed.value,
    contradiction: grid.hasContradiction(),
  };
}

/* =============================================================================
 * LOGICAL GRADER
 * ========================================================================== */

function gradePuzzle(values) {
  if (GRID.size !== 9) return gradePuzzleSmall(values);
  log('gradePuzzle: starting...');
  const grid = new SudokuGrid(values);
  const result = runSolverWithRandomizedTechniques(grid, 4);
  if (!result.solved) {
    log('gradePuzzle: unsolvable (requires guessing)');
    return {
      solved: false,
      tier: null,
      difficultyName: "Unsolvable (requires guessing)",
    };
  }
  const tier = Math.max(1, result.highestTier);
  log(`gradePuzzle: tier=${tier} (${TIER_NAMES[tier]})`);
  return { solved: true, tier, difficultyName: TIER_NAMES[tier] };
}

function gradePuzzleSmall(values) {
  const n = GRID.size;
  const total = n * n;
  let clueCount = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (values[r][c] !== 0) clueCount++;
    }
  }
  if (countSolutions(values, 2) !== 1) {
    return {
      solved: false,
      tier: null,
      difficultyName: "Unsolvable (requires guessing)",
    };
  }
  let tier;
  const ratio = clueCount / total;
  if (ratio >= 0.72) tier = 1;
  else if (ratio >= 0.58) tier = 2;
  else if (ratio >= 0.45) tier = 3;
  else tier = 4;
  log(`gradePuzzleSmall: size=${n} clues=${clueCount} ratio=${ratio.toFixed(3)} tier=${tier}`);
  return { solved: true, tier, difficultyName: TIER_NAMES[tier] };
}

/* =============================================================================
 * FULL SOLVED BOARD GENERATOR
 * ========================================================================== */

function isPlacementLegal(values, r, c, d) {
  for (let i = 0; i < GRID.size; i++) {
    if (values[r][i] === d) return false;
    if (values[i][c] === d) return false;
  }
  const boxR = Math.floor(r / GRID.boxH) * GRID.boxH;
  const boxC = Math.floor(c / GRID.boxW) * GRID.boxW;
  for (let dr = 0; dr < GRID.boxH; dr++) {
    for (let dc = 0; dc < GRID.boxW; dc++) {
      if (values[boxR + dr][boxC + dc] === d) return false;
    }
  }
  return true;
}

function generateSolvedBoard() {
  const values = Array.from({ length: GRID.size }, () => Array(GRID.size).fill(0));
  const total = GRID.size * GRID.size;
  const digits = Array.from({ length: GRID.size }, (_, i) => i + 1);

  function fill(pos) {
    if (pos === total) return true;
    const r = Math.floor(pos / GRID.size);
    const c = pos % GRID.size;
    const shuffled = shuffleArray(digits.slice());
    for (const d of shuffled) {
      if (isPlacementLegal(values, r, c, d)) {
        values[r][c] = d;
        if (fill(pos + 1)) return true;
        values[r][c] = 0;
      }
    }
    return false;
  }

  fill(0);
  log('generateSolvedBoard: done');
  return values;
}

/* =============================================================================
 * CLUE REMOVAL
 * ========================================================================== */

function removeClues(solvedValues, targetClueCount) {
  const puzzle = solvedValues.map((row) => row.slice());
  const total = GRID.size * GRID.size;
  const cellOrder = shuffleArray(
    Array.from({ length: total }, (_, i) => [Math.floor(i / GRID.size), i % GRID.size]),
  );

  let clueCount = total;
  for (const [r, c] of cellOrder) {
    if (clueCount <= targetClueCount) break;
    if (puzzle[r][c] === 0) continue;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    if (countSolutions(puzzle, 2) === 1) {
      clueCount--;
    } else {
      puzzle[r][c] = backup;
    }
  }

  log(`removeClues: target=${targetClueCount}, result=${clueCount}`);
  return { puzzle, clueCount };
}

/* =============================================================================
 * PUZZLE GENERATOR
 * ========================================================================== */

const SMALL_TIER_CLUE_RANGES = {
  1: [26, 30],
  2: [21, 25],
  3: [17, 20],
  4: [12, 16],
};

const CLUE_RANGES_9X9 = {
  1: [33, 37],
  2: [29, 33],
  3: [25, 29],
  4: [22, 26],
};

function generateGamePuzzle(targetDifficulty, options = {}) {
  const maxAttempts = options.maxAttempts || 150;
  const size = options.size || 9;
  const isSmall = size !== 9;
  if (isSmall) {
    setGridConfig(size, 2, 3);
  } else {
    setGridConfig(9, 3, 3);
  }
  let minClues;
  let maxClues;
  if (isSmall) {
    const range = SMALL_TIER_CLUE_RANGES[targetDifficulty] || SMALL_TIER_CLUE_RANGES[2];
    minClues = range[0];
    maxClues = range[1];
    if (options.minClues != null && options.maxClues != null) {
      minClues = Math.max(options.minClues, minClues);
      maxClues = Math.min(options.maxClues, maxClues);
      if (minClues > maxClues) {
        minClues = range[0];
        maxClues = range[1];
      }
    }
  } else if (options.minClues != null && options.maxClues != null) {
    minClues = options.minClues;
    maxClues = options.maxClues;
    if (minClues > maxClues) {
      const range = CLUE_RANGES_9X9[targetDifficulty] || [25, 32];
      minClues = range[0];
      maxClues = range[1];
    }
  } else {
    const range = CLUE_RANGES_9X9[targetDifficulty] || [25, 32];
    minClues = range[0];
    maxClues = range[1];
  }

  let best = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    log(`generateGamePuzzle: attempt ${attempt + 1}/${maxAttempts} (target tier ${targetDifficulty}, size ${size})`);
    const solved = generateSolvedBoard();
    const targetClueCount =
      minClues + Math.floor(Math.random() * (maxClues - minClues + 1));
    log(`generateGamePuzzle: targetClueCount=${targetClueCount}`);
    const { puzzle, clueCount } = removeClues(solved, targetClueCount);

    const grade = gradePuzzle(puzzle);
    if (grade.solved && grade.tier === targetDifficulty) {
      log(`generateGamePuzzle: SUCCESS on attempt ${attempt + 1} (clues=${clueCount}, tier=${grade.tier})`);
      return {
        puzzle,
        solution: solved,
        clueCount,
        size,
        difficulty: grade.tier,
        difficultyName: grade.difficultyName,
        attempts: attempt + 1,
      };
    } else if (grade.solved) {
      if (
        !best ||
        Math.abs(grade.tier - targetDifficulty) <
          Math.abs(best.grade.tier - targetDifficulty)
      ) {
        best = {
          puzzle,
          solution: solved,
          clueCount,
          size,
          difficulty: grade.tier,
          difficultyName: grade.difficultyName,
          attempts: attempt + 1,
          grade,
        };
      }
      log(`generateGamePuzzle: attempt ${attempt + 1} failed (clues=${clueCount}, grade=${grade.tier})`);
    } else {
      log(`generateGamePuzzle: attempt ${attempt + 1} failed (clues=${clueCount}, grade='unsolvable')`);
    }
  }

  if (best) {
    log(`generateGamePuzzle: no exact tier match; falling back to closest grade (tier ${best.grade.tier})`);
    return {
      puzzle: best.puzzle,
      solution: best.solution,
      clueCount: best.clueCount,
      size: best.size,
      difficulty: best.difficulty,
      difficultyName: best.difficultyName,
      attempts: best.attempts,
    };
  }

  throw new Error(
    `Could not generate a Tier ${targetDifficulty} (${TIER_NAMES[targetDifficulty]}) puzzle in ${maxAttempts} attempts. ` +
      `Try increasing maxAttempts or widening the clue range.`,
  );
}

/* =============================================================================
 * BACKWARD COMPAT — rank SVG helpers
 * ========================================================================== */

const RANK_SVG_MAP = {
  elite: 'assets/rank-elite.svg',
  mythic: 'assets/rank-mythic.svg',
  grandmaster: 'assets/rank-grandmaster.svg',
  legend: 'assets/rank-legend.svg',
  diamond: 'assets/rank-diamond.svg',
  emerald: 'assets/rank-emerald.svg',
  platinum: 'assets/rank-platinum.svg',
  gold: 'assets/rank-gold.svg',
  silver: 'assets/rank-silver.svg',
  bronze: 'assets/rank-bronze.svg',
  wood: 'assets/rank-wood.svg',
};

function rankSvgSrc(rankName) {
  const t = rankName.toLowerCase();
  for (const [key, src] of Object.entries(RANK_SVG_MAP))
    if (t.includes(key)) return src;
  return '';
}

function rankSvgImg(rankName, size) {
  const src = rankSvgSrc(rankName);
  if (!src) return '';
  return '<img src="' + src + '" width="' + size + '" height="' + size + '" class="rank-svg-icon" alt="' + rankName + '">';
}

/* =============================================================================
 * BACKWARD COMPAT — old engine helpers (used by ui.js, game.js)
 * ========================================================================== */

function isValidPlacement(board, row, col, val) {
  if (!val) return true;
  for (let i = 0; i < GRID.size; i++) {
    if (board[row][i] === val && i !== col) return false;
    if (board[i][col] === val && i !== row) return false;
  }
  const br = Math.floor(row / GRID.boxH) * GRID.boxH, bc = Math.floor(col / GRID.boxW) * GRID.boxW;
  for (let r = br; r < br + GRID.boxH; r++)
    for (let c = bc; c < bc + GRID.boxW; c++)
      if (board[r][c] === val && (r !== row || c !== col)) return false;
  return true;
}

function findConflicts(board) {
  const conflicts = new Set();
  for (let row = 0; row < GRID.size; row++)
    for (let col = 0; col < GRID.size; col++) {
      const v = board[row][col];
      if (!v) continue;
      for (let i = 0; i < GRID.size; i++) {
        if (i !== col && board[row][i] === v) { conflicts.add(row+','+col); conflicts.add(row+','+i); }
        if (i !== row && board[i][col] === v) { conflicts.add(row+','+col); conflicts.add(i+','+col); }
      }
      const br = Math.floor(row / GRID.boxH) * GRID.boxH, bc = Math.floor(col / GRID.boxW) * GRID.boxW;
      for (let r = br; r < br + GRID.boxH; r++)
        for (let c = bc; c < bc + GRID.boxW; c++)
          if ((r !== row || c !== col) && board[r][c] === v) { conflicts.add(row+','+col); conflicts.add(r+','+c); }
    }
  return conflicts;
}

function getWrongCells(board, solution) {
  const wrong = new Set();
  for (let r = 0; r < GRID.size; r++) {
    for (let c = 0; c < GRID.size; c++) {
      if (board[r][c] !== 0 && board[r][c] !== solution[r][c]) {
        wrong.add(r + ',' + c);
      }
    }
  }
  return wrong;
}

function getCandidates(board, row, col) {
  if (board[row][col]) return new Set();
  const cands = new Set(Array.from({ length: GRID.size }, (_, i) => i + 1));
  for (let i = 0; i < GRID.size; i++) {
    cands.delete(board[row][i]);
    cands.delete(board[i][col]);
  }
  const br = Math.floor(row / GRID.boxH) * GRID.boxH, bc = Math.floor(col / GRID.boxW) * GRID.boxW;
  for (let r = br; r < br + GRID.boxH; r++)
    for (let c = bc; c < bc + GRID.boxW; c++)
      cands.delete(board[r][c]);
  return cands;
}
