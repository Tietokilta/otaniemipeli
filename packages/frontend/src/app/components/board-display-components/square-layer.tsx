import { getPlaceColor } from "@/utils/colors";
import { updateCoordinates } from "@/utils/fetchers";
import { toastError } from "@/utils/toast-error";
import React, { useEffect, useMemo, useRef } from "react";

const TEAM_COLORS = [
  "#e63946",
  "#457b9d",
  "#2a9d8f",
  "#e9c46a",
  "#f4a261",
  "#9b5de5",
  "#f15bb5",
  "#00bbf9",
];

interface LabelPosition {
  x: number;
  y: number;
}

/** Compute repulsion-and-spring-stabilized label positions for team names. */
function simulateLabelPositions(
  teams: { name: string; cx: number; cy: number }[],
  steps: number = 80,
): LabelPosition[] {
  const idealDist = 6;
  const repulsionStrength = 2;
  const springStrength = 0.15;
  const damping = 0.9;
  const dt = 0.5;
  const minRepulsionDist = 1.5;

  const positions = teams.map((t, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / Math.max(teams.length, 1);
    return {
      x: t.cx + idealDist * Math.cos(angle),
      y: t.cy + idealDist * Math.sin(angle),
    };
  });

  const velocities = teams.map(() => ({ x: 0, y: 0 }));

  for (let step = 0; step < steps; step++) {
    for (let i = 0; i < positions.length; i++) {
      let fx = 0;
      let fy = 0;

      // Repulsion from other labels
      for (let j = 0; j < positions.length; j++) {
        if (i === j) continue;
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), minRepulsionDist);
        const force = repulsionStrength / (dist * dist);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      // Spring force toward ideal distance from circle center
      const dx = positions[i].x - teams[i].cx;
      const dy = positions[i].y - teams[i].cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.01) {
        const displacement = dist - idealDist;
        fx -= springStrength * displacement * (dx / dist);
        fy -= springStrength * displacement * (dy / dist);
      }

      // Boundary repulsion to keep labels on-screen
      if (positions[i].x < 5) fx += 0.5;
      if (positions[i].x > 95) fx -= 0.5;
      if (positions[i].y < 3) fy += 0.5;
      if (positions[i].y > 97) fy -= 0.5;

      velocities[i].x = (velocities[i].x + fx * dt) * damping;
      velocities[i].y = (velocities[i].y + fy * dt) * damping;
    }

    for (let i = 0; i < positions.length; i++) {
      positions[i].x += velocities[i].x * dt;
      positions[i].y += velocities[i].y * dt;
    }
  }

  return positions;
}

