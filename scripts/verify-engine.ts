// Standalone engine check — no database. Builds a synthetic department, generates
// a timetable, and asserts the Cadence Engine's guarantees.
//
// Run: npm run verify:engine

import {
  generateTimetable,
  findHardViolations,
  DEFAULT_WEIGHTS,
  type EngineInput,
  type RoomKind,
} from "../src/lib/scheduler";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

function buildInput(): EngineInput {
  const rooms = [
    { id: "r1", name: "Hall A", capacity: 200, kind: "HALL" as RoomKind },
    { id: "r2", name: "Hall B", capacity: 120, kind: "HALL" as RoomKind },
    { id: "r3", name: "Seminar", capacity: 60, kind: "SEMINAR" as RoomKind },
    { id: "r4", name: "Lab", capacity: 120, kind: "LAB" as RoomKind },
  ];
  const lecturers = [
    { id: "l1", name: "Dr. A", unavailable: ["4-0", "4-1", "4-2", "4-3", "4-5", "4-6", "4-7", "4-8", "4-9"] },
    { id: "l2", name: "Prof. B", unavailable: [] },
    { id: "l3", name: "Mr. C", unavailable: ["0-0", "0-1", "0-2"] },
    { id: "l4", name: "Dr. D", unavailable: [] },
  ];
  const cohorts = [
    { id: "c1", name: "100L", size: 110 },
    { id: "c2", name: "200L", size: 90 },
    { id: "c3", name: "300L", size: 55 },
  ];
  const lecIds = ["l1", "l2", "l3", "l4"];
  const courses = [];
  let n = 0;
  for (const c of cohorts) {
    for (let i = 0; i < 6; i++) {
      const lab = i === 5;
      courses.push({
        id: `co${n}`,
        code: `C${n}`,
        title: `Course ${n}`,
        sessionsPerWeek: lab ? 1 : 2,
        sessionLength: lab ? 2 : 1,
        requiresKind: (lab ? "LAB" : null) as RoomKind | null,
        lecturerId: lecIds[(i + n) % lecIds.length],
        cohortId: c.id,
      });
      n++;
    }
  }
  return { grid: { daysCount: 5, periodsPerDay: 10, lunchPeriod: 4 }, rooms, lecturers, cohorts, courses };
}

const input = buildInput();
const a = generateTimetable(input, { seed: 123, weights: DEFAULT_WEIGHTS });
const b = generateTimetable(input, { seed: 123, weights: DEFAULT_WEIGHTS });

console.log(
  `\nGenerated: ${a.utilization.placedEvents}/${a.utilization.totalEvents} events, ` +
    `room use ${a.utilization.roomOccupancyPct}%, score ${a.score.total} ` +
    `(construct ${a.scoreAfterConstruct}), ${a.elapsedMs}ms\n`,
);

const violations = findHardViolations(a.placements, input);
check("no hard violations among placements", violations.length === 0, violations.slice(0, 3).join("; "));
check("all events placed (feasible dataset)", a.unplaced.length === 0, JSON.stringify(a.unplaced));
check(
  "optimizer improved or held the soft score",
  a.score.total <= a.scoreAfterConstruct,
  `${a.scoreAfterConstruct} → ${a.score.total}`,
);
check(
  "deterministic across runs with the same seed",
  JSON.stringify(a.placements) === JSON.stringify(b.placements) && a.score.total === b.score.total,
);

// No class occupies the lunch period.
const lunchHit = a.placements.some((p) => p.period <= 4 && p.period + p.length > 4);
check("no class crosses the lunch break", !lunchHit);

// Lecturer availability respected.
const expand = new Map(input.courses.map((c) => [c.id, c]));
const unavail = new Map(input.lecturers.map((l) => [l.id, new Set(l.unavailable)]));
let availBad = 0;
for (const p of a.placements) {
  const course = expand.get(p.courseId)!;
  const set = unavail.get(course.lecturerId)!;
  for (let i = 0; i < p.length; i++) if (set.has(`${p.day}-${p.period + i}`)) availBad++;
}
check("lecturer availability respected", availBad === 0, `${availBad} violations`);

// Room capacity & kind respected.
const roomById = new Map(input.rooms.map((r) => [r.id, r]));
const cohortById = new Map(input.cohorts.map((c) => [c.id, c]));
let capBad = 0;
for (const p of a.placements) {
  const course = expand.get(p.courseId)!;
  const room = roomById.get(p.roomId)!;
  const size = cohortById.get(course.cohortId)!.size;
  if (room.capacity < size) capBad++;
  if (course.requiresKind && room.kind !== course.requiresKind) capBad++;
}
check("room capacity & type respected", capBad === 0, `${capBad} violations`);

// A structurally impossible course is reported with a reason.
const broken: EngineInput = {
  ...input,
  courses: [
    ...input.courses,
    {
      id: "impossible",
      code: "IMP",
      title: "Needs a huge lab",
      sessionsPerWeek: 1,
      sessionLength: 1,
      requiresKind: "LAB",
      lecturerId: "l2",
      cohortId: "c1", // 110 students, only lab capacity is 120 -> fits; make it fail via kind+size
    },
  ],
  cohorts: input.cohorts.map((c) => (c.id === "c1" ? { ...c, size: 500 } : c)),
};
const bad = generateTimetable(broken, { seed: 1, weights: DEFAULT_WEIGHTS });
check(
  "impossible course reported with a reason",
  bad.unplaced.some((u) => u.reason.length > 0),
  bad.unplaced.map((u) => `${u.courseCode}: ${u.reason}`).join(" | "),
);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
