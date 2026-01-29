import React from "react";

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

function formatClockTimeMs(ts: number) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function formatTurnLabel(
  startIso: string,
  endIso?: string,
): JSX.Element {
  const startTs = dateFromDb(startIso).getTime();
  if (Number.isNaN(startTs))
    return (
      <>
        <p>Vuoro päättyi</p> <p>(virheellinen aika)</p>
      </>
    );

  if (endIso) {
    const endTs = dateFromDb(endIso).getTime();
    if (Number.isNaN(endTs))
      return (
        <>
          <p>Vuoro päättyi</p> <p>(virheellinen aika)</p>
        </>
      );

    const dur = formatDurationMs(endTs - startTs);
    const endClock = formatClockTimeMs(endTs);
    return (
      <>
        <p>Vuoro kesti {dur}</p>
        <p>(päättyi {endClock})</p>
      </>
    );
  }
  const dur = formatDurationMs(Date.now() - startTs);
  return (
    <>
      <p>Vuoro alkoi {dur} sitten</p>
      <p>Vuoro käynnissä</p>
    </>
  );
}

export function TurnElapsed({
  iso,
  end,
}: {
  iso: string;
  end?: string;
}): JSX.Element {
  const [label, setLabel] = React.useState(() => formatTurnLabel(iso, end));

  React.useEffect(() => {
    if (end) {
      setLabel(formatTurnLabel(iso, end));
      return;
    }

    const id = window.setInterval(() => {
      setLabel(formatTurnLabel(iso));
    }, 1000);

    return () => clearInterval(id);
  }, [iso, end]);

  return <span>{label}</span>;
}
