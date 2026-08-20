"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { runGeneration } from "@/lib/schedule-service";
import { DEFAULT_WEIGHTS, type SoftWeights } from "@/lib/scheduler";

function weightsFrom(fd: FormData): SoftWeights {
  const num = (k: keyof SoftWeights) => {
    const n = parseInt(String(fd.get(k) ?? ""), 10);
    return Number.isFinite(n) ? n : DEFAULT_WEIGHTS[k];
  };
  return {
    cohortGap: num("cohortGap"),
    courseSpread: num("courseSpread"),
    lecturerGap: num("lecturerGap"),
    edgeOfDay: num("edgeOfDay"),
  };
}

export async function generateAction(fd: FormData) {
  await requireUser();
  const name = String(fd.get("name") ?? "").trim();
  const seedRaw = String(fd.get("seed") ?? "").trim();
  const seed = seedRaw === "" ? undefined : parseInt(seedRaw, 10);
  const id = await runGeneration({ name, seed, weights: weightsFrom(fd) });
  revalidatePath("/timetables");
  redirect(`/timetable/${id}`);
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "timetable";

export async function publishAction(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  const tt = await prisma.timetable.findUnique({ where: { id } });
  if (!tt) return;
  let slug = tt.publicSlug ?? slugify(tt.name);
  // Ensure uniqueness against other timetables.
  const clash = await prisma.timetable.findFirst({
    where: { publicSlug: slug, NOT: { id } },
  });
  if (clash) slug = `${slug}-${id.slice(0, 5)}`;
  await prisma.timetable.update({
    where: { id },
    data: { status: "published", publicSlug: slug },
  });
  revalidatePath(`/timetable/${id}`);
  revalidatePath("/timetables");
}

export async function unpublishAction(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  await prisma.timetable.update({ where: { id }, data: { status: "draft" } });
  revalidatePath(`/timetable/${id}`);
  revalidatePath("/timetables");
}

export async function deleteTimetable(fd: FormData) {
  await requireUser();
  await prisma.timetable.delete({ where: { id: String(fd.get("id") ?? "") } });
  revalidatePath("/timetables");
  redirect("/timetables");
}
