"use client";
import { useEffect, useState } from "react";
import { getGames } from "@/utils/fetchers";
import GameCard from "@/app/components/game-components/game-card";
import ItemList from "@/app/components/item-list";

export default function GameList({
  className,
  relativePath,
}: {
  className?: string;
  /** If true, links to games will be relative to the current path. */
  relativePath?: boolean;
}) {
  const [games, setGames] = useState<Games>({ games: [] });

  useEffect(() => {
    getGames().then((data) => {
      setGames(data);
    });
  }, []);

  return (
    <ItemList title="Games" addDialog={<></>} className={className}>
      {games ? (
        games.games
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
        <p>Ei pelejä!</p>
      )}
    </ItemList>
  );
}
