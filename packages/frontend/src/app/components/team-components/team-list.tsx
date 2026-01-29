"use client";
import ItemList from "@/app/components/item-list";
import { useSocket } from "@/app/template";
import { useEffect, useState } from "react";
import AddTeamForm from "@/app/components/team-components/create-team-form";
import TeamCard from "@/app/components/team-components/team-card";

export default function TeamList({
  game,
  className,
  link,
}: {
  game: Game;
  className?: string;
  link?: boolean;
}) {
  const [teams, setTeams] = useState<Teams>({ teams: [] });
  const socket = useSocket();
  useEffect(() => {
    if (socket) {
      socket.emit("game-data", game.id);
      socket.on("reply-game", (data: GameData) => {
        if (data.teams) {
          setTeams({ teams: data.teams.map((t) => t.team) });
        }
      });
    }
  }, [socket, game.id]);
  return (
    <ItemList
      title="Joukkueet"
      addDialog={!game.started && <AddTeamForm gameId={game.id} />}
      className={className}
    >
      <div
        className="box-hover"
        onClick={() => {
          window.location.href =
            window.location.origin + `/referee/teams/${game.id}/all`;
        }}
      >
        <h2>Näytä kaikki</h2>
      </div>
      {teams.teams.map((team) => (
        <TeamCard
          team={team}
          key={team.team_id}
          className="w-full"
          link={link}
        />
      ))}
    </ItemList>
  );
}
