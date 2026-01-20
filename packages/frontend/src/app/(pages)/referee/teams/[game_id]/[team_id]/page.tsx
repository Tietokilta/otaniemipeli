"use client";
import { use, useEffect, useState } from "react";
import { HorizontalList } from "@/app/components/generic-list-components";
import TeamTurnCard from "@/app/components/team-components/team-turn-card";
import { useSocket } from "@/app/template";
import { usePathname } from "next/navigation";
import { getBoardPlaces } from "@/utils/fetchers";
import TeamList from "@/app/components/team-components/team-list";

export default function Page({
  params,
}: {
  params: Promise<{ team_id: string }>;
}) {
  const { team_id } = use(params);
  const socket = useSocket();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [team, setTeam] = useState<GameTeam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const path = usePathname();
  const [board, setBoard] = useState<BoardPlaces | undefined>();

  useEffect(() => {
    if (!socket) return;

    const teamId = Number(team_id);
    const gameId = Number(path.split("/")[3]);
    console.log(gameId);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;

    let attempts = 0;
    const MAX = 5;

    const request = () => {
      if (attempts >= MAX)
        setError("Too many connect attempts, please try reloading the page.");
      if (resolved || attempts >= MAX) return;
      attempts++;
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
      setTeam(data.teams.find((t) => t.team.team_id === teamId) || null);
      console.log(data);
    };

    if (socket.connected) {
      request();
    } else {
      socket.once("connect", request);
    }
    socket.on("reply-game", onReply);

    return () => {
      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      socket.off("reply-game", onReply);
    };
  }, [socket, team_id]);
  useEffect(() => {
    // get board places
    if (gameData) {
      getBoardPlaces("" + gameData?.game.board).then((b) => {
        setBoard(b);
      });
    }
  }, [gameData]);

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Team {team_id} Details</h1>
      {team ? (
        <div className="flex h-[30dvh]">
          <div className="pr-4 mr-4 border-r-2 border-tertiary-500">
            <TeamTurnCard team={team} teamTurns={team.turns} collect={true} />
          </div>
          <HorizontalList>
            {team &&
              team.turns.map((turn) => (
                <TeamTurnCard
                  team={team}
                  teamTurns={[turn]}
                  key={turn.turn_id}
                  board={board}
                />
              ))}
          </HorizontalList>
        </div>
      ) : (
        <p>Loading game data...</p>
      )}
    </div>
  );
}
