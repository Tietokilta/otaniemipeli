"use client";
import { turnStatus, turnStatusText } from "@/utils/turns";
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

export function TurnStatus({ turn }: { turn: Turn }): JSX.Element {
  const [, rerender] = useState<unknown>({});

  // Force re-render every second
  useEffect(() => {
    const id = window.setInterval(() => rerender({}), 1000);
    return () => clearInterval(id);
  }, []);

  const startTs = dateFromDb(turn.start_time).getTime();
  if (Number.isNaN(startTs)) return <p>Virheellistä dataa</p>;

  if (turn.end_time) {
    const endTs = dateFromDb(turn.end_time).getTime();
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
      <p>{turnStatusText(turn)}</p>
      <p>Vuoro alkoi {elapsed} sitten</p>
    </>
  );
}
