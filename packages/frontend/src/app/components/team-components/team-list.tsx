"use client";
import ItemList from "@/app/components/item-list";
import AddTeamForm from "@/app/components/team-components/create-team-form";
import TeamCard from "@/app/components/team-components/team-card";

export default function TeamList({
  game,
  board,
  teams,
  className,
  link,
  linkPrefix,
  editTurn,
  editTeam,
  canAdd = true,
}: {
  game: Game;
  board?: BoardPlaces;
  teams: GameTeam[];
  className?: string;
  link?: boolean;
  linkPrefix?: string;
  editTurn?: boolean;
  editTeam?: boolean;
  canAdd?: boolean;
}) {
  return (
    <ItemList
      title="Joukkueet"
      addDialog={canAdd && !game.started && <AddTeamForm gameId={game.id} />}
      className={className}
    >
      {teams.map((team) => (
        <TeamCard
          key={team.team.team_id}
          team={team}
          board={board}
          className="w-full"
          link={link}
          linkPrefix={linkPrefix}
          editTurn={editTurn}
          editTeam={editTeam}
        />
      ))}
    </ItemList>
  );
}
