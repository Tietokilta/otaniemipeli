import React from "react";

interface GameLoadingSpinnerProps {
  className?: string;
}

export function GameLoadingSpinner({ className }: GameLoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center h-full ${className || ""}`}
    >
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tertiary-900"></div>
    </div>
  );
}

interface GameErrorDisplayProps {
  error: string;
  className?: string;
}

export function GameErrorDisplay({ error, className }: GameErrorDisplayProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center h-full ${className || ""}`}
    >
      <h1 className="text-alert-500 text-2xl font-bold mb-4">{error}</h1>
    </div>
  );
}
