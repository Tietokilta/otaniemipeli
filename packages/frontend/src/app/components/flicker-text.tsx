"use client";
import { ReactNode, useEffect, useRef } from "react";

function randIndex(len: number) {
  return (Math.random() * len) | 0;
}
function pickNext(len: number, avoid: number | null) {
  if (len <= 1) return 0;
  let i = randIndex(len);
  if (avoid != null) while (i === avoid) i = randIndex(len);
  return i;
}

const DEFAULT_FONTS = [
  "font-redaction",
  "font-redaction-b",
  "font-redaction-i",
  "font-redaction-35",
  "font-redaction-50",
  "font-redaction-70",
  "font-redaction-100",
  "font-redaction-b-35",
  "font-redaction-b-50",
  "font-redaction-b-70",
  "font-redaction-b-100",
  "font-redaction-i-35",
  "font-redaction-i-50",
  "font-redaction-i-70",
  "font-redaction-i-100",
] as const;
const DEFAULT_SPEEDS = [
  100, 125, 150, 175, 200, 250, 300, 350, 1000, 1500, 2000, 2500, 3000, 3500,
  4000,
] as const;

export function FlickerText({
  children,
  fonts = DEFAULT_FONTS,
  speeds = DEFAULT_SPEEDS,
  noRepeat = true,
}: {
  children: ReactNode;
  fonts?: readonly string[];
  speeds?: readonly number[];
  noRepeat?: boolean;
}) {
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const idxRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el || fonts.length === 0) return;

    // clean any previous classes first
    fonts.forEach((c) => el.classList.remove(c));

    const tick = () => {
      // remove old class
      if (idxRef.current != null) el.classList.remove(fonts[idxRef.current]);

      // choose next index
      const next = pickNext(fonts.length, noRepeat ? idxRef.current : null);
      idxRef.current = next;

      // apply new class
      el.classList.add(fonts[next]);

      // schedule next toggle with random speed
      const delay = speeds[randIndex(speeds.length)] ?? 300;
      timerRef.current = window.setTimeout(tick, delay);
    };

    // start
    tick();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      fonts.forEach((c) => el.classList.remove(c));
      idxRef.current = null;
    };
  }, [fonts, speeds, noRepeat]);

  return <span ref={spanRef}>{children}</span>;
}
