export default function getUnion<T>(arr1: T[], arr2: T[]): T[] {
  return Array.from(new Set([...arr1, ...arr2]));
}
export const UserTypeEnum = {
  Admin: "Admin",
  Ie: "IE",
  Referee: "Tuomari",
  Secretary: "Sihteeri",
  Team: "Joukkue",
};
export const UserTypes: UserType[] = [
  "Admin",
  "Ie",
  "Referee",
  "Secretary",
  "Team",
];
export function getUserTypeFromPath(pathname: string): UserType | null {
  const path = pathname.toLowerCase();
  for (const userType of UserTypes) {
    if (path.includes(`/${userType.toLowerCase()}`)) {
      return userType;
    }
  }
  return null;
}
