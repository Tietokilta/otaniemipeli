export function getPlaceColor(placeType: string, hover: boolean): string {
  const type = placeType.toLowerCase();
  switch (hover) {
    case true:
      switch (type) {
        case "normal":
          return "#FEF612";
        case "food":
          return "#def37e";
        case "guild":
          return "#BED3EC";
        case "sauna":
          return "#F95D03";
        case "special":
          return "#FAB7A1";
      }
      break;
    case false:
      switch (type) {
        case "normal":
          return "#FEF612";
        case "food":
          return "#DEF37E";
        case "guild":
          return "#BED3EC";
        case "sauna":
          return "#F95D03";
        case "special":
          return "#FAB7A1";
      }
      break;
  }
  return "#EEC156";
}
