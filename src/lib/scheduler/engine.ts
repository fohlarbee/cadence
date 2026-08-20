// Cadence Engine — a two-phase timetabling solver.
//
//   Phase 1  Constructive graph-colouring: order events "most-constrained-first"
//            and greedily place each in the feasible slot that adds the least soft
//            cost. Guarantees zero HARD-constraint violations among placed events;
//            anything that cannot fit is reported UNPLACED with a human reason.
//   Phase 2  Simulated annealing: move/swap placed events (hard feasibility always
//            preserved) to drive down the weighted SOFT penalty.
//
// Deterministic: same input + same seed => same timetable.

import {
  DEFAULT_WEIGHTS,
  type EngineInput,
  type EngineOptions,
  type EngineResult,
  type EventUnit,
  type Placement,
  type RoomKind,
  type ScoreBreakdown,
  type SoftWeights,
  type Unplaced,
} from "./types";
import { makeRng, randInt, shuffle, type Rng } from "./rng";

// ---------------------------------------------------------------------------
// Expansion: a course becomes `sessionsPerWeek` events of `sessionLength`.
// ---------------------------------------------------------------------------

function expand(input: EngineInput): EventUnit[] {
  const cohortSize = new Map(input.cohorts.map((c) => [c.id, c.size]));
  const events: EventUnit[] = [];
  for (const course of input.courses) {
    const size = cohortSize.get(course.cohortId) ?? 0;
    const n = Math.max(1, course.sessionsPerWeek);
    for (let i = 0; i < n; i++) {
      events.push({
        id: `${course.id}#${i}`,
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        lecturerId: course.lecturerId,
        cohortId: course.cohortId,
        cohortSize: size,
        requiresKind: course.requiresKind,
        length: Math.max(1, course.sessionLength),
      });
    }
  }
  return events;
}

// A candidate placement (day, start period, room) — before checking clashes.
interface Slot {
  day: number;
  period: number;
  roomId: string;
}

// ---------------------------------------------------------------------------
// Static feasibility: slots that satisfy capacity, room-kind, day bounds,
// the lunch break and lecturer availability — independent of other events.
// ---------------------------------------------------------------------------

function eligibleRooms(ev: EventUnit, input: EngineInput) {
  return input.rooms.filter(
    (r) =>
      r.capacity >= ev.cohortSize &&
      (ev.requiresKind === null || r.kind === ev.requiresKind),
  );
}

function fitsDay(
  period: number,
  length: number,
  periodsPerDay: number,
  lunch: number | null,
): boolean {
  if (period + length > periodsPerDay) return false;
  if (lunch !== null && lunch >= period && lunch < period + length) return false;
  return true;
}

function staticSlots(
  ev: EventUnit,
  input: EngineInput,
  unavail: Map<string, Set<string>>,
): Slot[] {
  const { daysCount, periodsPerDay, lunchPeriod } = input.grid;
  const rooms = eligibleRooms(ev, input);
  const busy = unavail.get(ev.lecturerId) ?? new Set<string>();
  const slots: Slot[] = [];
  for (let day = 0; day < daysCount; day++) {
    for (let period = 0; period < periodsPerDay; period++) {
      if (!fitsDay(period, ev.length, periodsPerDay, lunchPeriod)) continue;
      let lecturerFree = true;
      for (let i = 0; i < ev.length; i++) {
        if (busy.has(`${day}-${period + i}`)) {
          lecturerFree = false;
          break;
        }
      }
      if (!lecturerFree) continue;
      for (const r of rooms) slots.push({ day, period, roomId: r.id });
    }
  }
  return slots;
}

// Reason a course could not be placed at all (empty static domain).
function structuralReason(ev: EngineInput["courses"][number], input: EngineInput): string {
  const size = input.cohorts.find((c) => c.id === ev.cohortId)?.size ?? 0;
  const kind = ev.requiresKind;
  const rooms = input.rooms.filter(
    (r) => r.capacity >= size && (kind === null || r.kind === kind),
  );
  if (rooms.length === 0) {
    const kindLabel = kind ? `${kind.toLowerCase()} room` : "room";
    return `No ${kindLabel} with capacity ≥ ${size} exists.`;
  }
  const lecturer = input.lecturers.find((l) => l.id === ev.lecturerId);
  return `${lecturer?.name ?? "The lecturer"} has no free period long enough (${ev.sessionLength}) for this class.`;
}

