"use client";
import { useEffect, useState } from "react";
import { getGames } from "@/utils/fetchers";
import GameCard from "@/app/components/game-components/game-card";
import ItemList from "@/app/components/item-list";
import { useSocket } from "@/app/template";
export default function GameList({
  className,
  go_to_games,
}: {
  className?: string;
  go_to_games?: boolean;
}) {
  const [games, setGames] = useState<Games>({ games: [] });
  const socket = useSocket();

  useEffect(() => {
    if (!socket) {
      // Fallback to REST API when socket is not available
      getGames().then((data) => {
        setGames(data);
      });
      return;
    }

    const onReplyGames = (data: Games) => {
      setGames(data);
    };

    socket.on("reply-games", onReplyGames);
    socket.emit("get-games");

    return () => {
      socket.off("reply-games", onReplyGames);
    };
  }, [socket]);

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
              go_to_games={go_to_games}
            />
          ))
      ) : (
        <p>Ei pelejä!</p>
      )}
    </ItemList>
  );
}
