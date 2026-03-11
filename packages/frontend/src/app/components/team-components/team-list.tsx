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
  // Find the first turn awaiting assistant referee input
  const assistantRefereeTurnId = teams
    .flatMap((team) =>
      team.turns.find(
        (turn) => turn.thrown_at && !turn.confirmed_at && !turn.penalty,
      ),
    )
    .filter(Boolean)
    .sort((a, b) => (a!.thrown_at! < b!.thrown_at! ? -1 : 1))[0]?.turn_id;

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
          assistantRefereeTurnId={assistantRefereeTurnId}
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