// ---------------------------------------------------------------------------
// Board: live occupancy + soft-cost helpers. Mutated in place during search.
// ---------------------------------------------------------------------------

class Board {
  readonly placements = new Map<string, Placement>();
  private readonly room = new Set<string>();
  private readonly lec = new Set<string>();
  private readonly coh = new Set<string>();
  /** courseId+":"+day -> count, for the course-spread penalty. */
  private readonly courseDay = new Map<string, number>();

  constructor(private readonly events: Map<string, EventUnit>) {}

  canPlace(ev: EventUnit, day: number, period: number, roomId: string): boolean {
    for (let i = 0; i < ev.length; i++) {
      const p = period + i;
      if (this.room.has(`${roomId}@${day}:${p}`)) return false;
      if (this.lec.has(`${ev.lecturerId}@${day}:${p}`)) return false;
      if (this.coh.has(`${ev.cohortId}@${day}:${p}`)) return false;
    }
    return true;
  }

  place(ev: EventUnit, day: number, period: number, roomId: string): void {
    for (let i = 0; i < ev.length; i++) {
      const p = period + i;
      this.room.add(`${roomId}@${day}:${p}`);
      this.lec.add(`${ev.lecturerId}@${day}:${p}`);
      this.coh.add(`${ev.cohortId}@${day}:${p}`);
    }
    const key = `${ev.courseId}:${day}`;
    this.courseDay.set(key, (this.courseDay.get(key) ?? 0) + 1);
    this.placements.set(ev.id, {
      eventId: ev.id,
      courseId: ev.courseId,
      day,
      period,
      roomId,
      length: ev.length,
    });
  }

  remove(eventId: string): void {
    const pl = this.placements.get(eventId);
    const ev = this.events.get(eventId);
    if (!pl || !ev) return;
    for (let i = 0; i < ev.length; i++) {
      const p = pl.period + i;
      this.room.delete(`${pl.roomId}@${pl.day}:${p}`);
      this.lec.delete(`${ev.lecturerId}@${pl.day}:${p}`);
      this.coh.delete(`${ev.cohortId}@${pl.day}:${p}`);
    }
    const key = `${ev.courseId}:${pl.day}`;
    this.courseDay.set(key, Math.max(0, (this.courseDay.get(key) ?? 0) - 1));
    this.placements.delete(eventId);
  }

  /** Occupied-period flags for a resource set on one day. */
  private dayFlags(set: Set<string>, id: string, day: number, periods: number): boolean[] {
    const flags = new Array<boolean>(periods).fill(false);
    for (let p = 0; p < periods; p++) if (set.has(`${id}@${day}:${p}`)) flags[p] = true;
    return flags;
  }

  cohortFlags(id: string, day: number, periods: number) {
    return this.dayFlags(this.coh, id, day, periods);
  }
  lecturerFlags(id: string, day: number, periods: number) {
    return this.dayFlags(this.lec, id, day, periods);
  }
  courseCountOnDay(courseId: string, day: number): number {
    return this.courseDay.get(`${courseId}:${day}`) ?? 0;
  }

  snapshot(): Placement[] {
    return [...this.placements.values()].map((p) => ({ ...p }));
  }
}

// Idle-gap measure for a day: (span of occupied periods) − (occupied count).
function gapOf(flags: boolean[]): number {
  let first = -1;
  let last = -1;
  let count = 0;
  for (let p = 0; p < flags.length; p++) {
    if (flags[p]) {
      if (first === -1) first = p;
      last = p;
      count++;
    }
  }
  if (count === 0) return 0;
  return last - first + 1 - count;
}

// ---------------------------------------------------------------------------
// Soft cost.
// ---------------------------------------------------------------------------

// Cheap local cost of putting `ev` at (day, period, room) given the current board.
function localCost(
  board: Board,
  ev: EventUnit,
  day: number,
  period: number,
  input: EngineInput,
  w: SoftWeights,
): number {
  const P = input.grid.periodsPerDay;
  const add = (flags: boolean[]) => {
    const before = gapOf(flags);
    const after = flags.slice();
    for (let i = 0; i < ev.length; i++) after[period + i] = true;
    return gapOf(after) - before;
  };
  let cost = 0;
  cost += w.cohortGap * add(board.cohortFlags(ev.cohortId, day, P));
  cost += w.lecturerGap * add(board.lecturerFlags(ev.lecturerId, day, P));
  if (board.courseCountOnDay(ev.courseId, day) > 0) cost += w.courseSpread;
  for (let i = 0; i < ev.length; i++) {
    if (period + i === 0 || period + i === P - 1) cost += w.edgeOfDay;
  }
  return cost;
}

