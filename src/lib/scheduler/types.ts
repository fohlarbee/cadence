// Cadence Engine — shared types.
// The engine is pure & deterministic: same input + same seed => same timetable.

export type RoomKind = "HALL" | "LAB" | "SEMINAR";
export const ROOM_KINDS: RoomKind[] = ["HALL", "LAB", "SEMINAR"];

export interface GridConfig {
  daysCount: number;
  periodsPerDay: number;
  /** Period index reserved for lunch (no class may occupy it), or null. */
  lunchPeriod: number | null;
}

export interface EngineRoom {
  id: string;
  name: string;
  capacity: number;
  kind: RoomKind;
}

export interface EngineLecturer {
  id: string;
  name: string;
  /** "day-period" slot strings the lecturer cannot teach, e.g. "0-3". */
  unavailable: string[];
}

export interface EngineCohort {
  id: string;
  name: string;
  size: number;
}

export interface EngineCourse {
  id: string;
  code: string;
  title: string;
  sessionsPerWeek: number;
  sessionLength: number;
  requiresKind: RoomKind | null;
  lecturerId: string;
  cohortId: string;
}

export interface SoftWeights {
  /** Idle gaps in a cohort's day. */
  cohortGap: number;
  /** Same course scheduled more than once on the same day. */
  courseSpread: number;
  /** Idle gaps in a lecturer's day. */
  lecturerGap: number;
  /** Using the very first / very last period of a day. */
  edgeOfDay: number;
}

export const DEFAULT_WEIGHTS: SoftWeights = {
  cohortGap: 5,
  courseSpread: 3,
  lecturerGap: 2,
  edgeOfDay: 1,
};

export interface EngineInput {
  grid: GridConfig;
  rooms: EngineRoom[];
  lecturers: EngineLecturer[];
  cohorts: EngineCohort[];
  courses: EngineCourse[];
}

export interface EngineOptions {
  seed: number;
  weights: SoftWeights;
  /** Simulated-annealing iterations (defaults to a size-based budget). */
  iterations?: number;
  /** Construction restarts kept-best (default 6). */
  restarts?: number;
}

// --- internal / output ---

export interface EventUnit {
  id: string; // `${courseId}#${index}`
  courseId: string;
  courseCode: string;
  courseTitle: string;
  lecturerId: string;
  cohortId: string;
  cohortSize: number;
  requiresKind: RoomKind | null;
  length: number;
}

export interface Placement {
  eventId: string;
  courseId: string;
  day: number;
  period: number; // start period
  roomId: string;
  length: number;
}

export interface Unplaced {
  courseCode: string;
  title: string;
  reason: string;
}

export interface ScoreBreakdown {
  total: number;
  cohortGap: number;
  courseSpread: number;
  lecturerGap: number;
  edgeOfDay: number;
}

export interface Utilization {
  roomOccupancyPct: number;
  placedEvents: number;
  totalEvents: number;
}

export interface EngineResult {
  placements: Placement[];
  unplaced: Unplaced[];
  hardOk: boolean;
  score: ScoreBreakdown;
  scoreAfterConstruct: number;
  utilization: Utilization;
  seed: number;
  elapsedMs: number;
}
