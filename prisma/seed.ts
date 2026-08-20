// Seed a realistic UNIJOS Computer Science dataset for Cadence, and pre-generate
// one published timetable so the shareable /t/[slug] view works out of the box.
//
// Run: npm run db:seed   (or npm run db:reset to wipe + reseed)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateTimetable, DEFAULT_WEIGHTS, type EngineInput, type RoomKind } from "../src/lib/scheduler";

const prisma = new PrismaClient();

const PASSWORD = "password123";

// Lunch is period index 4 (12:00–13:00) on a 08:00-start hourly grid.
const GRID = { daysCount: 5, periodsPerDay: 10, periodMinutes: 60, dayStart: "08:00", lunchPeriod: 4 };

// day-period unavailability helpers.
const allDay = (day: number) => Array.from({ length: GRID.periodsPerDay }, (_, p) => `${day}-${p}`);
const morningOf = (day: number) => [0, 1, 2].map((p) => `${day}-${p}`);

async function main() {
  console.log("Resetting Cadence tables…");
  await prisma.assignment.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.course.deleteMany();
  await prisma.cohort.deleteMany();
  await prisma.lecturer.deleteMany();
  await prisma.room.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();

  // --- admin (the project's author) ---
  await prisma.user.create({
    data: {
      fullName: "Adetunji Oluwatimilehin Solomon",
      email: "admin@cadence.edu",
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      role: "ADMIN",
    },
  });

  await prisma.settings.create({ data: { id: "singleton", ...GRID } });

  // --- department ---
  const csc = await prisma.department.create({
    data: { name: "Computer Science", code: "CSC" },
  });

  // --- rooms ---
  const roomDefs: { name: string; capacity: number; kind: RoomKind }[] = [
    { name: "Main Auditorium", capacity: 250, kind: "HALL" },
    { name: "Lecture Theatre 1", capacity: 150, kind: "HALL" },
    { name: "Lecture Theatre 2", capacity: 120, kind: "HALL" },
    { name: "Seminar Room A", capacity: 60, kind: "SEMINAR" },
    { name: "Seminar Room B", capacity: 60, kind: "SEMINAR" },
    { name: "Computer Lab 1", capacity: 120, kind: "LAB" },
    { name: "Computer Lab 2", capacity: 60, kind: "LAB" },
  ];
  const rooms = new Map<string, string>();
  for (const r of roomDefs) {
    const row = await prisma.room.create({ data: r });
    rooms.set(r.name, row.id);
  }

  // --- lecturers ---
  const lecturerDefs: { key: string; name: string; title: string; unavailable: string[] }[] = [
    { key: "oyerinde", name: "Oyeyinka Oyerinde", title: "Dr.", unavailable: allDay(4) }, // no Fridays
    { key: "ekong", name: "Grace Ekong", title: "Prof.", unavailable: [] },
    { key: "bello", name: "Musa Bello", title: "Dr.", unavailable: [] },
    { key: "okoro", name: "Chidi Okoro", title: "Mr.", unavailable: [] },
    { key: "sani", name: "Halima Sani", title: "Mrs.", unavailable: morningOf(0) }, // no Mon mornings
    { key: "afolabi", name: "Tunde Afolabi", title: "Dr.", unavailable: [] },
    { key: "nwosu", name: "Emeka Nwosu", title: "Mr.", unavailable: [] },
    { key: "balogun", name: "Ifeoma Balogun", title: "Dr.", unavailable: [] },
  ];
  const lecturers = new Map<string, string>();
  for (const l of lecturerDefs) {
    const row = await prisma.lecturer.create({
      data: {
        name: l.name,
        title: l.title,
        departmentId: csc.id,
        unavailable: JSON.stringify(l.unavailable),
      },
    });
    lecturers.set(l.key, row.id);
  }

  // --- cohorts ---
  const cohortDefs = [
    { key: "100", name: "CSC 100 Level", level: 100, size: 110 },
    { key: "200", name: "CSC 200 Level", level: 200, size: 90 },
    { key: "300", name: "CSC 300 Level", level: 300, size: 70 },
    { key: "400", name: "CSC 400 Level", level: 400, size: 55 },
  ];
  const cohorts = new Map<string, string>();
  for (const { key, ...c } of cohortDefs) {
    const row = await prisma.cohort.create({ data: { ...c, departmentId: csc.id } });
    cohorts.set(key, row.id);
  }

  // --- courses ---  [code, title, units, sessions/week, len, requiresKind, lecturerKey, cohortKey]
  type C = [string, string, number, number, number, RoomKind | null, string, string];
  const courseDefs: C[] = [
    // 100 Level
    ["CSC101", "Introduction to Computer Science", 3, 2, 1, "HALL", "oyerinde", "100"],
    ["CSC103", "Introduction to Problem Solving", 2, 2, 1, "HALL", "okoro", "100"],
    ["MTH101", "Elementary Mathematics I", 3, 2, 1, "HALL", "ekong", "100"],
    ["GST101", "Communication in English", 2, 1, 1, "HALL", "nwosu", "100"],
    ["PHY101", "General Physics I", 3, 2, 1, "HALL", "bello", "100"],
    ["CSC181", "Introductory Computing Laboratory", 1, 1, 2, "LAB", "okoro", "100"],
    // 200 Level
    ["CSC201", "Computer Programming I", 3, 2, 1, "HALL", "okoro", "200"],
    ["CSC203", "Discrete Structures", 3, 2, 1, "HALL", "oyerinde", "200"],
    ["CSC205", "Operating Systems I", 2, 2, 1, "HALL", "afolabi", "200"],
    ["MTH201", "Linear Algebra", 3, 2, 1, "HALL", "ekong", "200"],
    ["GST201", "Nigerian Peoples and Culture", 2, 1, 1, "HALL", "sani", "200"],
    ["CSC281", "Programming Laboratory", 1, 1, 2, "LAB", "nwosu", "200"],
    // 300 Level
    ["CSC301", "Data Structures and Algorithms", 3, 2, 1, "HALL", "oyerinde", "300"],
    ["CSC303", "Database Systems", 3, 2, 1, "HALL", "balogun", "300"],
    ["CSC305", "Computer Architecture", 2, 2, 1, "HALL", "bello", "300"],
    ["CSC307", "Software Engineering I", 3, 2, 1, "HALL", "afolabi", "300"],
    ["CSC309", "Web Technologies", 2, 2, 1, "LAB", "nwosu", "300"],
    ["CSC381", "Database Laboratory", 1, 1, 2, "LAB", "balogun", "300"],
    // 400 Level
    ["CSC401", "Artificial Intelligence", 3, 2, 1, "HALL", "oyerinde", "400"],
    ["CSC403", "Computer Networks", 3, 2, 1, "HALL", "bello", "400"],
    ["CSC405", "Compiler Construction", 2, 2, 1, "SEMINAR", "afolabi", "400"],
    ["CSC407", "Machine Learning", 3, 2, 1, "LAB", "oyerinde", "400"],
    ["GST401", "Entrepreneurship", 2, 1, 1, "HALL", "nwosu", "400"],
    ["CSC409", "Final Year Project", 1, 1, 2, "SEMINAR", "ekong", "400"],
  ];

  for (const [code, title, units, spw, len, kind, lec, coh] of courseDefs) {
    await prisma.course.create({
      data: {
        code,
        title,
        creditUnits: units,
        sessionsPerWeek: spw,
        sessionLength: len,
        requiresKind: kind,
        lecturerId: lecturers.get(lec)!,
        cohortId: cohorts.get(coh)!,
        departmentId: csc.id,
      },
    });
  }

  // --- pre-generate one published timetable ---
  const roomRows = await prisma.room.findMany();
  const lecturerRows = await prisma.lecturer.findMany();
  const cohortRows = await prisma.cohort.findMany();
  const courseRows = await prisma.course.findMany();

  const input: EngineInput = {
    grid: { daysCount: GRID.daysCount, periodsPerDay: GRID.periodsPerDay, lunchPeriod: GRID.lunchPeriod },
    rooms: roomRows.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity, kind: r.kind as RoomKind })),
    lecturers: lecturerRows.map((l) => ({
      id: l.id,
      name: l.title ? `${l.title} ${l.name}` : l.name,
      unavailable: JSON.parse(l.unavailable) as string[],
    })),
    cohorts: cohortRows.map((c) => ({ id: c.id, name: c.name, size: c.size })),
    courses: courseRows.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      sessionsPerWeek: c.sessionsPerWeek,
      sessionLength: c.sessionLength,
      requiresKind: c.requiresKind as RoomKind | null,
      lecturerId: c.lecturerId,
      cohortId: c.cohortId,
    })),
  };

  const result = generateTimetable(input, { seed: 42, weights: DEFAULT_WEIGHTS });

  await prisma.timetable.create({
    data: {
      name: "First Semester 2025/2026",
      status: "published",
      publicSlug: "csc-first-semester",
      score: result.score.total,
      hardOk: result.hardOk,
      unplaced: JSON.stringify(result.unplaced),
      params: JSON.stringify({
        seed: 42,
        weights: DEFAULT_WEIGHTS,
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

  console.log("Seeded Cadence:");
  console.log(`  admin@cadence.edu / ${PASSWORD}`);
  console.log(`  ${courseDefs.length} courses, ${result.placements.length}/${result.utilization.totalEvents} events placed`);
  console.log(`  hard OK: ${result.hardOk}, soft score: ${result.score.total} (construct ${result.scoreAfterConstruct})`);
  console.log(`  room occupancy: ${result.utilization.roomOccupancyPct}%`);
  console.log(`  published timetable: /t/csc-first-semester`);
  if (result.unplaced.length) console.log("  unplaced:", result.unplaced);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
