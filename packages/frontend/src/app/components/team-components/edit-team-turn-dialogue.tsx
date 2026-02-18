import {
  cancelTurn,
  changeDice,
  confirmPenalty,
  confirmTurn,
  endTurn,
  getDrinks,
  setDrinkPrepStatus,
  setMoralVictoryEligible,
  startTurn,
  teleportTeam,
} from "@/utils/fetchers";
import { TurnStatus, turnStatus, turnStatusTexts } from "@/utils/turns";
import deepEqual from "fast-deep-equal";
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import PlaceCard from "../board-components/place-card";
import DrinkDropdown from "../drink-dropdown";
import PopUpDialogue from "../pop-up-dialogue";
import SimpleConfirmedButton from "../simple-confirmed-button";

/** Set to false to show the dice selection dialog when creating turns. */
const USE_SECRETARIES = true;
/** Set to false to auto-enter the assistant referee dialogue. */
const USE_ASSISTANT_REFEREES = true;

const ALLOW_REFEREE_TO_DELIVER_DRINKS = true;
const KEEP_DIALOGUE_OPEN_ON_ACTIONS = true;
const ALLOW_TELEPORT = true;

/** Returns the unconfirmed penalty turn if one exists. */
function getUnconfirmedPenalty(team: GameTeam): Turn | undefined {
  return team.turns.find((turn) => turn.penalty && !turn.confirmed_at);
}

/** Returns the unconfirmed turn if one exists. */
function getUnconfirmedTurn(team: GameTeam): Turn | undefined {
  return team.turns.find((turn) => turn.thrown_at && !turn.confirmed_at);
}

export const EditTeamTurnDialogue = ({
  team,
  board,
  open,
  setOpen,
  assistant = false,
}: {
  team: GameTeam;
  board?: BoardPlaces;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  assistant?: boolean;
}) => {
  const [choice, setChoice] = useState<
    "penalty" | "turn" | "assistant" | "teleport" | null
  >(null);
  const [pendingPenaltyTurnId, setPendingPenaltyTurnId] = useState<
    number | null
  >(null);
  const [pending, setPending] = useState(false);

  if (!open) return null;

  const unconfirmedPenalty = getUnconfirmedPenalty(team);
  const unconfirmedTurn = getUnconfirmedTurn(team);

  /** Creates a new pending penalty turn or takes over an existing one. */
  const handleAddPenalty = async () => {
    if (unconfirmedPenalty) {
      // Take over existing unconfirmed penalty
      setPendingPenaltyTurnId(unconfirmedPenalty.turn_id);
      setChoice("penalty");
      return;
    }

    setPending(true);
    const postTurn: PostStartTurn = {
      team_id: team.team.team_id,
      game_id: team.team.game_id,
      dice1: null,
      dice2: null,
      penalty: true,
    };
    const turn = await startTurn(postTurn);
    setPendingPenaltyTurnId(turn.turn_id);
    setPending(false);
    setChoice("penalty");
  };

  if (choice === "penalty" && pendingPenaltyTurnId) {
    return (
      <AddTeamPenaltyDialogue
        team={team}
        turnId={pendingPenaltyTurnId}
        onClose={() => {
          setChoice(null);
          setOpen(false);
        }}
      />
    );
  }

  if (
    (choice === "assistant" || assistant || !USE_ASSISTANT_REFEREES) &&
    unconfirmedTurn
  ) {
    return (
      <AssistantRefereeDialogue
        team={team}
        turn={unconfirmedTurn!}
        setOpen={setOpen}
      />
    );
  }

  if (choice === "teleport") {
    return (
      <TeleportDialogue
        team={team}
        board={board}
        setOpen={() => {
          setChoice(null);
          setOpen(false);
        }}
      />
    );
  }

  const setDiceOpen = (open: boolean) => {
    setChoice(open ? "turn" : null);
    setOpen(open);
  };

  const onActionDone = () => {
    if (!KEEP_DIALOGUE_OPEN_ON_ACTIONS) {
      setChoice(null);
      setOpen(false);
    }
  };

  return (
    <PopUpDialogue
      setOpen={setOpen}
      title={`Vuoro joukkueelle ${team.team.team_name}`}
      disabled={pending}
    >
      <div className="w-100 flex flex-col gap-6 p-4">
        <h3>
          Joukkue:{" "}
          <span className="text-primary-900">{team.team.team_name}</span>
        </h3>
        <AddTeamTurnButton
          team={team}
          referee
          allowDice={!USE_SECRETARIES}
          diceOpen={choice === "turn"}
          setDiceOpen={setDiceOpen}
          onAssistant={() => setChoice("assistant")}
          onActionDone={onActionDone}
        />
        <button
          className="button text-xl p-5"
          onClick={handleAddPenalty}
          disabled={pending}
        >
          {unconfirmedPenalty ? "Jatka sakon luontia" : "Lisää sakko"}
        </button>
        <ToggleMoralVictoryButton team={team} referee />
        {ALLOW_TELEPORT && (
          <button
            className="button text-xl p-5"
            onClick={() => setChoice("teleport")}
          >
            Teleporttaa joukkue
          </button>
        )}
        {unconfirmedPenalty && (
          <p className="text-lg text-center">
            <em>HUOM!</em> Joukkueelle ollaan jo lisäämässä sakkoa!
          </p>
        )}
      </div>
    </PopUpDialogue>
  );
};

