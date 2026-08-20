import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createRoom, deleteRoom } from "@/app/actions/data";
import { ROOM_KIND_LABEL } from "@/lib/timegrid";

export default async function RoomsPage() {
  await requireUser();
  const rooms = await prisma.room.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] });

  return (
    <div className="rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Rooms</h1>
        <p className="mt-1 text-sm text-muted">
          Lecture halls, laboratories and seminar rooms available for scheduling.
        </p>
      </div>

      <Card>
        <CardTitle className="mb-4">Add a room</CardTitle>
        <form
          action={createRoom}
          className="grid gap-4 sm:grid-cols-[1fr_140px_180px_auto] sm:items-end"
        >
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Lecture Theatre 1" required />
          </div>
          <div>
            <Label htmlFor="capacity">Capacity</Label>
            <Input id="capacity" name="capacity" type="number" min={1} defaultValue={60} required />
          </div>
          <div>
            <Label htmlFor="kind">Type</Label>
            <Select id="kind" name="kind" defaultValue="HALL">
              <option value="HALL">Lecture hall</option>
              <option value="LAB">Laboratory</option>
              <option value="SEMINAR">Seminar room</option>
            </Select>
          </div>
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
              <th className="p-4">Name</th>
              <th className="p-4">Type</th>
              <th className="p-4">Capacity</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id} className="border-b border-hairline last:border-0">
                <td className="p-4 font-medium">{r.name}</td>
                <td className="p-4 text-muted">{ROOM_KIND_LABEL[r.kind] ?? r.kind}</td>
                <td className="p-4 text-muted">{r.capacity}</td>
                <td className="p-4 text-right">
                  <form action={deleteRoom}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-xs text-muted hover:text-alert">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted">
                  No rooms yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
