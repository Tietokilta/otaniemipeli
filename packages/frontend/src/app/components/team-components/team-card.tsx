import Link from "next/link";
import { usePathname } from "next/navigation";
import { EditTeamTurnDialogue } from "./edit-team-turn-dialogue";
import { useState } from "react";

export default function TeamCard({
  team,
  className,
  link,
  editTurn,
}: {
  team: GameTeam;
  className?: string;
  link?: boolean;
  editTurn?: boolean;
}) {
  const path = usePathname();
  const [showDialogue, setShowDialogue] = useState<boolean>(false);
  return link ? (
    <Link
      className={`${className} flex-wrap box-hover list-none center`}
      href={`${path}/${team.team.team_id}`}
    >
      {team.team.team_name}
    </Link>
  ) : (
    <>
      {editTurn && showDialogue && (
        <EditTeamTurnDialogue team={team} open setOpen={setShowDialogue} />
      )}
      <div
        className={`${className} flex-wrap ${editTurn ? "box-hover cursor-pointer" : "box"} list-none center`}
        onClick={editTurn ? () => setShowDialogue(true) : undefined}
      >
        {team.team.team_name}
      </div>
    </>
  );
}
