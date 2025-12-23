"use client";

import { use, useEffect, useState } from "react";
import { useSocket } from "@/app/template";

export default function Page({
  params,
}: {
  params: Promise<{ id: string; team_hash: string }>;
}) {
  const { team_hash } = use(params);
  const socket = useSocket();
  const gameTeam = useState<GameTeam | undefined>(undefined);

  useEffect(() => {
    if (!socket) return;
    socket.on("reply-game", (data: GameTeam) => {
      console.log(data);
    });
    socket.emit("game-data", team_hash);
  }, [socket, team_hash]);

  return <div>Team view for team hash: {gameTeam && team_hash}</div>;
}