export const Dice = ({
  value,
  setValue,
  small,
}: {
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  small?: boolean;
}) => {
  return (
    <div className="flex flex-wrap mb-4 gap-x-2 gap-y-1 justify-center">
      {[1, 2, 3, 0, 4, 5, 6].map((i) =>
        i ? (
          <button
            key={i}
            type="button"
            className={`
            rounded
            cursor-pointer
            border-2
            text-3xl
            ${small ? "w-[12vw]" : "w-[24vw]"}
            md:w-[12vw]
            max-w-24
            aspect-square
            ${value === i ? "bg-primary-900 border-primary-500 text-white" : ""}`}
            onClick={() => setValue(i)}
          >
            {i}
          </button>
        ) : (
          <div key="0" className={`w-full ${small ? "hidden" : "md:hidden"}`} />
        ),
      )}
    </div>
  );
};

const statusPriority: Record<TurnStatus, number> = {
  [TurnStatus.WaitingForAssistantReferee]: 1,
  [TurnStatus.WaitingForPenalty]: 2,
  [TurnStatus.WaitingForIE]: 3,
  [TurnStatus.Mixing]: 4,
  [TurnStatus.Delivering]: 5,
  [TurnStatus.Drinking]: 6,
  [TurnStatus.WaitingForDice]: 7,
  [TurnStatus.Ended]: 8,
};

