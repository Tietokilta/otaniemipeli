import React, {
  useEffect,
  useState,
  useRef,
  Dispatch,
  SetStateAction,
} from "react";
import { useSocket } from "@/app/template";
import PopUpDialogue from "../pop-up-dialogue";
import DropdownMenu from "@/app/components/dropdown-menu";
import { getDrinks } from "@/utils/fetchers";
import { teamsCurrentTurn } from "@/utils/helpers";

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

interface DrinkIngredientsWithID extends DrinkIngredients {
  id: number;
  name: string;
}
interface DrinksIngredientsWithID {
  drink_ingredients: DrinkIngredientsWithID[];
}

const AddTeamPenaltyForm = ({
  team,
  controller,
  setOpen,
}: {
  team: GameTeam;
  controller: Dispatch<SetStateAction<"penalty" | "turn" | null>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const [drinks, setDrinks] = useState<DrinksIngredientsWithID>({
    drink_ingredients: [],
  });
  const [selectedDrink, setSelectedDrink] = useState<
    DrinkIngredientsWithID | undefined
  >();
  const [penaltyDrinks, setPenaltyDrinks] = useState<TurnDrinks>({
    drinks: [],
  });
  const socket = useSocket();

  useEffect(() => {
    getDrinks().then((drinks) => {
      setDrinks({
        drink_ingredients: drinks.drink_ingredients.map((drink) => ({
          ...drink,
          name: drink.drink.name,
          id: drink.drink.id,
        })),
      } as DrinksIngredientsWithID);
    });
  }, []);

  useEffect(() => {
    if (selectedDrink) {
      setPenaltyDrinks((prev) => {
        if (!prev.drinks.find((drink) => drink.drink.id === selectedDrink.id)) {
          const currentTurn = teamsCurrentTurn(team);
          return {
            drinks: [
              ...prev.drinks,
              {
                drink: selectedDrink.drink,
                turn_id: currentTurn?.turn_id ?? -1,
                n: 1,
                penalty: true,
              },
            ],
          };
        } else {
          return {
            drinks: prev.drinks.filter(
              (drink) => drink.drink.id !== selectedDrink.id,
            ),
          };
        }
      });
    }
  }, [selectedDrink, team]);

  const deleteDrink = (id: number) => {
    setPenaltyDrinks((prev) => {
      return {
        drinks: prev.drinks.filter((drink) => drink.drink.id !== id),
      };
    });
  };

  const handleSubmit = () => {
    if (!socket) {
      return;
    }
    const postPenalty: PostTurnDrinks = {
      game_id: team.team.game_id,
      turn_drinks: penaltyDrinks,
    };
    socket.emit("add-penalties", postPenalty);

    setOpen(false);
    controller(null);
  };

  return (
    <div className="flex flex-col gap-2 bg-juvu-valko rounded shadow-lg px-4 py-2">
      <p>Lisätään rangaistus joukkueelle: {team.team.team_name}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <DropdownMenu
          buttonText="Lisää juoma"
          options={drinks.drink_ingredients}
          selectedOption={selectedDrink}
          setSelectedOption={setSelectedDrink}
        />
        <div>
          {penaltyDrinks.drinks.length > 0 && (
            <ul className="list-disc pl-5">
              {penaltyDrinks.drinks.map((drink) => (
                <DrinkSelectionCard
                  key={drink.drink.id}
                  turnDrink={drink}
                  onDelete={deleteDrink}
                  updateDrinks={setPenaltyDrinks}
                />
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-2">
          <button className="button" onClick={() => controller(null)}>
            Eiku
          </button>
          <button className="button" onClick={handleSubmit}>
            Sakkoa
          </button>
        </div>
      </form>
    </div>
  );
};

export function DrinkSelectionCard({
  turnDrink,
  onDelete,
  updateDrinks,
}: {
  turnDrink: TurnDrink;
  onDelete: (id: number) => void;
  updateDrinks: React.Dispatch<React.SetStateAction<TurnDrinks>>;
}): JSX.Element {
  const [n, setN] = useState<number>(turnDrink.n || 1);
  const [showEverything, setShowEverything] = useState<boolean>(false);

  useEffect(() => {
    updateDrinks((dr) => {
      return {
        drinks: dr.drinks.map((existingDrink) =>
          existingDrink.drink.id === turnDrink.drink.id
            ? {
                ...existingDrink,
                ...turnDrink,
                n: n,
              }
            : existingDrink
        ),
      };
    });
  }, [n, turnDrink.drink.id, turnDrink.drink, turnDrink.turn_id, updateDrinks]);

  return (
    <div
      className="flex flex-col gap-2 w-full box p-2 cursor-pointer"
      onClick={() => {
        setShowEverything(!showEverything);
      }}
    >
      <div className="flex h-1/3">
        <p className="mr-auto text-lg font-bold">{turnDrink.drink.name}</p>
        {showEverything && (
          <div
            className="flex button ml-auto justify-center items-center"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(turnDrink.drink.id);
            }}
          >
            <p>Poista</p>
          </div>
        )}
      </div>
      {showEverything && (
        <>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <div className={`flex gap-2 w-1/2 box center`}>
              <div className="w-1/3 center button p-1">
                <p
                  className="text-center w-full select-none"
                  onClick={() => {
                    setN(n - 1);
                  }}
                >
                  -
                </p>
              </div>
              <div className="w-1/3 center p-1">
                <p className="text-sm text-center w-full">{n}</p>
              </div>
              <div className="w-1/3 center button p-1">
                <p
                  className="text-center w-full select-none"
                  onClick={() => {
                    setN(n + 1);
                  }}
                >
                  +
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
