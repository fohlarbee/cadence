import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCohort, deleteCohort } from "@/app/actions/data";

export default async function CohortsPage() {
  await requireUser();
  const [cohorts, departments] = await Promise.all([
    prisma.cohort.findMany({ include: { department: true }, orderBy: { level: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Cohorts</h1>
        <p className="mt-1 text-sm text-muted">
          Student groups that move together — two of a cohort&apos;s courses can never clash.
        </p>
      </div>

      {departments.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Add a department in{" "}
            <a href="/settings" className="text-primary hover:underline">
              Settings
            </a>{" "}
            before creating cohorts.
          </p>
        </Card>
      ) : (
        <Card>
          <CardTitle className="mb-4">Add a cohort</CardTitle>
          <form
            action={createCohort}
            className="grid gap-4 sm:grid-cols-[1fr_120px_120px_1fr_auto] sm:items-end"
          >
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="CSC 200 Level" required />
            </div>
            <div>
              <Label htmlFor="level">Level</Label>
              <Input id="level" name="level" type="number" min={0} step={100} defaultValue={100} />
            </div>
            <div>
              <Label htmlFor="size">Size</Label>
              <Input id="size" name="size" type="number" min={1} defaultValue={60} />
            </div>
            <div>
              <Label htmlFor="departmentId">Department</Label>
              <Select id="departmentId" name="departmentId" defaultValue={departments[0].id}>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Add</Button>
          </form>
        </Card>
      )}

      <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
              <th className="p-4">Cohort</th>
              <th className="p-4">Level</th>
              <th className="p-4">Size</th>
              <th className="p-4">Department</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.id} className="border-b border-hairline last:border-0">
                <td className="p-4 font-medium">{c.name}</td>
                <td className="p-4 text-muted">{c.level}</td>
                <td className="p-4 text-muted">{c.size}</td>
                <td className="p-4 text-muted">{c.department.code}</td>
                <td className="p-4 text-right">
                  <form action={deleteCohort}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="text-xs text-muted hover:text-alert">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {cohorts.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted">
                  No cohorts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
