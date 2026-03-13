"use client";

import GameCard from "@/app/components/game-components/game-card";
import {
  GameErrorDisplay,
  GameLoadingSpinner,
} from "@/app/components/game-components/game-loading-states";
import GameStartDialogue from "@/app/components/game-components/game-start-dialogue";
import GameTeamTurnsList from "@/app/components/team-components/game-team-turns-list";
import TeamList from "@/app/components/team-components/team-list";
import { computeTotals } from "@/app/components/team-components/team-turn-card";
import { useGameBoard, useGameData } from "@/app/hooks/useGameData";
import { useSocket } from "@/app/template";
import Link from "next/link";
import { use, useMemo, useState } from "react";
import { OVERLAY_KEYS, useOverlayStateKeys } from "./overlay-state-keys";
import CasterTurnsList from "./caster-turns-list";
import { getToken } from "@/utils/fetchers";
import { toast } from "sonner";
import { toastError } from "@/utils/toast-error";

export default function Page({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  const { game_id } = use(params);
  const socket = useSocket();
  const { gameData, error, isLoading } = useGameData(socket, Number(game_id));
  const [showAllTurns, setShowAllTurns] = useState(false);
  const board = useGameBoard(gameData);

  const overlayState = useOverlayStateKeys(Number(game_id));

  const preppedTeams = useMemo(
    () => gameData && gameData.teams.map((team) => computeTotals(team)),
    [gameData],
  );

  const copyOverlayUrl = () => {
    const url = `${window.location.href}/overlay#${getToken()}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast("Overlayn URL kopioitu leikepöydälle!"))
      .catch(() => toastError("URL:n kopiointi epäonnistui"));
  };

  if (error) {
    return <GameErrorDisplay error={error} />;
  }

  if (isLoading || !gameData || !preppedTeams || !board) {
    return <GameLoadingSpinner />;
  }

  return (
    <div className="flex-1 flex gap-4 min-h-0">
      <div className="flex flex-col gap-2 flex-1 min-w-80">
        <GameCard game={gameData.game} className="w-full" />
        <div className="box">
          <h1>Striimi-overlay</h1>
          {Object.entries(OVERLAY_KEYS).map(([key, value]) => (
            <div
              key={key}
              className={`text-lg text-center
                ${value === overlayState ? "text-primary-900 font-bold" : ""}`}
            >
              {key} - {value}
            </div>
          ))}
        </div>
        <TeamList
          game={gameData.game}
          board={board}
          teams={gameData.teams}
          className="w-full flex-1 min-h-0"
        />
        {!gameData.game.started && gameData.teams.length > 0 && (
          <GameStartDialogue game={gameData.game} className="w-full" />
        )}
        {gameData.game.started && (
          <Link
            className="button"
            href={`/referee/games/${gameData.game.id}/caster/all`}
          >
            Näytä kaikki vuorot
          </Link>
        )}
        <button
          className="button"
          type="button"
          onClick={() => setShowAllTurns((prev) => !prev)}
        >
          {showAllTurns ? "Piilota kokonaistilanne" : "Näytä kokonaistilanne"}
        </button>
        <button className="button" type="button" onClick={copyOverlayUrl}>
          Kopioi overlayn URL
        </button>
      </div>
      <div className="flex flex-col gap-2 flex-3 w-0 min-h-0">
        <CasterTurnsList
          teams={gameData.teams}
          board={board}
          className="flex-grow-1"
        />
        {showAllTurns && (
          <GameTeamTurnsList
            teams={preppedTeams}
            collect
            className="flex-grow-2"
          />
        )}
      </div>
    </div>
  );
}
