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
  const [choice, setChoice] = useState<"penalty" | "turn" | null>(null);
  const socket = useSocket();

  if (!open) return null;

  return (
    <PopUpDialogue setOpen={setOpen}>
      {!choice && (
        <div className="flex flex-col gap-6 p-4">
          <h3>
            Joukkue:{" "}
            <span className="text-juvu-sini-800">{team.team.team_name}</span>
          </h3>
          <button
            className="button text-xl p-5"
            onClick={() => setChoice("penalty")}
          >
            Sakko
          </button>
          {
            // if last turn of the team is finished show start turn if not show end turn option
            team.turns.length === 0 ||
            team.turns[team.turns.length - 1].end_time ? (
              <button
                className="button text-xl p-5"
                onClick={() => setChoice("turn")}
              >
                Uusi vuoro (nopanheitto)
              </button>
            ) : (
              <button
                className="button text-xl p-5"
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
                Juomat juotu
              </button>
            )
          }
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

const Dice = ({
  value,
  setValue,
}: {
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
}) => {
  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <button
          key={i}
          type="button"
          className={`rounded cursor-pointer border-2 text-3xl w-[12vw] max-w-24 aspect-square ${value === i ? "bg-juvu-sini-800 border-juvu-sini-600 text-white" : ""}`}
          onClick={() => setValue(i)}
        >
          {i}
        </button>
      ))}
    </div>
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
      <p className="text-xl">
        Lisätään vuoroa joukkueelle:{" "}
        <span className="text-juvu-sini-800">{team.team.team_name}</span>
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitTurn();
        }}
      >
        <div className="flex flex-col w-full gap-2">
          <h2>Noppa 1:</h2>
          <Dice value={dice1} setValue={setDice1} />
          <h2>Noppa 2:</h2>
          <Dice value={dice2} setValue={setDice2} />
        </div>
      </form>
      <div className="flex justify-between px-4 py-4">
        <button
          type="button"
          className="button text-xl p-4"
          onClick={() => controller(null)}
        >
          Eiku
        </button>
        <button
          className="button text-xl p-4"
          type="button"
          onClick={submitTurn}
          disabled={dice1 === 0 || dice2 === 0}
        >
          Heitä
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

  // Track the previous selected drink to prevent duplicate processing
  const prevSelectedDrinkRef = useRef<DrinkIngredientsWithID | undefined>(
    undefined,
  );

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
    // Skip if no drink selected or if it's the same drink as before
    if (!selectedDrink) return;
    if (prevSelectedDrinkRef.current?.id === selectedDrink.id) return;

    prevSelectedDrinkRef.current = selectedDrink;

    const currentTurn = teamsCurrentTurn(team);
    setPenaltyDrinks((prev) => {
      const existingDrink = prev.drinks.find(
        (drink) => drink.drink.id === selectedDrink.id,
      );
      if (!existingDrink) {
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

    // Reset selectedDrink after processing to allow re-selection
    setSelectedDrink(undefined);
    prevSelectedDrinkRef.current = undefined;
  }, [selectedDrink, team]);

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
    <div className="flex flex-col gap-2 bg-juvu-valko rounded shadow-lg px-4 py-2 pb-4">
      <p className="text-xl">
        Lisätään rangaistus joukkueelle:{" "}
        <span className="text-juvu-sini-800">{team.team.team_name}</span>
      </p>
      <form
        className="flex flex-col gap-2"
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
        {penaltyDrinks.drinks.length > 0 && (
          <ul className="list-none flex flex-col gap-1">
            {penaltyDrinks.drinks.map((drink) => (
              <DrinkSelectionCard
                key={drink.drink.id}
                turnDrink={drink}
                updateDrinks={setPenaltyDrinks}
              />
            ))}
          </ul>
        )}
        <div className="flex justify-between px-4 py-4">
          <button
            type="button"
            className="button text-xl p-4"
            onClick={() => controller(null)}
          >
            Eiku
          </button>
          <button
            type="button"
            className="button text-xl p-4"
            onClick={handleSubmit}
            disabled={penaltyDrinks.drinks.length === 0}
          >
            Sakkoa
          </button>
        </div>
      </form>
    </div>
  );
};

export function DrinkSelectionCard({
  turnDrink,
  updateDrinks,
}: {
  turnDrink: TurnDrink;
  updateDrinks: React.Dispatch<React.SetStateAction<TurnDrinks>>;
}): JSX.Element {
  const updateN = (change: number) => {
    updateDrinks((dr) => {
      if (turnDrink.n + change < 1) {
        // Delete drink if n goes below 1
        return {
          drinks: dr.drinks.filter(
            (drink) => drink.drink.id !== turnDrink.drink.id,
          ),
        };
      }
      return {
        drinks: dr.drinks.map((existingDrink) =>
          existingDrink.drink.id === turnDrink.drink.id
            ? {
                ...existingDrink,
                n: existingDrink.n + change,
              }
            : existingDrink,
        ),
      };
    });
  };

  return (
    <div className="flex gap-2 w-full box p-2 center">
      <div className="w-1/2 mr-auto text-lg font-bold overflow-hidden flex-grow-0 text-ellipsis text-nowrap text-left">
        {turnDrink.drink.name}
      </div>
      <div
        className="flex gap-2 w-1/2 center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="w-1/3 aspect-square button text-3xl select-none"
          onClick={() => updateN(-1)}
        >
          -
        </button>
        <div className="w-1/3 center p-1 text-lg text-center">
          {turnDrink.n}
        </div>
        <button
          type="button"
          className="w-1/3 aspect-square button text-3xl select-none"
          onClick={() => updateN(1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
