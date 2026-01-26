"use client";

import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

export interface UseGameDataOptions {
  /**
   * Maximum number of retry attempts
   * @default 5
   */
  maxRetries?: number;
  /**
   * Timeout between retries in milliseconds
   * @default 500
   */
  retryTimeout?: number;
}

export interface UseGameDataResult {
  gameData: GameData | undefined;
  error: string | null;
  isLoading: boolean;
  /**
   * Update the game data manually (useful for real-time updates)
   */
  setGameData: React.Dispatch<React.SetStateAction<GameData | undefined>>;
}

/**
 * Custom hook to fetch game data via socket.io with retry logic and error handling
 *
 * @param socket - The socket.io socket instance
 * @param gameId - The game ID to fetch data for
 * @param options - Optional configuration
 * @returns Game data, error state, loading state, and setter
 *
 * @example
 * const { gameData, error, isLoading } = useGameData(socket, gameId);
 */
export function useGameData(
  socket: Socket | null,
  gameId: number,
  options: UseGameDataOptions = {},
): UseGameDataResult {
  const { maxRetries = 5, retryTimeout = 1000 } = options;

  const [gameData, setGameData] = useState<GameData | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!socket) {
      setIsLoading(true);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;
    let attempts = 0;

    const request = () => {
      if (attempts >= maxRetries) {
        setError("Too many connect attempts, please try reloading the page.");
        setIsLoading(false);
        return;
      }
      if (resolved || attempts >= maxRetries) return;

      attempts++;
      console.log("Requesting game data for id:", gameId);
      socket.emit("game-data", gameId);

      timeoutId = setTimeout(() => {
        if (!resolved) {
          console.warn("No response, retrying…");
          request();
        }
      }, retryTimeout);
    };

    const onReply = (data: GameData) => {
      if (!data) {
        return;
      }
      if (!data.game) {
        setError("Game not found.");
        setIsLoading(false);
        return;
      }
      // Validate that the received game ID matches the requested one
      if (data.game.id !== gameId) {
        return;
      }

      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);

      console.log("Received game data:", data);
      setGameData(data);
      setIsLoading(false);
      setError(null);
    };

    socket.on("reply-game", onReply);

    if (socket.connected) {
      request();
    } else {
      socket.once("connect", request);
    }

    return () => {
      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      socket.off("reply-game", onReply);
    };
  }, [socket, gameId, maxRetries, retryTimeout]);

  return { gameData, error, isLoading, setGameData };
}
