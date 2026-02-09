"use client";
import GameCard from "@/app/components/game-components/game-card";
import ItemList from "@/app/components/item-list";
import { getGames } from "@/utils/fetchers";
import { useEffect, useState } from "react";
import { GameLoadingSpinner } from "./game-loading-states";

export default function GameList({
  className,
  relativePath,
  refresh,
}: {
  className?: string;
  /** If true, links to games will be relative to the current path. */
  relativePath?: boolean;
  refresh?: unknown;
}) {
  const [games, setGames] = useState<Game[] | null>(null);

  useEffect(() => {
    getGames().then((data) => {
      setGames(data.games);
    });
  }, [refresh]);

  return (
    <ItemList title="Pelit" addDialog={<></>} className={className}>
      {games ? (
        games
          .sort((a, b) => b.start_time.localeCompare(a.start_time))
          .map((game: Game) => (
            <GameCard
              game={game}
              key={game.id}
              link
              relativePath={relativePath}
            />
          ))
      ) : (
        <GameLoadingSpinner />
      )}
      {games?.length === 0 && <p>Ei pelejä!</p>}
    </ItemList>
  );
}
