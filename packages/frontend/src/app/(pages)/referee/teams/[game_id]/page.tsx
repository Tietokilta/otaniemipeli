"use client";

import TeamList from "@/app/components/team-components/team-list";
import { useSocket } from "@/app/template";
import { use, useEffect, useState } from "react";

export default function Page({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  const { game_id } = use(params);
  const socket = useSocket();
  const [gameData, setGameData] = useState<GameData | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

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
      if (resolved || attempts >= MAX || error) return;
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
  }, [socket, game_id, error]);

  return (
    <div className="center w-full">
      {gameData && <TeamList game={gameData.game} link={true} />}
    </div>
  );
}
