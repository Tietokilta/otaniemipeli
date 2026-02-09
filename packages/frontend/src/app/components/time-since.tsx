"use client";
import { useEffect, useState } from "react";

export function dateFromDb(iso: string): Date {
  // trims extra fractional seconds, keeps timezone
  return new Date(iso.replace(/\.(\d{3})\d+/, ".$1"));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatShortDurationMs(ms: number) {
  const d = new Date(ms);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

export function formatClockTimeMs(ts: number) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function TimeSince({
  timestamp,
  warnSec,
}: {
  timestamp: string;
  warnSec?: number;
}): JSX.Element {
  const [now, setNow] = useState(() => Date.now());

  // Force re-render every second
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const date = dateFromDb(timestamp);
  const elapsedMs = now - date.getTime();
  const elapsed = formatShortDurationMs(elapsedMs);

  const warn = warnSec !== undefined && elapsedMs > warnSec * 1000;

  return warn ? <em>{elapsed}</em> : <>{elapsed}</>;
}
