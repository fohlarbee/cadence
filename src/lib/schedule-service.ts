import "server-only";
import { prisma } from "@/lib/prisma";
import {
  generateTimetable,
  DEFAULT_WEIGHTS,
  type EngineInput,
  type RoomKind,
  type SoftWeights,
} from "@/lib/scheduler";

const SETTINGS_ID = "singleton";

export async function getSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;
  return prisma.settings.create({ data: { id: SETTINGS_ID } });
}

function parseUnavailable(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function loadEngineInput(): Promise<EngineInput> {
  const [settings, rooms, lecturers, cohorts, courses] = await Promise.all([
    getSettings(),
    prisma.room.findMany(),
    prisma.lecturer.findMany(),
    prisma.cohort.findMany(),
    prisma.course.findMany(),
  ]);

  return {
    grid: {
      daysCount: settings.daysCount,
      periodsPerDay: settings.periodsPerDay,
      lunchPeriod: settings.lunchPeriod,
    },
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      capacity: r.capacity,
      kind: r.kind as RoomKind,
    })),
    lecturers: lecturers.map((l) => ({
      id: l.id,
      name: l.title ? `${l.title} ${l.name}` : l.name,
      unavailable: parseUnavailable(l.unavailable),
    })),
    cohorts: cohorts.map((c) => ({ id: c.id, name: c.name, size: c.size })),
    courses: courses.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      sessionsPerWeek: c.sessionsPerWeek,
      sessionLength: c.sessionLength,
      requiresKind: (c.requiresKind as RoomKind | null) ?? null,
      lecturerId: c.lecturerId,
      cohortId: c.cohortId,
    })),
  };
}

export interface TimetableViewModel {
  settings: {
    daysCount: number;
    periodsPerDay: number;
    periodMinutes: number;
    dayStart: string;
    lunchPeriod: number | null;
  };
  entries: {
    id: string;
    courseCode: string;
    courseTitle: string;
    roomId: string;
    roomName: string;
    roomKind: string;
    lecturerId: string;
    lecturerName: string;
    cohortId: string;
    cohortName: string;
    cohortLevel: number;
    day: number;
    period: number;
    length: number;
  }[];
  groups: {
    cohorts: { id: string; name: string; level: number }[];
    lecturers: { id: string; name: string }[];
    rooms: { id: string; name: string }[];
  };
}

/** Build the grid view model (entries + filter groups) for a saved timetable. */
export async function loadTimetableView(timetableId: string): Promise<TimetableViewModel> {
  const [settings, assignments] = await Promise.all([
    getSettings(),
    prisma.assignment.findMany({
      where: { timetableId },
      include: {
        room: true,
        course: { include: { lecturer: true, cohort: true } },
      },
    }),
  ]);

  const entries = assignments.map((a) => ({
    id: a.id,
    courseCode: a.course.code,
    courseTitle: a.course.title,
    roomId: a.roomId,
    roomName: a.room.name,
    roomKind: a.room.kind,
    lecturerId: a.course.lecturerId,
    lecturerName: a.course.lecturer.title
      ? `${a.course.lecturer.title} ${a.course.lecturer.name}`
      : a.course.lecturer.name,
    cohortId: a.course.cohortId,
    cohortName: a.course.cohort.name,
    cohortLevel: a.course.cohort.level,
    day: a.day,
    period: a.period,
    length: a.length,
  }));

  const byId = <T extends { id: string }>(arr: T[]) => {
    const m = new Map<string, T>();
    for (const x of arr) m.set(x.id, x);
    return [...m.values()];
  };

  return {
    settings: {
      daysCount: settings.daysCount,
      periodsPerDay: settings.periodsPerDay,
      periodMinutes: settings.periodMinutes,
      dayStart: settings.dayStart,
      lunchPeriod: settings.lunchPeriod,
    },
    entries,
    groups: {
      cohorts: byId(entries.map((e) => ({ id: e.cohortId, name: e.cohortName, level: e.cohortLevel }))).sort(
        (a, b) => a.level - b.level,
      ),
      lecturers: byId(entries.map((e) => ({ id: e.lecturerId, name: e.lecturerName }))).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      rooms: byId(entries.map((e) => ({ id: e.roomId, name: e.roomName }))).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    },
  };
}

export interface RunOptions {
  name?: string;
  seed?: number;
  weights?: SoftWeights;
}

/** Generate a timetable and persist it as a new draft version. Returns its id. */
export async function runGeneration(opts: RunOptions = {}): Promise<string> {
  const input = await loadEngineInput();
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  const weights = opts.weights ?? DEFAULT_WEIGHTS;
  const result = generateTimetable(input, { seed, weights });

  const name =
    opts.name?.trim() ||
    `Timetable ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;

  const timetable = await prisma.timetable.create({
    data: {
      name,
      status: "draft",
      score: result.score.total,
      hardOk: result.hardOk,
      unplaced: JSON.stringify(result.unplaced),
      params: JSON.stringify({
        seed,
        weights,
        utilization: result.utilization,
        scoreBreakdown: result.score,
        scoreAfterConstruct: result.scoreAfterConstruct,
        elapsedMs: result.elapsedMs,
      }),
      assignments: {
        create: result.placements.map((p) => ({
          courseId: p.courseId,
          roomId: p.roomId,
          day: p.day,
          period: p.period,
          length: p.length,
        })),
      },
    },
  });

  return timetable.id;
}
