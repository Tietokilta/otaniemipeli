import React, { useEffect, useState, Dispatch, SetStateAction } from "react";
import { useSocket } from "@/app/template";
import PopUpDialogue from "../pop-up-dialogue";
import DropdownMenu from "@/app/components/dropdown-menu";
import { getDrinks } from "@/utils/fetchers";

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
    <PopUpDialogue
      setOpen={setOpen}
      title={`Vuoro joukkueelle ${team.team.team_name}`}
    >
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

const AddTeamPenaltyForm = ({
  team,
  controller,
  setOpen,
}: {
  team: GameTeam;
  controller: Dispatch<SetStateAction<"penalty" | "turn" | null>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const [availableDrinks, setAvailableDrinks] = useState<Drink[]>([]);
  const [penaltyDrinks, setPenaltyDrinks] = useState<TurnDrinks>({
    drinks: [],
  });
  const socket = useSocket();

  useEffect(() => {
    getDrinks().then((drinks) => {
      const drinkList = drinks.drink_ingredients.map((d) => d.drink);
      setAvailableDrinks(drinkList);

      // Add favorite drinks with n=0
      const favoriteDrinks = drinkList
        .filter((d) => d.favorite)
        .map((d) => ({
          drink: d,
          turn_id: -1,
          n: 0,
        }));
      if (favoriteDrinks.length > 0) {
        setPenaltyDrinks({ drinks: favoriteDrinks });
      }
    });
  }, []);

  const handleSubmit = () => {
    if (!socket) {
      return;
    }
    // Convert TurnDrinks to PenaltyDrinks (filter out n=0 and remove turn_id)
    const postPenalty: PostPenalty = {
      team_id: team.team.team_id,
      game_id: team.team.game_id,
      drinks: {
        drinks: penaltyDrinks.drinks
          .filter((d) => d.n > 0)
          .map((d) => ({ drink: d.drink, n: d.n })),
      },
    };
    socket.emit("add-penalties", postPenalty);

    setOpen(false);
    controller(null);
  };

  const hasSelectedDrinks = penaltyDrinks.drinks.some((d) => d.n > 0);

  return (
    <form
      className="w-xl flex flex-col gap-2 bg-juvu-valko h-[80dvh] max-h-200 px-4 py-2"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <p className="text-xl">
        Lisätään rangaistus joukkueelle:{" "}
        <span className="text-juvu-sini-800">{team.team.team_name}</span>
      </p>
      <DrinkSelectionList
        availableDrinks={availableDrinks}
        selectedDrinks={penaltyDrinks}
        setSelectedDrinks={setPenaltyDrinks}
      />
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
          disabled={!hasSelectedDrinks}
        >
          Sakkoa
        </button>
      </div>
    </form>
  );
};

export function DrinkSelectionList<T extends Drink>({
  availableDrinks,
  selectedDrinks,
  setSelectedDrinks,
  buttonText = "Lisää juoma",
}: {
  availableDrinks: T[];
  selectedDrinks: TurnDrinks;
  setSelectedDrinks: React.Dispatch<React.SetStateAction<TurnDrinks>>;
  buttonText?: string;
}): JSX.Element {
  const [selectedOption, setSelectedOption] = useState<T | undefined>();

  // Filter out already-selected drinks from the dropdown
  const filteredDrinks = availableDrinks.filter(
    (d) => !selectedDrinks.drinks.some((td) => td.drink.id === d.id),
  );

  useEffect(() => {
    if (!selectedOption) return;

    setSelectedDrinks((prev) => {
      const existing = prev.drinks.find(
        (d) => d.drink.id === selectedOption.id,
      );
      if (existing) {
        // Increment n if already exists (e.g., favorite at n=0)
        return {
          drinks: prev.drinks.map((d) =>
            d.drink.id === selectedOption.id ? { ...d, n: d.n + 1 } : d,
          ),
        };
      }
      // Add new drink with n=1
      return {
        drinks: [
          ...prev.drinks,
          {
            drink: selectedOption,
            turn_id: -1,
            n: 1,
          },
        ],
      };
    });

    setSelectedOption(undefined);
  }, [selectedOption, setSelectedDrinks]);

  return (
    <>
      <DropdownMenu
        buttonText={buttonText}
        options={filteredDrinks}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
      />
      <div className="flex-1 flex flex-col gap-1 py-2 overflow-y-auto">
        {selectedDrinks.drinks.length === 0 && (
          <p className="text-tertiary-500">Ei valittuja juomia</p>
        )}
        {selectedDrinks.drinks.map((drink) => (
          <DrinkSelectionCard
            key={drink.drink.id}
            turnDrink={drink}
            updateDrinks={setSelectedDrinks}
            favorite={drink.drink.favorite}
          />
        ))}
      </div>
    </>
  );
}

export function DrinkSelectionCard({
  turnDrink,
  updateDrinks,
  favorite = false,
}: {
  turnDrink: TurnDrink;
  updateDrinks: React.Dispatch<React.SetStateAction<TurnDrinks>>;
  favorite?: boolean;
}): JSX.Element {
  const updateN = (change: number) => {
    updateDrinks((dr) => {
      const newN = turnDrink.n + change;
      // Don't go below 0
      if (newN < 0) return dr;
      // Delete non-favorite drinks when going below 1
      if (newN < 1 && !favorite) {
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
                n: newN,
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
          className="w-1/3 button text-3xl select-none"
          onClick={() => updateN(-1)}
        >
          -
        </button>
        <div className="w-1/3 center p-1 text-lg text-center">
          {turnDrink.n}
        </div>
        <button
          type="button"
          className="w-1/3 button text-3xl select-none"
          onClick={() => updateN(1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