export default function SquareLayer({
  placesIn,
  focusedPlace,
  setFocusedPlace,
  photo,
  functional = false,
  teams,
}: {
  placesIn: BoardPlaces;
  focusedPlace?: BoardPlace;
  setFocusedPlace?: React.Dispatch<React.SetStateAction<BoardPlace>>;
  photo: boolean;
  functional?: boolean;
  teams?: GameTeam[];
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [places, setPlaces] = React.useState<BoardPlaces>(placesIn);

  // Sync internal state when placesIn prop changes
  useEffect(() => {
    setPlaces(placesIn);
  }, [placesIn]);

  const teamsWithLocations = useMemo(
    () => (teams ?? []).filter((t) => t.location !== null),
    [teams],
  );

  const labelPositions = useMemo(() => {
    if (teamsWithLocations.length === 0) return [];
    const inputs = teamsWithLocations.map((t) => ({
      name: t.team.team_name,
      cx: t.location!.x,
      cy: t.location!.y,
    }));
    return simulateLabelPositions(inputs);
  }, [teamsWithLocations]);

  const keyDownHandler = (e: React.KeyboardEvent, place: BoardPlace) => {
    const l = 0.1;
    const m = 50;
    if (!functional) return;
    if (e.key === "ArrowUp") moveFocused(0, -m * l);
    else if (e.key === "ArrowDown") moveFocused(0, m * l);
    else if (e.key === "ArrowLeft") moveFocused(-m * l, 0);
    else if (e.key === "ArrowRight") moveFocused(m * l, 0);
    else if (e.key === "w") moveFocused(0, -l);
    else if (e.key === "s") moveFocused(0, l);
    else if (e.key === "a") moveFocused(-l, 0);
    else if (e.key === "d") moveFocused(l, 0);
    else if (e.key === "Enter") {
      updateCoordinates(place.board_id, place).catch(toastError);
    }
  };

  const moveFocused = (dx: number, dy: number) => {
    if (focusedPlace === null || !places || !functional) return;

    const updated = { ...places };
    updated.places = updated.places.map((p) => {
      if (p.place_number !== focusedPlace?.place_number) return p;

      return {
        ...p,
        x: Math.min(100, Math.max(0, p.x + dx)),
        y: Math.min(100, Math.max(0, p.y + dy)),
      };
    });

    setPlaces(updated);
  };

  return (
    <div ref={boxRef}>
      {places.places.map((place) => (
        <div
          style={
            {
              "--color-square": getPlaceColor(place.place.place_type, false),
              "--color-square-hover": getPlaceColor(
                place.place.place_type,
                true,
              ),
            } as React.CSSProperties
          }
          tabIndex={0}
          key={place.place_number}
          onFocus={() => setFocusedPlace?.(place)}
          onKeyDown={(e) => {
            keyDownHandler(e, place);
          }}
          className="outline-none"
        >
          <div
            className={
              photo && !(focusedPlace?.place_number == place.place_number)
                ? `absolute rounded-full
                hover:border-[4px]
                hover:border-[var(--color-square)]
                z-50
                ${place.end ? "end-ring" : ""}  `
                : `
                absolute rounded-full border-[4px]
                border-[var(--color-square)]
                hover:border-[var(--color-square-hover)]
                z-50
                ${place.end ? "end-ring" : ""}
                `
            }
            style={{
              height: "6.20%",
              width: `3.48%`,
              top: `${place.y}%`,
              left: `${place.x}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="w-full h-full center flex">
              {place.place_number === focusedPlace?.place_number && (
                <>
                  <div
                    className={
                      photo
                        ? "w-[105%] h-[105%] bg-juvu-kulta border-juvu-kulta z-10 border-4 rounded-full animate-pulse"
                        : "w-[65%] h-[65%] bg-[var(--color-square)] border-[var(--color-square)] z-10 border-4 rounded-full"
                    }
                  />
                  {photo && (
                    <div className="w-[65%] h-[65%] bg-[var(--color-square)] border-[var(--color-square)] z-20 border-4 rounded-full absolute" />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Team position markers */}
      {teamsWithLocations.map((gameTeam, i) => {
        const loc = gameTeam.location!;
        const color = TEAM_COLORS[i % TEAM_COLORS.length];
        const label = labelPositions[i];

        return (
          <React.Fragment key={gameTeam.team.team_id}>
            {/* Team marker circle */}
            <div
              className="absolute z-40 rounded-full border-[3px] pointer-events-none"
              style={{
                width: "2.4%",
                height: "4.27%",
                top: `${loc.y}%`,
                left: `${loc.x}%`,
                transform: "translate(-50%, -50%)",
                backgroundColor: color,
                borderColor: "white",
                opacity: 0.9,
              }}
            />

            {/* Line from circle to label */}
            {label && (
              <svg className="absolute top-0 left-0 w-full h-full z-30 pointer-events-none">
                <line
                  x1={`${loc.x}%`}
                  y1={`${loc.y}%`}
                  x2={`${label.x}%`}
                  y2={`${label.y}%`}
                  stroke="#000000"
                  strokeWidth="8"
                  strokeOpacity="1"
                />
                <line
                  x1={`${loc.x}%`}
                  y1={`${loc.y}%`}
                  x2={`${label.x}%`}
                  y2={`${label.y}%`}
                  stroke={color}
                  strokeWidth="4"
                  // strokeOpacity="0.7"
                />
              </svg>
            )}

            {/* Team name label */}
            {label && (
              <div
                className="absolute z-50 pointer-events-none px-1.5 py-0.5 rounded text-xl font-bold whitespace-nowrap"
                style={{
                  top: `${label.y}%`,
                  left: `${label.x}%`,
                  transform: "translate(-50%, -50%)",
                  backgroundColor: color,
                  color: "white",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                {gameTeam.team.team_name}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
