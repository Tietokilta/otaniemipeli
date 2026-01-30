"use client";
import { useEffect, useMemo, useState } from "react";

export function dateFromDb(iso: string): Date {
  // trims extra fractional seconds, keeps timezone
  return new Date(iso.replace(/\.(\d{3})\d+/, ".$1"));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDurationMs(ms: number) {
  let diff = ms;
  if (diff < 0) diff = 0;

  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  let timeString = "";
  if (days > 0) timeString += `${pad2(days)} päivää `;
  if (hours > 0 || days > 0) timeString += `${pad2(hours)} tuntia `;
  if (minutes > 0 || hours > 0 || days > 0)
    timeString += `${pad2(minutes)} minuuttia ja `;
  timeString += `${pad2(seconds)} sekuntia`;

  return timeString;
}

export function formatShortDurationMs(ms: number) {
  const d = new Date(ms);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

export function formatClockTimeMs(ts: number) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function formatTurnLabel(
  startIso: string,
  endIso?: string | null,
): JSX.Element {
  const startTs = dateFromDb(startIso).getTime();
  if (Number.isNaN(startTs)) return <p>Virheellistä dataa</p>;

  if (endIso) {
    const endTs = dateFromDb(endIso).getTime();
    if (Number.isNaN(endTs)) return <p>Virheellistä dataa</p>;

    const elapsed = formatShortDurationMs(Date.now() - endTs);
    const dur = formatShortDurationMs(endTs - startTs);
    return (
      <>
        <p className="text-quaternary-500">Valmiina! ({elapsed})</p>
        <p>Vuoro kesti: {dur}</p>
      </>
    );
  }
  const elapsed = formatShortDurationMs(Date.now() - startTs);
  return (
    <>
      <p>Suoritus käynnissä</p>
      <p>Vuoro alkoi {elapsed} sitten</p>
    </>
  );
}

export function TurnElapsed({
  start,
  end,
}: {
  start: string;
  end?: string | null;
}): JSX.Element {
  const [, rerender] = useState<unknown>({});

  // Force re-render every second
  useEffect(() => {
    const id = window.setInterval(() => rerender({}), 1000);
    return () => clearInterval(id);
  }, [start, end]);

  return <span>{formatTurnLabel(start, end)}</span>;
}
