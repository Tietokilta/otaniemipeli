export enum TurnStatus {
  WaitingForDice,
  WaitingForExtraDice,
  WaitingForPenalty,
  WaitingForYkkonen,
  WaitingForAssistantReferee,
  WaitingForIE,
  Mixing,
  Delivering,
  Drinking,
  Ended,
}

export const turnStatusTexts: Record<TurnStatus, string> = {
  [TurnStatus.WaitingForDice]: "Odottaa nopanheittoa",
  [TurnStatus.WaitingForExtraDice]: "Odottaa lisänoppia",
  [TurnStatus.WaitingForPenalty]: "Sakkoa luodaan",
  [TurnStatus.WaitingForYkkonen]: "Pelaamassa ykköstä",
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
  if (turn.thrown_at && turn.needs_extra_dice)
    return TurnStatus.WaitingForExtraDice;
  if (turn.thrown_at && turn.place?.place.special === "ykkonen")
    return TurnStatus.WaitingForYkkonen;
  if (turn.thrown_at) return TurnStatus.WaitingForAssistantReferee;
  if (turn.penalty) return TurnStatus.WaitingForPenalty;
  return TurnStatus.WaitingForDice;
}

export const turnStatusText = (turn: Turn): string =>
  turnStatusTexts[turnStatus(turn)];

export function extraDiceNeeds(turn: Turn | undefined) {
  const has3 = !!turn?.dice3;
  const has4 = !!turn?.dice4;
  const needs3 = turn?.needs_extra_dice != null && turn.needs_extra_dice >= 1;
  const needs4 = turn?.needs_extra_dice != null && turn.needs_extra_dice >= 2;
  return {
    dice3: has3 || needs3,
    dice4: has4 || needs4,
    missing: needs3 || needs4,
  };
}

/** Returns true if the team needs a head referee (has completed all turns). */
export function needsHeadReferee(team: GameTeam): boolean {
  return team.turns.every((turn) => turn.end_time);
}

/** Returns true if the turn next needs dice. */
export function needsDice(turn: Turn) {
  return !turn.penalty && (!turn.thrown_at || extraDiceNeeds(turn).missing);
}

/** Returns true if the turn is waiting for the ykkonen minigame to finish. */
export function needsYkkonen(turn: Turn): boolean {
  return needsAssistantReferee(turn) && turn.place?.place.special === "ykkonen";
}

/** Returns true if the turn next needs confirmation from an assistant referee. */
export function needsAssistantReferee(turn: Turn): boolean {
  return !turn.penalty && !needsDice(turn) && !turn.confirmed_at;
}

/** Returns the unconfirmed turn if one exists. */
export function getTurnNeedingAssistantReferee(
  team: GameTeam,
): Turn | undefined {
  // The penalty check is slightly redundant since penalty turns can't be thrown+unconfirmed.
  return team.turns.findLast(needsAssistantReferee);
}

export const findAssistantRefereeTurnId = (
  teams: GameTeam[],
): number | undefined =>
  teams
    .map(getTurnNeedingAssistantReferee)
    .filter(Boolean)
    .sort((a, b) => (a!.thrown_at! < b!.thrown_at! ? -1 : 1))[0]?.turn_id;

/** Returns the turn needing dice if one exists. */
export function getTurnNeedingDice(team: GameTeam): Turn | undefined {
  return team.turns.find(needsDice);
}

/** Returns the unconfirmed penalty turn if one exists. */
export function getUnconfirmedPenalty(team: GameTeam): Turn | undefined {
  return team.turns.findLast((turn) => turn.penalty && !turn.confirmed_at);
}

/** Returns the turn last confirmed by an assistant referee but not ended, if one exists. */
export function getLatestConfirmedTurn(team: GameTeam): Turn | undefined {
  return team.turns.findLast(
    (turn) => !turn.penalty && turn.confirmed_at && !turn.end_time,
  );
}