// Full soft-penalty of a whole board (the true objective for annealing).
function evaluate(board: Board, input: EngineInput, w: SoftWeights): ScoreBreakdown {
  const P = input.grid.periodsPerDay;
  const D = input.grid.daysCount;
  let cohortGap = 0;
  let lecturerGap = 0;
  let courseSpread = 0;
  let edgeOfDay = 0;

  for (const c of input.cohorts) {
    for (let d = 0; d < D; d++) cohortGap += gapOf(board.cohortFlags(c.id, d, P));
  }
  for (const l of input.lecturers) {
    for (let d = 0; d < D; d++) lecturerGap += gapOf(board.lecturerFlags(l.id, d, P));
  }
  for (const course of input.courses) {
    for (let d = 0; d < D; d++) {
      const n = board.courseCountOnDay(course.id, d);
      if (n > 1) courseSpread += n - 1;
    }
  }
  for (const pl of board.placements.values()) {
    for (let i = 0; i < pl.length; i++) {
      if (pl.period + i === 0 || pl.period + i === P - 1) edgeOfDay++;
    }
  }

  const total =
    w.cohortGap * cohortGap +
    w.lecturerGap * lecturerGap +
    w.courseSpread * courseSpread +
    w.edgeOfDay * edgeOfDay;
  return {
    total,
    cohortGap: w.cohortGap * cohortGap,
    lecturerGap: w.lecturerGap * lecturerGap,
    courseSpread: w.courseSpread * courseSpread,
    edgeOfDay: w.edgeOfDay * edgeOfDay,
  };
}

// ---------------------------------------------------------------------------
// Phase 1 — construction.
// ---------------------------------------------------------------------------

interface ConstructResult {
  board: Board;
  conflictUnplaced: EventUnit[];
  score: number;
}

function construct(
  order: EventUnit[],
  domains: Map<string, Slot[]>,
  eventsById: Map<string, EventUnit>,
  input: EngineInput,
  w: SoftWeights,
  rng: Rng,
): ConstructResult {
  const board = new Board(eventsById);
  const conflictUnplaced: EventUnit[] = [];

  for (const ev of order) {
    const domain = domains.get(ev.id) ?? [];
    // Shuffle so equally-good slots vary across seeds, then pick least-cost.
    const candidates = shuffle(domain, rng).filter((s) =>
      board.canPlace(ev, s.day, s.period, s.roomId),
    );
    if (candidates.length === 0) {
      conflictUnplaced.push(ev);
      continue;
    }
    let best = candidates[0];
    let bestCost = Infinity;
    for (const s of candidates) {
      const cost = localCost(board, ev, s.day, s.period, input, w);
      if (cost < bestCost) {
        bestCost = cost;
        best = s;
      }
    }
    board.place(ev, best.day, best.period, best.roomId);
  }

  return { board, conflictUnplaced, score: evaluate(board, input, w).total };
}

// ---------------------------------------------------------------------------
// Phase 2 — simulated annealing.
// ---------------------------------------------------------------------------