export const AddTeamTurnButton = ({
  team,
  diceOpen,
  setDiceOpen,
  onActionDone,
  onAssistant,
  pending: externalPending,
  setPending: setExternalPending,
  referee,
  allowDice,
}: {
  team: GameTeam;
  diceOpen: boolean;
  setDiceOpen: (open: boolean) => void;
  onActionDone?: () => void;
  onAssistant?: () => void;
  pending?: boolean;
  setPending?: (pending: boolean) => void;
  referee?: boolean;
  allowDice?: boolean;
}) => {
  const [localPending, setLocalPending] = useState(false);
  const pending = externalPending || localPending;

  const turnForDice = team.turns.find(
    (turn) => !turn.thrown_at && !turn.penalty,
  );
  const currentStatus = team.turns
    .filter((turn) => !turn.end_time)
    .reduce((latest, turn) => {
      const status = turnStatus(turn);
      return statusPriority[status] < statusPriority[latest] ? status : latest;
    }, TurnStatus.Ended);

  const canDice =
    turnForDice != null || (currentStatus === TurnStatus.Ended && allowDice);

  /** Creates a new pending turn without dice values. */
  const handleStartTurn = async () => {
    setLocalPending(true);
    setExternalPending?.(true);
    const postTurn: PostStartTurn = {
      team_id: team.team.team_id,
      game_id: team.team.game_id,
      dice1: null,
      dice2: null,
      penalty: false,
    };
    await startTurn(postTurn);
    setLocalPending(false);
    setExternalPending?.(false);
    onActionDone?.();
  };

  /** Ends all active turns for a team. */
  const handleEndTurn = async () => {
    setLocalPending(true);
    setExternalPending?.(true);
    await endTurn(team.team.team_id);
    setLocalPending(false);
    setExternalPending?.(false);
    onActionDone?.();
  };

  /** Marks the drinks as delivered for the current turn. */
  const handleDrinksDelivered = async () => {
    setLocalPending(true);
    setExternalPending?.(true);
    await setDrinkPrepStatus(
      team.turns.find((turn) => !turn.delivered_at)!.turn_id,
      "Delivered",
    );
    setLocalPending(false);
    setExternalPending?.(false);
    onActionDone?.();
  };

  return (
    <>
      {currentStatus === TurnStatus.Drinking ? (
        referee ? (
          <button
            className="button text-xl p-5"
            onClick={handleEndTurn}
            disabled={pending}
          >
            Juomat juotu!
          </button>
        ) : (
          <SimpleConfirmedButton
            buttonClassName="button text-xl p-5"
            buttonText="Juomat juotu!"
            dialogTitle="Vahvista vuoron päättyminen"
            dialogText="Oletko varma, että kaikki joukkueen juomat on juotu?"
            onAccept={handleEndTurn}
          />
        )
      ) : currentStatus === TurnStatus.WaitingForAssistantReferee &&
        onAssistant ? (
        <button
          className="button text-xl p-5"
          onClick={onAssistant}
          disabled={pending}
        >
          Aputuomaroi vuoro
        </button>
      ) : canDice ? (
        <button
          className="button text-xl p-5"
          onClick={() => setDiceOpen(true)}
          disabled={pending}
        >
          Kirjaa nopanheitto
        </button>
      ) : currentStatus === TurnStatus.Ended && referee ? (
        <button
          className="button text-xl p-5"
          onClick={handleStartTurn}
          disabled={pending}
        >
          Uusi vuoro (anna nopat)
        </button>
      ) : ALLOW_REFEREE_TO_DELIVER_DRINKS &&
        [
          TurnStatus.WaitingForIE,
          TurnStatus.Mixing,
          TurnStatus.Delivering,
        ].includes(currentStatus) &&
        referee ? (
        <button
          className="button text-xl p-5"
          onClick={handleDrinksDelivered}
          disabled={pending}
        >
          Juomat toimitettu
          <br />
          (ohita IE ja sihteeri)
        </button>
      ) : (
        <button className="button text-xl p-5" disabled>
          {currentStatus === TurnStatus.Ended
            ? "Odotetaan päätuomaria"
            : turnStatusTexts[currentStatus]}
        </button>
      )}
      {diceOpen && canDice && (
        <AddTeamTurnDialogue
          team={team}
          ongoingTurn={turnForDice}
          onClose={() => setDiceOpen(false)}
        />
      )}
      {!referee && (
        <p className="text-lg text-center h-[3.5em]">
          {secretaryInstructions[currentStatus]}
        </p>
      )}
    </>
  );
};

const secretaryInstructions: Record<TurnStatus, string> = {
  [TurnStatus.WaitingForDice]:
    "Kirjaa joukkueen nopanheitto kun noppia on heitetty.",
  [TurnStatus.WaitingForPenalty]: "Odota että sakot on kirjattu.",
  [TurnStatus.WaitingForAssistantReferee]:
    "Odota että aputuomari on vahvistanut vuoron.",
  [TurnStatus.WaitingForIE]: "Odota että IE kokkailee.",
  [TurnStatus.Mixing]: "Odota että IE kokkailee.",
  [TurnStatus.Delivering]: "Kuittaa alta, kun juomat toimitetaan joukkueelle.",
  [TurnStatus.Drinking]: "Kuittaa yltä, kun kaikki joukkueen juomat on juotu.",
  [TurnStatus.Ended]: "Odotetaan päätuomaria aloittamaan joukkueen vuoro.",
};

export function needDice(turn: Turn | undefined): {
  dice3: boolean;
  dice4: boolean;
} {
  return {
    dice3: !!turn?.dice3 || /\bD[12]\b/.test(turn?.place?.place.special ?? ""),
    dice4: !!turn?.dice4 || /\bD2\b/.test(turn?.place?.place.special ?? ""),
  };
}

