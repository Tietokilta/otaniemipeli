export default function getUnion<T>(arr1: T[], arr2: T[]): T[] {
  return Array.from(new Set([...arr1, ...arr2]));
}
export const UserTypeEnum = {
  admin: "Admin",
  ie: "IE",
  referee: "Tuomari",
  secretary: "Sihteeri",
};
export const UserTypes: UserType[] = ["Admin", "Ie", "Referee", "Secretary"];
export function getUserTypeFromPath(pathname: string): UserType | null {
  const path = pathname.toLowerCase();
  for (const userType of UserTypes) {
    if (path.includes(`/${userType.toLowerCase()}`)) {
      return userType;
    }
  }
  return null;
}
export function teamsCurrentTurn(team: GameTeam): Turn | null {
  if (team.turns.length === 0) {
    return null;
  }
  const turn = team.turns.find((t) => !t.finished);
  if (!turn) {
    return null;
  }
  return turn;
}
