"use client";

import { useFormStatus } from "react-dom";
import { generateAction } from "@/app/actions/timetable";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEFAULT_WEIGHTS } from "@/lib/scheduler";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Optimizing…" : "Generate timetable"}
    </Button>
  );
}

const WEIGHTS: { key: keyof typeof DEFAULT_WEIGHTS; label: string; hint: string }[] = [
  { key: "cohortGap", label: "Cohort gaps", hint: "Compact each class's day" },
  { key: "courseSpread", label: "Course spread", hint: "Avoid a course twice a day" },
  { key: "lecturerGap", label: "Lecturer gaps", hint: "Compact each lecturer's day" },
  { key: "edgeOfDay", label: "Edge of day", hint: "Avoid first/last periods" },
];

export function GenerateForm() {
  return (
    <form action={generateAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="First Semester 2025/2026" />
        </div>
        <div>
          <Label htmlFor="seed">Seed (optional)</Label>
          <Input id="seed" name="seed" type="number" placeholder="random" />
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
          Optimization priorities
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WEIGHTS.map((w) => (
            <div key={w.key} className="rounded-xl border border-hairline bg-surface p-4">
              <Label htmlFor={w.key}>{w.label}</Label>
              <Input
                id={w.key}
                name={w.key}
                type="number"
                min={0}
                max={20}
                defaultValue={DEFAULT_WEIGHTS[w.key]}
              />
              <p className="mt-2 text-[11px] text-faint">{w.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
