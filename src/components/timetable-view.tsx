"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { dayShort, periodLabel, spanLabel, type GridSettings } from "@/lib/timegrid";

export interface TimetableEntry {
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
}

export interface TimetableGroups {
  cohorts: { id: string; name: string; level: number }[];
  lecturers: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
}

type ViewBy = "cohort" | "lecturer" | "room";

const levelClass = (level: number) =>
  level >= 400 ? "cell-400" : level >= 300 ? "cell-300" : level >= 200 ? "cell-200" : "cell-100";

export function TimetableView({
  title,
  settings,
  entries,
  groups,
}: {
  title: string;
  settings: GridSettings;
  entries: TimetableEntry[];
  groups: TimetableGroups;
}) {
  const [viewBy, setViewBy] = useState<ViewBy>("cohort");
  const options =
    viewBy === "cohort" ? groups.cohorts : viewBy === "lecturer" ? groups.lecturers : groups.rooms;
  const [selectedId, setSelectedId] = useState<string>(options[0]?.id ?? "");

  // Keep a valid selection when the view axis changes.
  const currentOptions = options;
  const active = currentOptions.some((o) => o.id === selectedId)
    ? selectedId
    : currentOptions[0]?.id ?? "";

  const filtered = useMemo(
    () =>
      entries.filter((e) =>
        viewBy === "cohort"
          ? e.cohortId === active
          : viewBy === "lecturer"
            ? e.lecturerId === active
            : e.roomId === active,
      ),
    [entries, viewBy, active],
  );

  const startMap = useMemo(() => {
    const m = new Map<string, TimetableEntry>();
    for (const e of filtered) m.set(`${e.day}:${e.period}`, e);
    return m;
  }, [filtered]);

  const days = Array.from({ length: settings.daysCount }, (_, i) => i);
  const periods = Array.from({ length: settings.periodsPerDay }, (_, i) => i);
  const covered = new Set<string>();

  const activeName = currentOptions.find((o) => o.id === active)?.name ?? "";

  function exportCsv() {
    const rows = [["Day", "Start", "End", "Code", "Course", "Room", "Lecturer", "Cohort"]];
    for (const e of [...filtered].sort((a, b) => a.day - b.day || a.period - b.period)) {
      const { start } = periodLabel(e.period, settings);
      const end = periodLabel(e.period + e.length - 1, settings).end;
      rows.push([
        dayShort(e.day),
        start,
        end,
        e.courseCode,
        e.courseTitle,
        e.roomName,
        e.lecturerName,
        e.cohortName,
      ]);
    }
    const csv = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}-${activeName}`.replace(/\s+/g, "_") + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-hairline bg-surface p-1">
          {(["cohort", "lecturer", "room"] as ViewBy[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewBy(v)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
                viewBy === v ? "bg-primary text-white" : "text-muted hover:text-fg"
              }`}
            >
              By {v}
            </button>
          ))}
        </div>

        <Select
          value={active}
          onChange={(e) => setSelectedId(e.target.value)}
          className="h-10 max-w-xs"
        >
          {currentOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
      </div>

      <div className="mb-3 hidden print:block">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted">{activeName}</p>
      </div>

      <div className="timetable-grid overflow-x-auto rounded-2xl border border-hairline bg-surface">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-24 border-b border-hairline p-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                Time
              </th>
              {days.map((d) => (
                <th
                  key={d}
                  className="border-b border-l border-hairline p-3 text-left font-display font-semibold"
                >
                  {dayShort(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => {
              if (p === settings.lunchPeriod) {
                const { start, end } = periodLabel(p, settings);
                return (
                  <tr key={p}>
                    <td className="border-t border-hairline p-2 text-right align-top text-xs text-faint">
                      {start}
                    </td>
                    <td
                      colSpan={settings.daysCount}
                      className="border-t border-l border-hairline bg-surface-2 p-2 text-center text-xs font-medium uppercase tracking-wide text-muted"
                    >
                      Lunch break · {start}–{end}
                    </td>
                  </tr>
                );
              }
              const { start } = periodLabel(p, settings);
              return (
                <tr key={p}>
                  <td className="border-t border-hairline p-2 text-right align-top text-xs text-faint">
                    {start}
                  </td>
                  {days.map((d) => {
                    const key = `${d}:${p}`;
                    if (covered.has(key)) return null;
                    const entry = startMap.get(key);
                    if (!entry) {
                      return (
                        <td key={d} className="border-t border-l border-hairline p-1 align-top" />
                      );
                    }
                    for (let i = 1; i < entry.length; i++) covered.add(`${d}:${p + i}`);
                    const isLab = entry.roomKind === "LAB";
                    return (
                      <td
                        key={d}
                        rowSpan={entry.length}
                        className="border-t border-l border-hairline p-1 align-top"
                      >
                        <div
                          className={`h-full rounded-lg border p-2 ${levelClass(entry.cohortLevel)} ${
                            isLab ? "cell-lab" : ""
                          }`}
                        >
                          <div className="font-mono text-xs font-semibold">{entry.courseCode}</div>
                          <div className="mt-0.5 text-xs leading-tight">{entry.courseTitle}</div>
                          <div className="mt-1 text-[11px] opacity-80">
                            {viewBy !== "room" && <>📍 {entry.roomName}</>}
                            {viewBy === "room" && <>{entry.cohortName}</>}
                          </div>
                          <div className="text-[11px] opacity-80">
                            {viewBy !== "lecturer" ? entry.lecturerName : entry.cohortName}
                          </div>
                          <div className="mt-0.5 text-[10px] opacity-70">
                            {spanLabel(entry.period, entry.length, settings)}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted">
          No classes scheduled for {activeName}.
        </p>
      )}
    </div>
  );
}