const AddTeamTurnDialogue = ({
  team,
  ongoingTurn,
  onClose,
}: {
  team: GameTeam;
  ongoingTurn?: Turn;
  onClose: () => void;
}) => {
  const [dice1, setDice1] = useState<number>(ongoingTurn?.dice1 || 0);
  const [dice2, setDice2] = useState<number>(ongoingTurn?.dice2 || 0);
  const [dice3, setDice3] = useState<number>(ongoingTurn?.dice3 || 0);
  const [dice4, setDice4] = useState<number>(ongoingTurn?.dice4 || 0);
  const [pending, setPending] = useState(false);

  const need = needDice(ongoingTurn);

  const submitTurn = async () => {
    setPending(true);

    if (ongoingTurn) {
      // Update existing turn with dice values
      await changeDice(ongoingTurn.turn_id, {
        dice1,
        dice2,
        dice3: dice3 || null,
        dice4: dice4 || null,
      });
    } else {
      // Create new turn with dice values
      const postTurn: PostStartTurn = {
        team_id: team.team.team_id,
        game_id: team.team.game_id,
        dice1,
        dice2,
        penalty: false,
      };
      await startTurn(postTurn);
    }

    setPending(false);
    onClose();
  };

  return (
    <PopUpDialogue
      setOpen={() => onClose()}
      title={`Nopanheitto: ${team.team.team_name}`}
      disabled={pending}
    >
      <div className="flex flex-col gap-2 px-4 py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitTurn();
          }}
        >
          <div className="flex flex-col w-full gap-2">
            <h2>Noppa 1:</h2>
            <Dice
              value={dice1}
              setValue={setDice1}
              small={need.dice3 || need.dice4}
            />
            <h2>Noppa 2:</h2>
            <Dice
              value={dice2}
              setValue={setDice2}
              small={need.dice3 || need.dice4}
            />
            {need.dice3 && (
              <>
                <h2>Lisänoppa 1:</h2>
                <Dice
                  value={dice3}
                  setValue={setDice3}
                  small={need.dice3 || need.dice4}
                />
              </>
            )}
            {need.dice4 && (
              <>
                <h2>Lisänoppa 2:</h2>
                <Dice
                  value={dice4}
                  setValue={setDice4}
                  small={need.dice3 || need.dice4}
                />
              </>
            )}
          </div>
        </form>
        <div className="flex justify-between px-4 py-4">
          <button
            type="button"
            className="button text-xl p-4"
            onClick={onClose}
            disabled={pending}
          >
            Eiku
          </button>
          <button
            className="button text-xl p-4"
            type="button"
            onClick={submitTurn}
            disabled={dice1 === 0 || dice2 === 0 || pending}
          >
            {ongoingTurn?.thrown_at ? "Muuta heitot" : "Heitä"}
          </button>
        </div>
      </div>
    </PopUpDialogue>
  );
};

export const ToggleMoralVictoryButton = ({
  team,
  referee,
}: {
  team: GameTeam;
  referee: boolean;
}) => {
  const [pending, setPending] = useState(false);

  const toggleMoralVictory = async () => {
    setPending(true);
    await setMoralVictoryEligible(
      team.team.team_id,
      !team.team.moral_victory_eligible,
    );
    setPending(false);
  };

  return referee ? (
    <button className="button text-xl p-5" onClick={toggleMoralVictory}>
      {team.team.moral_victory_eligible
        ? "Merkitse laatta"
        : "Kumoa laattamerkintä"}
    </button>
  ) : (
    <SimpleConfirmedButton
      buttonClassName={`button text-xl p-5 ${!team.team.moral_victory_eligible ? "bg-slime-600/20" : ""}`}
      buttonText={
        team.team.moral_victory_eligible
          ? "Merkitse laatta"
          : "Joukkue on laatannut"
      }
      dialogTitle="Vahvista laattamerkintä"
      dialogText="Oletko varma, että haluat merkitä joukkueen laatanneeksi?"
      onAccept={toggleMoralVictory}
      disabled={pending || !team.team.moral_victory_eligible}
    />
  );
};

