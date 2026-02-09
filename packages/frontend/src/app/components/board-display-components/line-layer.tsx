import React, { useLayoutEffect, useRef, useState } from "react";

const RADIUS_PX = 6.2;
const BAR_THICK_PX = 6; // line thickness
const BAR_COLOR = "var(--color-normal-600)"; // yellow color from titeenit palette

function edgeKey(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export default function LineLayer({
  places,
}: {
  places: BoardPlaces;
}): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const handle = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    handle();
    const observer = new ResizeObserver(handle);
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  /*── build unique edges list (no double draw) ──*/
  const edges: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    dashed: boolean;
  }[] = [];

  const seen = new Set<string>();
  for (const p of places.places) {
    for (const c of p.connections.connections) {
      const key = edgeKey(c.origin, c.target);
      if (seen.has(key)) continue;
      seen.add(key);

      const a = places.places.find((pl) => pl.place_number === c.origin);
      const b = places.places.find((pl) => pl.place_number === c.target);
      if (!a || !b) continue;
      edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, dashed: c.dashed });
    }
  }

  return (
    /* wrapper give us pixel size */
    <div
      ref={boxRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
    >
      {size.w > 0 &&
        // eslint-disable-next-line react-hooks/refs -- TODO: fix
        edges.map((e, i) => {
          /* convert % → px */
          const ax = (e.x1 / 100) * size.w;
          const ay = (e.y1 / 100) * size.h;
          const bx = (e.x2 / 100) * size.w;
          const by = (e.y2 / 100) * size.h;

          const dx = bx - ax;
          const dy = by - ay;
          const len = Math.hypot(dx, dy) + 2;

          /* cut away the ring on both ends */
          let radius = 15;
          if (boxRef.current) {
            radius = (RADIUS_PX / 2 / 100) * boxRef.current.clientHeight;
          }
          const barLen = Math.max(0, len - radius - BAR_THICK_PX * 3);
          if (barLen === 0) return null; // nodes overla
          /* angle in rad then deg */
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

          /* middle point */
          const midX = (ax + bx) / 2;
          const midY = (ay + by) / 2;

          /* dashed use repeating-linear-gradient */
          const background = e.dashed
            ? `repeating-linear-gradient(90deg, ${BAR_COLOR} 0 8px, transparent 8px 16px)`
            : BAR_COLOR;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: midX,
                top: midY,
                width: barLen,
                height: "0.35em",
                background,
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                transformOrigin: "center",
              }}
            />
          );
        })}
    </div>
  );
}
