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

  if (socket) {
    socket.on("reply-games", (data: Games) => {
      setGames(data);
    });
  }
  useEffect(() => {
    if (!socket) return;

    console.log("Setting up game data interval");
    socket.on("reply-games", (data: Games) => {
      setGames(data);
    });
    const interval = setInterval(() => {
      console.log("getGameData");
      socket.emit("get-games");
    }, 1000);

    return () => {
      clearInterval(interval);
      socket.off("reply-games");
    };
  }, [socket]);

  useEffect(() => {
    if (socket) {
      socket.on("reply-games", (data: Games) => {
        setGames(data);
      });
    } else {
      getGames().then((data) => {
        setGames(data);
      });
    }
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