const AddTeamPenaltyDialogue = ({
  team,
  turnId,
  onClose,
}: {
  team: GameTeam;
  turnId: number;
  onClose: () => void;
}) => {
  const [penaltyDrinks, setPenaltyDrinks] = useState<TurnDrinks>({
    drinks: [],
  });
  const [pending, setPending] = useState(false);

  const handleSubmit = async () => {
    setPending(true);
    const drinks: TurnDrinks = {
      drinks: penaltyDrinks.drinks.filter((d) => d.n > 0),
    };
    await confirmPenalty(turnId, drinks);
    setPending(false);
    onClose();
  };

  const handleCancel = async () => {
    setPending(true);
    await cancelTurn(turnId);
    setPending(false);
    onClose();
  };

  const hasSelectedDrinks = penaltyDrinks.drinks.some((d) => d.n > 0);

  return (
    <PopUpDialogue
      setOpen={() => handleCancel()}
      title={`Sakko: ${team.team.team_name}`}
      disabled={pending}
    >
      <form
        className="w-[90vw] md:w-xl flex flex-col gap-2 h-[80dvh] max-h-200 px-4 py-2"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <DrinkSelectionList
          selectedDrinks={penaltyDrinks}
          setSelectedDrinks={setPenaltyDrinks}
        />
        <div className="flex justify-between px-4 py-4">
          <button
            type="button"
            className="button text-xl p-4"
            onClick={handleCancel}
            disabled={pending}
          >
            Eiku
          </button>
          <button
            type="button"
            className="button text-xl p-4"
            onClick={handleSubmit}
            disabled={!hasSelectedDrinks || pending}
          >
            Sakkoa
          </button>
        </div>
      </form>
    </PopUpDialogue>
  );
};

function addFavorites(
  turnDrinks: TurnDrinks,
  availableDrinks: Drink[],
): TurnDrinks {
  const favoriteDrinks = availableDrinks
    .filter((d) => d.favorite)
    .map((d) => ({
      drink: d,
      n: 0,
      on_table: 0,
      optional: false,
    }));
  const toAdd = favoriteDrinks.filter(
    (fd) => !turnDrinks.drinks.some((d) => d.drink.id === fd.drink.id),
  );
  return toAdd.length === 0
    ? turnDrinks
    : { drinks: [...turnDrinks.drinks, ...toAdd] };
}

