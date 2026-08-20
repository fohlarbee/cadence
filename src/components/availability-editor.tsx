"use client";

import { useMemo, useState, useTransition } from "react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setLecturerAvailability } from "@/app/actions/data";
import { dayShort, periodLabel, type GridSettings } from "@/lib/timegrid";

interface LecturerLite {
  id: string;
  name: string;
  unavailable: string[];
}

export function AvailabilityEditor({
  lecturers,
  settings,
}: {
  lecturers: LecturerLite[];
  settings: GridSettings;
}) {
  const [selected, setSelected] = useState(lecturers[0]?.id ?? "");
  const initial = useMemo(
    () => new Set(lecturers.find((l) => l.id === selected)?.unavailable ?? []),
    [lecturers, selected],
  );
  const [blocked, setBlocked] = useState<Set<string>>(initial);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  // Reset local state when the selected lecturer changes.
  const [lastSelected, setLastSelected] = useState(selected);
  if (lastSelected !== selected) {
    setLastSelected(selected);
    setBlocked(initial);
    setDirty(false);
    setSaved(false);
  }

  if (lecturers.length === 0) return null;

  const days = Array.from({ length: settings.daysCount }, (_, i) => i);
  const periods = Array.from({ length: settings.periodsPerDay }, (_, i) => i);

  function toggle(day: number, period: number) {
    const key = `${day}-${period}`;
    const next = new Set(blocked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setBlocked(next);
    setDirty(true);
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      await setLecturerAvailability(selected, [...blocked]);
      setDirty(false);
      setSaved(true);
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="h-10 max-w-xs"
        >
          {lecturers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <p className="text-sm text-muted">Tap a slot to mark it unavailable.</p>
        <div className="ml-auto flex items-center gap-3">
          {saved && !dirty && <span className="text-xs text-success">Saved ✓</span>}
          <Button size="sm" onClick={save} disabled={!dirty || pending}>
            {pending ? "Saving…" : "Save availability"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-16 p-2 text-left text-xs uppercase tracking-wide text-muted">Time</th>
              {days.map((d) => (
                <th key={d} className="p-2 text-center font-medium">
                  {dayShort(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => {
              const isLunch = p === settings.lunchPeriod;
              const { start } = periodLabel(p, settings);
              return (
                <tr key={p}>
                  <td className="p-1 text-right text-xs text-faint">{start}</td>
                  {days.map((d) => {
                    if (isLunch) {
                      return (
                        <td key={d} className="p-1">
                          <div className="h-8 rounded-md bg-surface-2" />
                        </td>
                      );
                    }
                    const key = `${d}-${p}`;
                    const off = blocked.has(key);
                    return (
                      <td key={d} className="p-1">
                        <button
                          type="button"
                          onClick={() => toggle(d, p)}
                          className={`h-8 w-full rounded-md border text-xs transition-colors ${
                            off
                              ? "border-alert/40 bg-alert/10 text-alert"
                              : "border-hairline bg-surface hover:border-primary/50"
                          }`}
                          aria-pressed={off}
                        >
                          {off ? "✕" : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
