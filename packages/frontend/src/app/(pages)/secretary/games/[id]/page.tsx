"use client";

import React, { use, useEffect, useState } from "react";
import { useSocket } from "@/app/template";
import GameTeamTurnsList from "@/app/components/team-components/game-team-turns-list";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [gameData, setGameData] = useState<GameData | undefined>(undefined);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on("reply-game", (data: GameData) => {
      setGameData(data);
    });
    socket.emit("game-data", parseInt(id));
  }, [setGameData, id, socket]);

  if (!gameData) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tertiary-900"></div>
      </div>
    );
  }
  return (
    <div className="gap-4 4 h-[85dvh] box">
      <h1>{gameData.game.name}</h1>
      <div className="flex flex-col gap-2 flex-3 max-h-[66dvh]">
        <GameTeamTurnsList gameData={gameData} className="h-64 flex-1" />
        <GameTeamTurnsList
          gameData={gameData}
          collect
          className="h-64 flex-1"
        />
      </div>
    </div>
  );
}
