"use client";
import ItemList from "@/app/components/item-list";
import AddTeamForm from "@/app/components/team-components/create-team-form";
import TeamCard from "@/app/components/team-components/team-card";

export default function TeamList({
  game,
  teams,
  className,
  link,
  linkPrefix,
  editTurn,
}: {
  game: Game;
  teams: GameTeam[];
  className?: string;
  link?: boolean;
  linkPrefix?: string;
  editTurn?: boolean;
}) {
  return (
    <ItemList
      title="Joukkueet"
      addDialog={!game.started && <AddTeamForm gameId={game.id} />}
      className={className}
    >
      {teams.map((team) => (
        <TeamCard
          team={team}
          key={team.team.team_id}
          className="w-full"
          link={link}
          linkPrefix={linkPrefix}
          editTurn={editTurn}
        />
      ))}
    </ItemList>
  );
}
