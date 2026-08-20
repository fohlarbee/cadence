"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ROOM_KINDS } from "@/lib/scheduler";

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}
function int(fd: FormData, k: string, fallback = 0): number {
  const n = parseInt(String(fd.get(k) ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}
function roomKind(v: string): string {
  return (ROOM_KINDS as string[]).includes(v) ? v : "HALL";
}

// --- Departments ---
export async function createDepartment(fd: FormData) {
  await requireUser();
  const name = str(fd, "name");
  const code = str(fd, "code").toUpperCase();
  if (!name || !code) return;
  await prisma.department.create({ data: { name, code } });
  revalidatePath("/settings");
}
export async function deleteDepartment(fd: FormData) {
  await requireUser();
  await prisma.department.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/settings");
}

// --- Rooms ---
export async function createRoom(fd: FormData) {
  await requireUser();
  const name = str(fd, "name");
  if (!name) return;
  await prisma.room.create({
    data: { name, capacity: Math.max(1, int(fd, "capacity", 30)), kind: roomKind(str(fd, "kind")) },
  });
  revalidatePath("/manage/rooms");
}
export async function deleteRoom(fd: FormData) {
  await requireUser();
  await prisma.room.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/manage/rooms");
}

// --- Cohorts ---
export async function createCohort(fd: FormData) {
  await requireUser();
  const name = str(fd, "name");
  const departmentId = str(fd, "departmentId");
  if (!name || !departmentId) return;
  await prisma.cohort.create({
    data: {
      name,
      level: Math.max(0, int(fd, "level", 100)),
      size: Math.max(1, int(fd, "size", 40)),
      departmentId,
    },
  });
  revalidatePath("/manage/cohorts");
}
export async function deleteCohort(fd: FormData) {
  await requireUser();
  await prisma.cohort.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/manage/cohorts");
}

// --- Lecturers ---
export async function createLecturer(fd: FormData) {
  await requireUser();
  const name = str(fd, "name");
  const departmentId = str(fd, "departmentId");
  if (!name || !departmentId) return;
  await prisma.lecturer.create({
    data: { name, title: str(fd, "title") || null, departmentId, unavailable: "[]" },
  });
  revalidatePath("/manage/lecturers");
}
export async function deleteLecturer(fd: FormData) {
  await requireUser();
  await prisma.lecturer.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/manage/lecturers");
}
/** Save a lecturer's unavailable slots (array of "day-period"). */
export async function setLecturerAvailability(id: string, slots: string[]) {
  await requireUser();
  await prisma.lecturer.update({
    where: { id },
    data: { unavailable: JSON.stringify(slots) },
  });
  revalidatePath("/manage/lecturers");
}

// --- Courses ---
export async function createCourse(fd: FormData) {
  await requireUser();
  const code = str(fd, "code").toUpperCase();
  const title = str(fd, "title");
  const lecturerId = str(fd, "lecturerId");
  const cohortId = str(fd, "cohortId");
  if (!code || !title || !lecturerId || !cohortId) return;
  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
  if (!cohort) return;
  const kind = str(fd, "requiresKind");
  await prisma.course.create({
    data: {
      code,
      title,
      creditUnits: Math.max(1, int(fd, "creditUnits", 3)),
      sessionsPerWeek: Math.max(1, int(fd, "sessionsPerWeek", 2)),
      sessionLength: Math.max(1, int(fd, "sessionLength", 1)),
      requiresKind: kind === "ANY" || kind === "" ? null : roomKind(kind),
      lecturerId,
      cohortId,
      departmentId: cohort.departmentId,
    },
  });
  revalidatePath("/manage/courses");
}
export async function deleteCourse(fd: FormData) {
  await requireUser();
  await prisma.course.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/manage/courses");
}

// --- Settings (grid config) ---
export async function saveSettings(fd: FormData) {
  await requireUser();
  const lunchRaw = str(fd, "lunchPeriod");
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {
      daysCount: Math.min(7, Math.max(1, int(fd, "daysCount", 5))),
      periodsPerDay: Math.min(16, Math.max(1, int(fd, "periodsPerDay", 10))),
      periodMinutes: Math.max(15, int(fd, "periodMinutes", 60)),
      dayStart: str(fd, "dayStart") || "08:00",
      lunchPeriod: lunchRaw === "" ? null : int(fd, "lunchPeriod", 4),
    },
    create: {
      id: "singleton",
      daysCount: Math.min(7, Math.max(1, int(fd, "daysCount", 5))),
      periodsPerDay: Math.min(16, Math.max(1, int(fd, "periodsPerDay", 10))),
      periodMinutes: Math.max(15, int(fd, "periodMinutes", 60)),
      dayStart: str(fd, "dayStart") || "08:00",
      lunchPeriod: lunchRaw === "" ? null : int(fd, "lunchPeriod", 4),
    },
  });
  revalidatePath("/settings");
}