function optimize(
  board: Board,
  domains: Map<string, Slot[]>,
  eventsById: Map<string, EventUnit>,
  input: EngineInput,
  w: SoftWeights,
  rng: Rng,
  iterations: number,
): void {
  const placedIds = [...board.placements.keys()];
  if (placedIds.length < 2) return;

  let current = evaluate(board, input, w).total;
  let best = current;
  let bestSnapshot = board.snapshot();

  let T = Math.max(1, current) * 0.25 + 2;
  const cooling = 0.9995;

  for (let it = 0; it < iterations; it++) {
    const id = placedIds[randInt(rng, placedIds.length)];
    const ev = eventsById.get(id)!;
    const from = board.placements.get(id)!;

    const relocate = rng() < 0.6;
    let applied = false;
    let undo: (() => void) | null = null;

    if (relocate) {
      board.remove(id);
      const dom = domains.get(id) ?? [];
      const feasible = dom.filter((s) => board.canPlace(ev, s.day, s.period, s.roomId));
      if (feasible.length === 0) {
        board.place(ev, from.day, from.period, from.roomId); // restore
      } else {
        const to = feasible[randInt(rng, feasible.length)];
        board.place(ev, to.day, to.period, to.roomId);
        applied = true;
        undo = () => {
          board.remove(id);
          board.place(ev, from.day, from.period, from.roomId);
        };
      }
    } else {
      const otherId = placedIds[randInt(rng, placedIds.length)];
      if (otherId !== id) {
        const other = eventsById.get(otherId)!;
        const oFrom = board.placements.get(otherId)!;
        // Swap slots (incl. rooms). Validate each in the other's target.
        const evOkStatic =
          fitsDay(oFrom.period, ev.length, input.grid.periodsPerDay, input.grid.lunchPeriod) &&
          roomOk(ev, oFrom.roomId, input) &&
          lecturerFree(ev, oFrom.day, oFrom.period, input);
        const otherOkStatic =
          fitsDay(from.period, other.length, input.grid.periodsPerDay, input.grid.lunchPeriod) &&
          roomOk(other, from.roomId, input) &&
          lecturerFree(other, from.day, from.period, input);
        if (evOkStatic && otherOkStatic) {
          board.remove(id);
          board.remove(otherId);
          const evFits = board.canPlace(ev, oFrom.day, oFrom.period, oFrom.roomId);
          const otherFits = board.canPlace(other, from.day, from.period, from.roomId);
          if (evFits && otherFits) {
            board.place(ev, oFrom.day, oFrom.period, oFrom.roomId);
            board.place(other, from.day, from.period, from.roomId);
            applied = true;
            undo = () => {
              board.remove(id);
              board.remove(otherId);
              board.place(ev, from.day, from.period, from.roomId);
              board.place(other, oFrom.day, oFrom.period, oFrom.roomId);
            };
          } else {
            board.place(ev, from.day, from.period, from.roomId);
            board.place(other, oFrom.day, oFrom.period, oFrom.roomId);
          }
        }
      }
    }

    if (applied) {
      const next = evaluate(board, input, w).total;
      const delta = next - current;
      if (delta <= 0 || rng() < Math.exp(-delta / T)) {
        current = next;
        if (current < best) {
          best = current;
          bestSnapshot = board.snapshot();
        }
      } else if (undo) {
        undo();
      }
    }
    T *= cooling;
  }

  // Restore the best timetable found.
  for (const id of [...board.placements.keys()]) board.remove(id);
  for (const pl of bestSnapshot) {
    const ev = eventsById.get(pl.eventId)!;
    board.place(ev, pl.day, pl.period, pl.roomId);
  }
}

function roomOk(ev: EventUnit, roomId: string, input: EngineInput): boolean {
  const r = input.rooms.find((x) => x.id === roomId);
  if (!r) return false;
  return r.capacity >= ev.cohortSize && (ev.requiresKind === null || r.kind === ev.requiresKind);
}

