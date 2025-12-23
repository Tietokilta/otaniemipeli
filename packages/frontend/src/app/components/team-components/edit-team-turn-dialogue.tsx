import React, {
  useEffect,
  useState,
  useRef,
  Dispatch,
  SetStateAction,
} from "react";
import { useSocket } from "@/app/template";
import PopUpDialogue from "../pop-up-dialogue";

export const EditTeamTurnDialogue = ({
  team,
  open,
  setOpen,
}: {
  team: GameTeam;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const justOpened = useRef(true);
  const [choice, setChoice] = useState<"penalty" | "turn" | null>(null);
  const socket = useSocket();

  useEffect(() => {
    if (!open) return;

    justOpened.current = true;
    const id = setTimeout(() => {
      justOpened.current = false;
    }, 0);

    return () => clearTimeout(id);
  }, [open]);

  if (!open) return null;

  return (
    <PopUpDialogue justOpened={justOpened} setOpen={setOpen}>
      {!choice && (
        <div className="flex flex-col gap-2 p-4">
          <h3>Lisää Joukkueelle {team.team.team_name}</h3>
          <div className="flex gap-2 p-4 center">
            <button className="button" onClick={() => setChoice("penalty")}>
              Sakkoa
            </button>
            {
              // if last turn of the team is finished show start turn if not show end turn option
              team.turns.length === 0 ||
              team.turns[team.turns.length - 1].finished ? (
                <button className="button" onClick={() => setChoice("turn")}>
                  Uusi vuoro
                </button>
              ) : (
                <button
                  className="button"
                  onClick={() => {
                    if (!socket) {
                      return;
                    }
                    const params: EndTurn = {
                      team_id: team.team.team_id,
                      game_id: team.team.game_id,
                    };
                    socket.emit("end-turn", params);
                    socket.emit("game-data", team.team.game_id);
                    setChoice(null);
                  }}
                >
                  Päätä vuoro
                </button>
              )
            }
          </div>
        </div>
      )}
      {choice === "penalty" && (
        <AddTeamPenaltyForm
          team={team}
          controller={setChoice}
          setOpen={setOpen}
        />
      )}
      {choice === "turn" && (
        <AddTeamTurnForm team={team} controller={setChoice} setOpen={setOpen} />
      )}
    </PopUpDialogue>
  );
};

const AddTeamTurnForm = ({
  team,
  controller,
  setOpen,
}: {
  team: GameTeam;
  controller: Dispatch<SetStateAction<"penalty" | "turn" | null>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const socket = useSocket();

  const [dice1, setDice1] = useState<number>(0);
  const [dice2, setDice2] = useState<number>(0);

  const submitTurn = () => {
    if (!socket) {
      return;
    }
    const postTurn: PostStartTurn = {
      team_id: team.team.team_id,
      game_id: team.team.game_id,
      dice1,
      dice2,
    };

    // adjust event name to your backend
    socket.emit("start-turn", postTurn);
    socket.emit("game-data", team.team.game_id);
    setOpen(false);
    controller(null);
  };

  return (
    <div className="flex flex-col gap-2 bg-juvu-valko rounded shadow-lg px-4 py-2">
      <p>Lisätään vuoroa joukkueelle: {team.team.team_name}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitTurn();
        }}
      >
        <div className="flex flex-col w-full gap-2">
          <div className="flex gap-2 center">
            <h2>Noppa 1:</h2>
            <input
              type="number"
              min="1"
              max="6"
              value={dice1}
              onChange={(e) => setDice1(Number(e.target.value))}
              required
            />
          </div>
          <div className="flex gap-2 center">
            <h2>Noppa 2:</h2>
            <input
              type="number"
              min="1"
              max="6"
              value={dice2}
              onChange={(e) => setDice2(Number(e.target.value))}
              required
            />
          </div>
        </div>
      </form>
      <div className="flex gap-2 px-4 pb-4">
        <button className="button" onClick={() => controller(null)}>
          Eiku
        </button>
        <button className="button ml-auto" type="button" onClick={submitTurn}>
          Lähetä
        </button>
      </div>
    </div>
  );
};

const AddTeamPenaltyForm = ({
  team,
  controller,
}: {
  team: GameTeam;
  controller: Dispatch<SetStateAction<"penalty" | "turn" | null>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <div className="flex flex-col gap-2 bg-juvu-valko rounded shadow-lg px-4 py-2">
      <p>Lisätään rangaistusjoukkueelle: {team.team.team_name}</p>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col w-full gap-2">
          <div className="flex gap-2 center">
            <h2>Syy:</h2>
            <input type="text" required />
          </div>
          <div className="flex gap-2 center">
            <h2>Aika (min):</h2>
            <input type="number" min="1" defaultValue={5} required />
          </div>
        </div>
      </form>
      <div className="flex gap-2">
        <button className="button" onClick={() => controller(null)}>
          Eiku
        </button>
      </div>
    </div>
  );
};
