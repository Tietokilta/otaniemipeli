"use client";

import DeliveryTurnsList from "@/app/components/drink-components/delivery-turns-list";
import GameCard from "@/app/components/game-components/game-card";
import {
  GameErrorDisplay,
  GameLoadingSpinner,
} from "@/app/components/game-components/game-loading-states";
import { useGameData } from "@/app/hooks/useGameData";
import { useSocket } from "@/app/template";
import { getDrinksWithIngredients } from "@/utils/fetchers";
import { toastError } from "@/utils/toast-error";
import { use, useEffect, useState } from "react";

/** Non-interactive delivery view showing mixed-but-undelivered drinks. */
export default function Page({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  const { game_id } = use(params);
  const socket = useSocket();
  const { gameData, error, isLoading } = useGameData(socket, Number(game_id));
  const [drinksData, setDrinksData] = useState<DrinksIngredients | null>(null);

  useEffect(() => {
    getDrinksWithIngredients().then(setDrinksData).catch(toastError);
  }, []);

  if (error) {
    return <GameErrorDisplay error={error} />;
  }

  if (isLoading || !gameData) {
    return <GameLoadingSpinner />;
  }

  return (
    <div className="flex-1 flex gap-4 min-h-0">
      <div className="flex flex-col gap-2">
        <GameCard game={gameData.game} />
      </div>
      <div className="flex flex-col gap-2 flex-2 w-0">
        <DeliveryTurnsList teams={gameData.teams} drinksData={drinksData} />
      </div>
    </div>
  );
}
