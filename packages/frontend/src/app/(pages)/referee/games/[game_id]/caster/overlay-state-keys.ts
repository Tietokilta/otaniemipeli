import { useSocket } from "@/app/template";
import { setOverlayState } from "@/utils/fetchers";
import { useEffect, useState } from "react";

export const OVERLAY_KEYS: Record<string, OverlayState> = {
  "1": "None",
  "2": "MoralVictory",
  "3": "BoardProgress",
  "4": "GameBoard",
};

export function useOverlayStateKeys(game_id: number) {
  const socket = useSocket();

  const [state, setState] = useState<OverlayState>("None");
  useEffect(() => {
    if (!socket) return;

    const onOverlayState = (state: OverlayState) => {
      setState(state);
    };

    socket.on("overlay-state", onOverlayState);
    return () => {
      socket.off("overlay-state", onOverlayState);
    };
  }, [socket]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = OVERLAY_KEYS[e.key];
      if (!state) return;
      setOverlayState(Number(game_id), state);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game_id]);

  return state;
}
