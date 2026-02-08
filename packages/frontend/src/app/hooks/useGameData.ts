"use client";

import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

export interface UseGameDataResult {
  gameData: GameData | undefined;
  error: string | null;
  isLoading: boolean;
  setGameData: React.Dispatch<React.SetStateAction<GameData | undefined>>;
}

/**
 * Custom hook to subscribe to game data updates via websocket.
 *
 * On mount, subscribes to the game room. The server sends initial game data
 * immediately upon subscription, and broadcasts updates when actions occur.
 *
 * @param socket - The socket.io socket instance
 * @param gameId - The game ID to subscribe to
 * @returns Game data, error state, loading state, and setter
 */
export function useGameData(
  socket: Socket | null,
  gameId: number,
): UseGameDataResult {
  const [gameData, setGameData] = useState<GameData | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!socket) {
      setIsLoading(true);
      return;
    }

    const onGameUpdate = (data: GameData) => {
      if (!data?.game) {
        setError("Invalid game data received.");
        return;
      }

      // Validate that the received game ID matches the subscribed one
      if (data.game.id !== gameId) {
        return;
      }

      setGameData(data);
      setIsLoading(false);
      setError(null);
    };

    const onError = (errorMsg: string) => {
      setError(errorMsg);
      setIsLoading(false);
    };

    const subscribe = () => {
      socket.emit("subscribe", { game_id: gameId });
    };

    // Listen for game updates and errors
    socket.on("game-update", onGameUpdate);
    socket.on("response-error", onError);

    // Subscribe when connected
    if (socket.connected) {
      subscribe();
    } else {
      socket.once("connect", subscribe);
    }

    return () => {
      socket.off("game-update", onGameUpdate);
      socket.off("response-error", onError);
    };
  }, [socket, gameId]);

  return { gameData, error, isLoading, setGameData };
}
