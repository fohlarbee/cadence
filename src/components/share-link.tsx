"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ShareLink({ slug }: { slug: string }) {
  const [url, setUrl] = useState(`/t/${slug}`);
  const [copied, setCopied] = useState(false);

  // Resolve the absolute URL on the client to avoid a hydration mismatch.
  useEffect(() => {
    setUrl(`${window.location.origin}/t/${slug}`);
  }, [slug]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard blocked (e.g. insecure context) — fall back to selecting it.
      const el = document.getElementById("share-url") as HTMLInputElement | null;
      el?.select();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary-tint/50 p-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔗</span>
        <h2 className="font-display font-semibold">Public share link</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Anyone with this link can view the timetable — no login needed. Students and
        lecturers can filter it by cohort, lecturer or room, and print it.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          id="share-url"
          readOnly
          value={url}
          onClick={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-xl border border-hairline bg-surface px-4 font-mono text-sm text-fg h-11"
        />
        <div className="flex gap-2">
          <Button onClick={copy} className="flex-1 sm:flex-none">
            {copied ? "Copied ✓" : "Copy link"}
          </Button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full">
              Open ↗
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
