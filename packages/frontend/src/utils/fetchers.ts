"use server";

export async function getIngredients(): Promise<Ingredients> {
  const res = await fetch(process.env.API_URL + "/ingredients", {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    console.error(res.statusText);
  }

  return await res.json();
}
export async function addIngredient(
  ingredient: Ingredient,
  token: string | null,
) {
  const res: Response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/ingredients`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token ?? ""}`,
      },
      body: JSON.stringify(ingredient),
    },
  );
  return await res.json();
}
export async function addDrink(drink: Drink, token: string | null) {
  const res = await fetch("/api/drinks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ?? "",
    },
    body: JSON.stringify(drink),
  });
  return await res.json();
}
export async function deleteIngredient(
  drink_id: number,
  ingredient_id: number,
  token: string | null,
): Promise<Ingredient | null> {
  const res: Response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/drinks/ingredients/${drink_id}?ingredient_id=${ingredient_id}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token ?? ""}`,
      },
    },
  );
  return await res.json();
}
export async function getDrinkIngredients(
  drink_id: number,
): Promise<DrinkIngredients> {
  const res = await fetch(
    `${process.env.API_URL}/drinks/ingredients/${drink_id}`,
    {
      headers: { "Content-Type": "application/json" },
    },
  );

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return await res.json();
}
export async function deleteDrink(
  drink_id: number,
  token: string,
): Promise<{ number: number } | undefined> {
  const res = await fetch(`${process.env.API_URL}/drinks/${drink_id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `${token}` },
  });

  if (res.ok) {
    const data = await res.json();
    return await data.number;
  }
}
export async function getDrinks(): Promise<DrinksIngredients> {
  const res = await fetch(`${process.env.API_URL}/drinks`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} drinks`);

  return await res.json();
}
export async function getBoards(): Promise<Boards> {
  const res = await fetch(`${process.env.API_URL}/boards`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} boards`);

  return await res.json();
}
export async function addBoard(board: Board, token: string | null) {
  const res = await fetch(`${process.env.API_URL}/boards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${token ?? ""}`,
    },
    body: JSON.stringify(board),
  });
  if (!res.ok) console.error(`HTTP ${res.status}`);

  return res.status;
}
export async function getGames(): Promise<Games> {
  const res = await fetch(`${process.env.API_URL}/games`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} games`);

  return await res.json();
}
export async function getBoard(id: string): Promise<Board> {
  const res = await fetch(`${process.env.API_URL}/boards/${id}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return await res.json();
}
export async function postPlace(
  place: Place,
  token: string | null,
): Promise<number> {
  const res = await fetch(`${process.env.API_URL}/boards/places`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${token ?? ""}`,
    },
    body: JSON.stringify(place),
  });
  if (!res.ok) console.error(`HTTP ${res.status}`);

  return res.status;
}
export async function postBoardPlace(
  boardPlace: BoardPlace,
  token: string | null,
): Promise<number> {
  const res = await fetch(
    `${process.env.API_URL}/boards/places/${boardPlace.board_id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token ?? ""}`,
      },
      body: JSON.stringify(boardPlace),
    },
  );
  if (!res.ok) console.error(`HTTP ${res.status}`);

  return res.status;
}
export async function getPlacesNotInBoard(
  boardId: number,
): Promise<{ p: Places; bp: BoardPlaces }> {
  const res = await fetch(`${process.env.API_URL}/boards/places/${boardId}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) console.error(`HTTP ${res.status} not in board`);

  const data: BoardPlaces = await res.json();
  const resp = await fetch(`${process.env.API_URL}/boards/places`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) console.error(`HTTP ${resp.status}`);

  const allPlaces: Places = await resp.json();

  return {
    p: {
      places: allPlaces.places.filter(
        (place: Place) =>
          !data.places.some(
            (boardPlace) => boardPlace.place.place_id === place.place_id,
          ) || place.place_type === "Normal",
      ),
    },
    bp: data,
  };
}

export async function getBoardPlaces(boardId: string): Promise<BoardPlaces> {
  const res = await fetch(`${process.env.API_URL}/boards/places/${boardId}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) console.error(`HTTP ${res.status} board places`);

  return await res.json();
}
export async function updateCoordinates(
  boardId: number,
  place: BoardPlace,
  token: string,
): Promise<number> {
  const res = await fetch(
    `${process.env.API_URL}/boards/places/${boardId}/coordinate`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token}`,
      },
      body: JSON.stringify(place),
    },
  );

  if (!res.ok) console.error(`HTTP ${res.status}`);

  return await res.json();
}
export async function updatePlace(
  place: Place,
  token: string | null,
): Promise<number> {
  const res = await fetch(
    `${process.env.API_URL}/boards/places/update/${place.place_id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token ?? ""}`,
      },
      body: JSON.stringify(place),
    },
  );

  if (!res.ok) console.error(`HTTP ${res.status}`);

  return await res.json();
}
export async function addDrinksToPlace(
  drinks: PlaceDrinks,
  token: string | null,
): Promise<number> {
  const res = await fetch(`${process.env.API_URL}/boards/places/drinks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${token ?? ""}`,
    },
    body: JSON.stringify(drinks),
  });

  if (!res.ok) console.error(`HTTP ${res.status} adding drinks to place`);

  return await res.json();
}
export async function postToLogin(
  login: LoginInfo,
): Promise<UserSessionInfo | undefined> {
  const res = await fetch(`${process.env.API_URL_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(login),
  });

  if (!res.ok) {
    console.error(`HTTP ${res.status} login`);
    return;
  }
  return await res.json();
}
export async function verifyUserTypes(
  sessionToken: string,
): Promise<SessionInfo | undefined> {
  const res = await fetch(`${process.env.API_URL_BASE}/login`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${sessionToken}`,
    },
  });
  const body = await res.json();

  if (
    body.uid < 0 ||
    body.session_hash == "" ||
    body.user_types.user_types.length === 0
  ) {
    return undefined;
  }

  return body;
}
export async function create_user(
  user: UserCreateInfo,
  auth_token: string = "",
): Promise<UserSessionInfo> {
  const res = await fetch(`${process.env.API_URL_BASE}/login/create_user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${auth_token}`,
    },
    body: JSON.stringify(user),
  });
  console.log(JSON.stringify(res, null, 2));

  if (!res.ok) {
    console.log(res.statusText);
    console.log(res.body);
    throw new Error(`HTTP ${res.status} creating user`);
  }

  return await res.json();
}
export async function users_exist(): Promise<boolean> {
  const res = await fetch(`${process.env.API_URL_BASE}/login`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} users exist`);

  return await res.json();
}
