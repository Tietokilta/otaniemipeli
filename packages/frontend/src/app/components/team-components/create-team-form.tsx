"use client";

import { useState } from "react";
import { useSocket } from "@/app/template";
import PopUpDialogue from "@/app/components/pop-up-dialogue";

export default function AddTeamForm({ gameId }: { gameId: number }) {
  const [open, setOpen] = useState(false);
  const socket = useSocket();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const data = new FormData(e.currentTarget);
    const team: Team = {
      team_id: -1,
      game_id: gameId,
      team_name: data.get("name") as string,
      team_hash: "",
    };
    console.log(team);
    if (socket) {
      socket.emit("create-team", team);
    }
    setOpen(false);
  }

  return (
    <>
      <button className="button ml-auto" onClick={() => setOpen(true)}>
        Lisää Joukkue
      </button>

      {open && (
        <PopUpDialogue setOpen={setOpen}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow"
          >
            <h2 className="mb-4 text-xl font-semibold">Uusi joukkue</h2>
            <input
              name="name"
              required
              placeholder="Nimi"
              className="mb-3 w-full rounded border px-3 py-2"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="button"
              >
                Eiku
              </button>
              <button type="submit" className="button">
                Tallenna
              </button>
            </div>
          </form>
        </PopUpDialogue>
      )}
    </>
  );
}