function lecturerFree(ev: EventUnit, day: number, period: number, input: EngineInput): boolean {
  const l = input.lecturers.find((x) => x.id === ev.lecturerId);
  if (!l) return true;
  for (let i = 0; i < ev.length; i++) {
    if (l.unavailable.includes(`${day}-${period + i}`)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Orchestrator.
// ---------------------------------------------------------------------------

export function generateTimetable(input: EngineInput, options: EngineOptions): EngineResult {
  const started = Date.now();
  const w = options.weights ?? DEFAULT_WEIGHTS;
  const seed = options.seed >>> 0;

  const events = expand(input);
  const eventsById = new Map(events.map((e) => [e.id, e]));
  const unavail = new Map(input.lecturers.map((l) => [l.id, new Set(l.unavailable)]));

  // Static domains + structurally impossible events.
  const domains = new Map<string, Slot[]>();
  const placeable: EventUnit[] = [];
  const structural: Unplaced[] = [];
  const structuralCourses = new Set<string>();
  for (const ev of events) {
    const dom = staticSlots(ev, input, unavail);
    if (dom.length === 0) {
      if (!structuralCourses.has(ev.courseId)) {
        structuralCourses.add(ev.courseId);
        const course = input.courses.find((c) => c.id === ev.courseId)!;
        structural.push({
          courseCode: ev.courseCode,
          title: ev.courseTitle,
          reason: structuralReason(course, input),
        });
      }
      continue;
    }
    domains.set(ev.id, dom);
    placeable.push(ev);
  }

  // Most-constrained-first: smallest domain, then highest conflict degree.
  const degree = conflictDegree(placeable);
  const order = placeable.slice().sort((a, b) => {
    const da = domains.get(a.id)!.length;
    const db = domains.get(b.id)!.length;
    if (da !== db) return da - db;
    const ga = degree.get(a.id) ?? 0;
    const gb = degree.get(b.id) ?? 0;
    if (ga !== gb) return gb - ga;
    return a.id < b.id ? -1 : 1; // stable, deterministic
  });

  // Phase 1 with restarts — keep the run with fewest unplaced, then lowest score.
  const restarts = Math.max(1, options.restarts ?? 6);
  let bestRun: ConstructResult | null = null;
  for (let r = 0; r < restarts; r++) {
    const rng = makeRng(seed + r * 7919 + 1);
    const run = construct(order, domains, eventsById, input, w, rng);
    if (
      bestRun === null ||
      run.conflictUnplaced.length < bestRun.conflictUnplaced.length ||
      (run.conflictUnplaced.length === bestRun.conflictUnplaced.length &&
        run.score < bestRun.score)
    ) {
      bestRun = run;
    }
  }
  const chosen = bestRun!;
  const scoreAfterConstruct = chosen.score;

  // Phase 2 — anneal the chosen construction.
  const iterations =
    options.iterations ?? Math.min(20000, Math.max(2000, placeable.length * 400));
  optimize(chosen.board, domains, eventsById, input, w, makeRng(seed * 2654435761), iterations);

  // Assemble result.
  const conflictReason =
    "Every room and time that would fit is already taken by a clashing class (same lecturer, room, or cohort).";
  const conflictCourses = new Set<string>();
  const conflict: Unplaced[] = [];
  for (const ev of chosen.conflictUnplaced) {
    if (conflictCourses.has(ev.courseId)) continue;
    conflictCourses.add(ev.courseId);
    conflict.push({ courseCode: ev.courseCode, title: ev.courseTitle, reason: conflictReason });
  }
  const unplaced = [...structural, ...conflict];

  const placements = chosen.board.snapshot();
  const score = evaluate(chosen.board, input, w);

  const availablePeriods =
    input.grid.periodsPerDay - (input.grid.lunchPeriod !== null ? 1 : 0);
  const capacity = input.rooms.length * input.grid.daysCount * availablePeriods;
  const occupied = placements.reduce((s, p) => s + p.length, 0);

  return {
    placements,
    unplaced,
    hardOk: unplaced.length === 0,
    score,
    scoreAfterConstruct,
    utilization: {
      roomOccupancyPct: capacity > 0 ? Math.round((occupied / capacity) * 1000) / 10 : 0,
      placedEvents: placements.length,
      totalEvents: events.length,
    },
    seed,
    elapsedMs: Date.now() - started,
  };
}

function conflictDegree(events: EventUnit[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const a of events) {
    let d = 0;
    for (const b of events) {
      if (a.id === b.id) continue;
      if (a.lecturerId === b.lecturerId || a.cohortId === b.cohortId) d++;
    }
    degree.set(a.id, d);
  }
  return degree;
}

// Exposed for the verification script: assert no hard clashes among placements.
export function findHardViolations(
  placements: Placement[],
  input: EngineInput,
): string[] {
  const eventsById = new Map(expand(input).map((e) => [e.id, e]));
  const room = new Map<string, string>();
  const lec = new Map<string, string>();
  const coh = new Map<string, string>();
  const violations: string[] = [];
  const claim = (
    map: Map<string, string>,
    key: string,
    label: string,
    who: string,
  ) => {
    if (map.has(key)) violations.push(`${label} clash at ${key}: ${map.get(key)} vs ${who}`);
    else map.set(key, who);
  };
  for (const pl of placements) {
    const ev = eventsById.get(pl.eventId);
    if (!ev) continue;
    for (let i = 0; i < pl.length; i++) {
      const slot = `${pl.day}:${pl.period + i}`;
      claim(room, `${pl.roomId}@${slot}`, "room", pl.courseId);
      claim(lec, `${ev.lecturerId}@${slot}`, "lecturer", pl.courseId);
      claim(coh, `${ev.cohortId}@${slot}`, "cohort", pl.courseId);
    }
  }
  return violations;
}

export { DEFAULT_WEIGHTS };
export type { RoomKind };
