import Link from "next/link";
import { usePathname } from "next/navigation";
import { EditTeamTurnDialogue } from "./edit-team-turn-dialogue";
import { useState } from "react";
import PopUpDialogue from "../pop-up-dialogue";
import { updateTeam, deleteTeam } from "@/utils/fetchers";

export default function TeamCard({
  team,
  board,
  className,
  link,
  linkPrefix = "",
  editTurn,
  editTeam,
}: {
  team: GameTeam;
  board?: BoardPlaces;
  className?: string;
  link?: boolean;
  linkPrefix?: string;
  editTurn?: boolean;
  editTeam?: boolean;
}) {
  const path = usePathname();
  const [showDialogue, setShowDialogue] = useState<boolean>(false);
  const [editedName, setEditedName] = useState<string>(team.team.team_name);

  async function handleUpdateTeam() {
    if (editedName !== team.team.team_name) {
      await updateTeam(team.team.game_id, team.team.team_id, editedName);
    }
  }

  async function handleDeleteTeam() {
    await deleteTeam(team.team.game_id, team.team.team_id);
    setShowDialogue(false);
  }

  return link ? (
    <Link
      className={`${className} flex-wrap box-hover list-none center`}
      href={`${path}${linkPrefix}/${team.team.team_id}`}
    >
      {team.team.team_name}
    </Link>
  ) : (
    <>
      {editTurn && showDialogue && (
        <EditTeamTurnDialogue
          team={team}
          board={board}
          open
          setOpen={setShowDialogue}
        />
      )}
      {editTeam && showDialogue && (
        <PopUpDialogue title="Muokkaa joukkuetta" setOpen={setShowDialogue}>
          <div className="w-100 flex flex-col gap-6 p-4">
            <h3>
              Joukkue:{" "}
              <span className="text-primary-900">{team.team.team_name}</span>
            </h3>
            <div className="flex flex-col gap-1">
              <label htmlFor="editName">Muokkaa nimeä:</label>
              <input
                id="editName"
                className="w-full"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleUpdateTeam}
              />
            </div>
            <button className="button" type="button" onClick={handleDeleteTeam}>
              Poista joukkue
            </button>
          </div>
        </PopUpDialogue>
      )}
      <div
        className={`${className} flex-wrap ${editTurn || editTeam ? "box-hover cursor-pointer" : "box"} list-none center`}
        onClick={editTurn || editTeam ? () => setShowDialogue(true) : undefined}
      >
        {team.team.team_name}
      </div>
    </>
  );
}
