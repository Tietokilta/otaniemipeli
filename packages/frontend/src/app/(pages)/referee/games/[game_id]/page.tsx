"use client";

import React, { use, useEffect, useState } from "react";
import GameCard from "@/app/components/game-components/game-card";
import { useSocket } from "@/app/template";
import TeamList from "@/app/components/team-components/team-list";
import GameStartDialogue from "@/app/components/game-components/game-start-dialogue";
import GameTeamTurnsList from "@/app/components/team-components/game-team-turns-list";

export default function Page({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  const { game_id } = use(params);
  const [error, setError] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameData | undefined>(undefined);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const gameId = Number(game_id);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;

    let attempts = 0;
    const MAX = 5;

    const request = () => {
      if (attempts >= MAX)
        setError("Too many connect attempts, please try reloading the page.");
      if (resolved || attempts >= MAX) return;
      attempts++;
      console.log("Requesting game data for id:", gameId);
      socket.emit("game-data", gameId);

      timeoutId = setTimeout(() => {
        if (!resolved) {
          console.warn("No response, retrying…");
          request();
        }
      }, 500);
    };

    const onReply = (data: GameData) => {
      if (!data) {
        return;
      }
      if (!data.game) {
        setError("Game not found.");
        return;
      }
      if (data.game.id !== gameId) return;

      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);

      console.log("Received game data:", data);
      setGameData(data);
    };

    socket.on("reply-game", onReply);

    if (socket.connected) {
      request();
    } else {
      socket.once("connect", request);
    }

    return () => {
      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      socket.off("reply-game", onReply);
    };
  }, [socket, game_id]);

  const doGameUpdate = (updatedGame: Game) => {
    setGameData((prev) => (prev ? { ...prev, game: updatedGame } : prev));
  };

  if (!gameData) {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-alert-500 text-2xl font-bold mb-4">{error}</h1>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tertiary-900"></div>
      </div>
    );
  }
  return (
    <div className="flex gap-4 4 h-[80dvh]">
      <div className="flex flex-col gap-2 flex-1">
        <h1>{gameData.game.name}</h1>
        <GameCard game={gameData.game} className="w-full" />
        <TeamList game={gameData.game} className="w-full" />
        {!gameData.game.started && (
          <GameStartDialogue
            game={gameData.game}
            setGameAction={doGameUpdate}
            className="w-full"
          />
        )}
      </div>
      <div className="flex flex-col gap-2 flex-3 max-h-[70dvh] w-1/2">
        <h1 className="text-2xl font-bold mb-4">Pelin kulku</h1>
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
