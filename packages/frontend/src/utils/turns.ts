export enum TurnStatus {
  WaitingForDice,
  WaitingForPenalty,
  WaitingForAssistantReferee,
  WaitingForIE,
  Mixing,
  Delivering,
  Drinking,
  Ended,
}

export const turnStatusTexts: Record<TurnStatus, string> = {
  [TurnStatus.WaitingForDice]: "Odottaa nopanheittoa",
  [TurnStatus.WaitingForPenalty]: "Sakkoa luodaan",
  [TurnStatus.WaitingForAssistantReferee]: "Odottaa aputuomaria",
  [TurnStatus.WaitingForIE]: "Odottaa IE:tä",
  [TurnStatus.Mixing]: "Juomat työn alla",
  [TurnStatus.Delivering]: "Juomat matkalla",
  [TurnStatus.Drinking]: "Dokaaminen käynnissä",
  [TurnStatus.Ended]: "Valmiina!",
};

export function turnStatus(turn: Turn): TurnStatus {
  if (turn.end_time) return TurnStatus.Ended;
  if (turn.delivered_at) return TurnStatus.Drinking;
  if (turn.mixed_at) return TurnStatus.Delivering;
  if (turn.mixing_at) return TurnStatus.Mixing;
  if (turn.confirmed_at) return TurnStatus.WaitingForIE;
  if (turn.thrown_at) return TurnStatus.WaitingForAssistantReferee;
  if (turn.penalty) return TurnStatus.WaitingForPenalty;
  return TurnStatus.WaitingForDice;
}

export const turnStatusText = (turn: Turn): string =>
  turnStatusTexts[turnStatus(turn)];
