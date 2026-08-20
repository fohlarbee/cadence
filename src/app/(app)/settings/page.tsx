import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/schedule-service";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveSettings, createDepartment, deleteDepartment } from "@/app/actions/data";

export default async function SettingsPage() {
  await requireUser();
  const [settings, departments] = await Promise.all([
    getSettings(),
    prisma.department.findMany({ include: { _count: { select: { courses: true } } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="rise mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted">The weekly grid and departments.</p>
      </div>

      <Card>
        <CardTitle>Weekly grid</CardTitle>
        <CardDescription className="mt-1 mb-4">
          Defines the days and time periods the engine schedules into.
        </CardDescription>
        <form action={saveSettings} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="daysCount">Days per week</Label>
            <Input id="daysCount" name="daysCount" type="number" min={1} max={7} defaultValue={settings.daysCount} />
          </div>
          <div>
            <Label htmlFor="periodsPerDay">Periods per day</Label>
            <Input
              id="periodsPerDay"
              name="periodsPerDay"
              type="number"
              min={1}
              max={16}
              defaultValue={settings.periodsPerDay}
            />
          </div>
          <div>
            <Label htmlFor="dayStart">Day starts</Label>
            <Input id="dayStart" name="dayStart" type="time" defaultValue={settings.dayStart} />
          </div>
          <div>
            <Label htmlFor="periodMinutes">Minutes per period</Label>
            <Input
              id="periodMinutes"
              name="periodMinutes"
              type="number"
              min={15}
              step={5}
              defaultValue={settings.periodMinutes}
            />
          </div>
          <div>
            <Label htmlFor="lunchPeriod">Lunch period index (blank = none)</Label>
            <Input
              id="lunchPeriod"
              name="lunchPeriod"
              type="number"
              min={0}
              defaultValue={settings.lunchPeriod ?? ""}
              placeholder="e.g. 4"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit">Save grid</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Departments</CardTitle>
        <CardDescription className="mt-1 mb-4">
          Cohorts, lecturers and courses belong to a department.
        </CardDescription>
        <form action={createDepartment} className="mb-4 grid gap-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Computer Science" required />
          </div>
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" placeholder="CSC" required />
          </div>
          <Button type="submit">Add</Button>
        </form>

        <ul className="divide-y divide-hairline">
          {departments.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-3 text-sm">
              <span>
                <span className="font-medium">{d.name}</span>{" "}
                <span className="text-muted">({d.code})</span>
              </span>
              <span className="flex items-center gap-4">
                <span className="text-xs text-faint">{d._count.courses} courses</span>
                <form action={deleteDepartment}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="text-xs text-muted hover:text-alert">Delete</button>
                </form>
              </span>
            </li>
          ))}
          {departments.length === 0 && (
            <li className="py-6 text-center text-muted">No departments yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
