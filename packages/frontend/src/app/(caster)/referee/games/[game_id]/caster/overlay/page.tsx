"use client";

import BoardWithSquares from "@/app/components/board-display-components/board-with-squares";
import { GameLoadingSpinner } from "@/app/components/game-components/game-loading-states";
import { computeTotals } from "@/app/components/team-components/team-turn-card";
import { TimeSince } from "@/app/components/time-since";
import { useGameBoard, useGameData } from "@/app/hooks/useGameData";
import { useSocket } from "@/app/template";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { CSSTransition } from "react-transition-group";
import { useOverlayStateKeys } from "../../../../../../(pages)/referee/games/[game_id]/caster/overlay-state-keys";
import { CasterTeamsList } from "./caster-teams-list";

/** Max animation time: stagger delay + flip duration. */
const TRANSITION_TIMEOUT = 2200;

function ListTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="
          text-5xl
          text-center
          bg-primary-100/75
          p-8
          rounded-full
          border-2
          border-tertiary-500
          caster-flip"
    >
      {children}
    </h2>
  );
}

export default function Page({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  const { game_id } = use(params);
  const [authError, setAuthError] = useState(false);
  const socket = useSocket();

  // Listen for unauthorized socket event
  useEffect(() => {
    if (!socket) return;
    const onUnauthorized = () => setAuthError(true);
    socket.on("unauthorized", onUnauthorized);
    return () => {
      socket.off("unauthorized", onUnauthorized);
    };
  }, [socket]);

  const { gameData, error, isLoading } = useGameData(socket, Number(game_id));
  const board = useGameBoard(gameData);
  const moralRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const overlayState = useOverlayStateKeys(Number(game_id));

  const preppedTeams = useMemo(
    () => gameData && gameData.teams.map((team) => computeTotals(team)),
    [gameData],
  );

  if (authError) {
    return (
      <div className="absolute inset-0 flex justify-center items-center text-2xl text-red-600">
        Kirjautuminen epäonnistui &mdash; kopioi URL uudelleen striimaajan
        sivulta.
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex justify-center items-center text-2xl">
        Virhe overlayssa&hellip;
      </div>
    );
  }

  if (isLoading || !gameData || !preppedTeams || !board) {
    return <GameLoadingSpinner />;
  }

  return (
    <>
      <div
        className="
        absolute
        top-4
        left-4
        z-50
        bg-primary-100/75
        border-2
        border-tertiary-500
        rounded-full
        px-6
        py-3
        text-3xl
        text-primary-900"
      >
        {gameData.game.name}
      </div>
      <div
        className="
        absolute
        top-4
        right-4
        z-50
        bg-primary-100/75
        border-2
        border-tertiary-500
        rounded-full
        px-6
        py-3
        text-3xl
        text-primary-900"
      >
        <TimeSince timestamp={gameData.game.start_time} />
      </div>
      {process.env.NODE_ENV === "development" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="background"
          src="https://placecats.com/1920/1080"
          // className="absolute inset-0 object-cover"
        />
      )}
      <CSSTransition
        in={overlayState === "MoralVictory"}
        nodeRef={moralRef}
        classNames="caster"
        timeout={TRANSITION_TIMEOUT}
        appear
        unmountOnExit
      >
        <div
          ref={moralRef}
          className={`
            absolute
            top-15 left-30 right-30
            flex
            flex-col
            items-center
            gap-8
            text-primary-900`}
        >
          <ListTitle>Moraalisen voiton tilanne</ListTitle>
          <CasterTeamsList teams={preppedTeams} mode="moral" />
        </div>
      </CSSTransition>
      <CSSTransition
        in={overlayState === "BoardProgress"}
        nodeRef={progressRef}
        classNames="caster"
        timeout={TRANSITION_TIMEOUT}
        appear
        unmountOnExit
      >
        <div
          ref={progressRef}
          className={`
            absolute
            top-15 left-30 right-30
            flex
            flex-col
            items-center
            gap-8
            text-primary-900`}
        >
          <ListTitle>Joukkueiden eteneminen</ListTitle>
          <CasterTeamsList teams={preppedTeams} mode="progress" board={board} />
        </div>
      </CSSTransition>
      <CSSTransition
        in={overlayState === "GameBoard"}
        nodeRef={boardRef}
        classNames="caster"
        timeout={TRANSITION_TIMEOUT}
        appear
        unmountOnExit
      >
        <div ref={boardRef}>
          <div
            className={`
            absolute
            inset-10
            flex
            justify-center
            items-center
            text-primary-900`}
          >
            <BoardWithSquares
              className="caster-wipe h-full !w-auto aspect-[420_/_244]"
              places={board}
            />
          </div>
        </div>
      </CSSTransition>
    </>
  );
}
