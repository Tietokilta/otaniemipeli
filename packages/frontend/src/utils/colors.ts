export function getPlaceColor(placeType: string, hover: boolean): string {
  const type = placeType.toLowerCase();
  switch (hover) {
    case true:
      switch (type) {
        case "normal":
          return "var(--color-normal-600)";
        case "food":
          return "var(--color-food-900)";
        case "guild":
          return "var(--color-guild-600)";
        case "sauna":
          return "var(--color-sauna-600)";
        case "special":
          return "var(--color-special-600)";
      }
      break;
    case false:
      switch (type) {
        case "normal":
          return "var(--color-normal-600)";
        case "food":
          return "var(--color-slime-600)";
        case "guild":
          return "var(--color-guild-600)";
        case "sauna":
          return "var(--color-sauna-900)";
        case "special":
          return "var(--color-special-900)";
      }
      break;
  }
  return "var(--color-secondary-500)"; // default to secondary color
}
