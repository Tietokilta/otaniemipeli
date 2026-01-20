"use client";

import { use } from "react";
import { useSocket } from "@/app/template";
import { useGameData } from "@/app/hooks/useGameData";
import {
  GameLoadingSpinner,
  GameErrorDisplay,
} from "@/app/components/game-components/game-loading-states";

export default function Page({
  params,
}: {
  params: Promise<{ id: string; team_hash: string }>;
}) {
  const { id, team_hash } = use(params);
  const socket = useSocket();
  const { gameData, error, isLoading } = useGameData(socket, parseInt(id));

  if (isLoading) {
    return <GameLoadingSpinner />;
  }

  if (error) {
    return <GameErrorDisplay error={error} />;
  }

  return <div>Team view for team hash: {gameData && team_hash}</div>;
}