const TeleportDialogue = ({
  team,
  board,
  setOpen,
}: {
  team: GameTeam;
  board?: BoardPlaces;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const [selected, setSelected] = useState<number>(-1);

  const handleTeleport = async () => {
    if (selected === -1) return;
    await teleportTeam(team.team.team_id, selected);
    setOpen(false);
  };

  return (
    <PopUpDialogue
      setOpen={setOpen}
      title={`Teleporttaa: ${team.team.team_name}`}
    >
      <div className="p-4 flex flex-col gap-4">
        <select
          id="placeType"
          value={selected}
          onChange={(e) => setSelected(+e.target.value)}
          className={`
          rounded-2xl
          border-4
          px-5 py-4
          w-full
          border-[var(--place-color)]
          focus:outline-none
          focus:border-[var(--place-color-selected)]`}
        >
          <option value={-1} disabled>
            Valitse kohde...
          </option>
          {board?.places.map((place) => (
            <option key={place.place_number} value={place.place_number}>
              {place.place.place_name} (#{place.place_number})
            </option>
          ))}
        </select>
        <button
          className="button text-xl p-4"
          onClick={handleTeleport}
          disabled={selected === -1}
        >
          Hyppää Harri!
        </button>
      </div>
    </PopUpDialogue>
  );
};

const AssistantRefereeDialogue = ({
  team,
  turn,
  setOpen,
}: {
  team: GameTeam;
  turn: Turn;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const [pending, setPending] = useState(false);
  const [changingDice, setChangingDice] = useState(false);
  const [turnDrinks, setTurnDrinks] = useState<TurnDrinks>(turn.drinks);
  const [prevServerDrinks, setPrevServerDrinks] = useState<TurnDrinks>(
    turn.drinks,
  );
  const [modified, setModified] = useState(false);

  // When server drinks change (e.g. after dice change), reset local state
  if (!deepEqual(turn.drinks, prevServerDrinks)) {
    setPrevServerDrinks(turn.drinks);
    setTurnDrinks(turn.drinks);
    setModified(false);
  }

  const hasOptionals = turnDrinks.drinks.some((d) => d.optional);
  const mustModify = hasOptionals && !modified;

  const handleSubmit = async () => {
    setPending(true);
    const drinks: TurnDrinks = {
      drinks: turnDrinks.drinks.filter((d) => d.n > 0),
    };
    await confirmTurn(turn.turn_id, drinks);
    setPending(false);
    // TODO issue #33
    setOpen(false);
  };

  const need = needDice(turn);
  const missingDice =
    (need.dice3 && !turn.dice3) || (need.dice4 && !turn.dice4);
  return (
    <PopUpDialogue
      setOpen={setOpen}
      title={`Vahvista vuoro: ${team.team.team_name}`}
      disabled={pending}
    >
      {changingDice && (
        <AddTeamTurnDialogue
          onClose={() => setChangingDice(false)}
          team={team}
          ongoingTurn={turn}
        />
      )}
      <form
        className={`
          w-[90dvw]
          h-[90dvh]
          max-w-6xl
          grid
          grid-cols-[auto_auto_1fr]
          ${turn.via ? "grid-rows-[auto_auto_auto_1fr_auto]" : "grid-rows-[auto_auto_1fr_auto]"}
          items-center
          gap-2
          px-4
          py-2
          overflow-y-auto`}
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <em className="justify-self-end">Heitot</em>
        <div className="border-l-2 self-stretch border-primary-900" />
        <div className="flex items-center gap-2">
          <span className="text-xl">
            {turn.dice1}&nbsp;+&nbsp;{turn.dice2}
          </span>
          {missingDice ? (
            <em>Lisänopanheittoja vaaditaan.</em>
          ) : need.dice4 ? (
            <>
              <em>Lisäheitot:</em>
              <span className="text-xl">
                {turn.dice3}&nbsp;+&nbsp;{turn.dice4}
              </span>
            </>
          ) : need.dice3 ? (
            <>
              <em>Lisäheitto:</em>
              <span className="text-xl">{turn.dice3}</span>
            </>
          ) : null}
          <button
            type="button"
            className="button"
            onClick={() => setChangingDice(true)}
          >
            Muuta heittoja
          </button>
          {turn.double_tampere && <em className="text-xl">Tupla-Tampere!</em>}
        </div>
        {turn.via && (
          <>
            <em className="justify-self-end">Välietappi</em>
            <div className="border-l-2 self-stretch border-primary-900" />
            <div className="flex flex-col gap-2 flex-1">
              <PlaceCard place={turn.via} className="max-w-full" />
              {turn.via.place.rule && (
                <p className="text-lg text-left hyphens-auto">
                  &quot;{turn.via.place.rule}&quot;
                </p>
              )}
            </div>
          </>
        )}
        <em className="justify-self-end">
          {turn.via ? "Päätepiste" : "Sääntö"}
        </em>
        <div className="border-l-2 self-stretch border-primary-900" />
        <div className="flex flex-col gap-2 flex-1">
          {turn.place ? (
            <PlaceCard place={turn.place} className="max-w-full" />
          ) : (
            <p>Paikkaa ei löydy!</p>
          )}
          {turn.place?.place.rule && (
            <p className="text-lg text-left hyphens-auto">
              &quot;{turn.place.place.rule}&quot;
            </p>
          )}
        </div>
        <em className="hidden lg:inline justify-self-end">Juomat</em>
        <div className="hidden lg:inline border-l-2 self-stretch border-primary-900" />
        <DrinkSelectionList
          selectedDrinks={turnDrinks}
          setSelectedDrinks={(fn) => {
            setTurnDrinks(fn);
            setModified(true);
          }}
        />
        <div className="col-span-3 flex justify-between items-center px-4 py-4">
          <button
            type="button"
            className="button text-xl p-4"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Eiku
          </button>
          {missingDice ? (
            <div className="text-lg">
              Klikkaa <em>Muuta heittoja</em> ja lisää lisänopanheitot
              vahvistaaksesi vuoron.
            </div>
          ) : mustModify ? (
            <div className="text-lg">
              <em>Ruutu sisältää vaihtoehtoja tai valinnaisia lisäjuomia. </em>
              Lue säännöt <em>huolella</em> ja muuta juomavalintoja
              vahvistaaksesi vuoron.
            </div>
          ) : (
            <button
              type="button"
              className="button text-xl p-4"
              onClick={handleSubmit}
              disabled={pending || missingDice || mustModify}
            >
              Vahvista vuoro
            </button>
          )}
        </div>
      </form>
    </PopUpDialogue>
  );
};

/** Drink selection list that fetches available drinks and merges favorites automatically.
 *
 * Favorites (with n=0) are shown in the display list but only pushed to
 * `setSelectedDrinks` when the user explicitly edits a drink. This means
 * auto-favorite-merging never triggers the caller's modification tracking.
 */
export function DrinkSelectionList({
  selectedDrinks,
  setSelectedDrinks,
  buttonText = "Lisää juoma",
}: {
  selectedDrinks: TurnDrinks;
  setSelectedDrinks: (fn: (prev: TurnDrinks) => TurnDrinks) => void;
  buttonText?: string;
}): JSX.Element {
  const [availableDrinks, setAvailableDrinks] = useState<Drink[]>([]);

  useEffect(() => {
    getDrinks().then((drinks) => {
      setAvailableDrinks(drinks.drink_ingredients.map((d) => d.drink));
    });
  }, []);

  // Merge favorites into the display list without touching parent state
  const displayDrinks = useMemo(
    () => addFavorites(selectedDrinks, availableDrinks),
    [selectedDrinks, availableDrinks],
  );

  // Wraps setSelectedDrinks to operate on the merged (display) list,
  // ensuring favorites are included when the user edits any drink.
  const handleUpdate = useCallback(
    (fn: (prev: TurnDrinks) => TurnDrinks) => {
      setSelectedDrinks((prev) => fn(addFavorites(prev, availableDrinks)));
    },
    [setSelectedDrinks, availableDrinks],
  );

  // Filter dropdown to exclude drinks already shown (including favorites)
  const filteredDrinks = availableDrinks.filter(
    (d) => !displayDrinks.drinks.some((td) => td.drink.id === d.id),
  );

  const onSelect = useCallback(
    (selected: Drink | undefined) => {
      if (!selected) return;
      handleUpdate((prev) => {
        if (prev.drinks.some((d) => d.drink.id === selected.id)) return prev;
        return {
          drinks: [
            ...prev.drinks,
            { drink: selected, n: 1, on_table: 0, optional: false },
          ],
        };
      });
    },
    [handleUpdate],
  );

  return (
    <div className="flex-1 self-stretch col-span-3 lg:col-span-1 flex flex-col min-h-40 w-full max-w-2xl mx-auto">
      <DrinkDropdown
        buttonText={buttonText}
        options={filteredDrinks}
        selectedOption={undefined}
        setSelectedOption={onSelect}
      />
      <div className="flex-1 min-h-0 flex flex-col gap-1 py-2 overflow-y-auto">
        {displayDrinks.drinks.length === 0 && (
          <p className="text-tertiary-500">Ei valittuja juomia</p>
        )}
        {displayDrinks.drinks.map((drink) => (
          <DrinkSelectionCard
            key={drink.drink.id}
            turnDrink={drink}
            updateDrinks={handleUpdate}
          />
        ))}
      </div>
    </div>
  );
}

export function DrinkSelectionCard({
  turnDrink,
  updateDrinks,
}: {
  turnDrink: TurnDrink;
  updateDrinks: (fn: (prev: TurnDrinks) => TurnDrinks) => void;
}): JSX.Element {
  const updateN = (change: number) => {
    updateDrinks((dr) => {
      const newN = turnDrink.n + change;
      // Don't go below 0
      if (newN < 0) return dr;
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
    <div className="flex gap-2 w-full box py-0 pr-0 center">
      <div className="w-1/2 flex flex-col">
        <div className="text-lg font-bold overflow-hidden text-ellipsis text-nowrap text-left">
          {turnDrink.drink.name}
        </div>
        <div className="contents md:flex gap-2">
          {turnDrink.on_table > 0 && (
            <div className="text-base text-left">
              Ruudussa: {turnDrink.on_table} kpl
            </div>
          )}
          {turnDrink.optional && (
            <div className="text-base text-left">
              <em>Valintoja</em>
            </div>
          )}
        </div>
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
