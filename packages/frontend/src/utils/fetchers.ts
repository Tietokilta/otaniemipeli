const API_URL = process.env.NEXT_PUBLIC_API_URL;
const API_URL_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

function getToken(): string {
  return typeof window !== "undefined"
    ? (localStorage.getItem("auth_token") ?? "")
    : "";
}

/**
 * Generic API fetch helper with automatic error handling and JSON parsing
 */
async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  requireAuth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (requireAuth) {
    headers.Authorization = getToken();
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * API fetch that returns status code instead of JSON
 */
async function apiFetchStatus(
  url: string,
  options: RequestInit = {},
  requireAuth = false,
): Promise<number> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (requireAuth) {
    headers.Authorization = getToken();
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }

  return res.status;
}

/**
 * API fetch that returns void (no response body expected)
 */
async function apiFetchVoid(
  url: string,
  options: RequestInit = {},
  requireAuth = false,
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (requireAuth) {
    headers.Authorization = getToken();
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }
}

// Ingredient operations

export async function getIngredients(): Promise<Ingredients> {
  return apiFetch<Ingredients>(`${API_URL}/ingredients`);
}

export async function addIngredient(
  ingredient: Ingredient,
): Promise<Ingredient> {
  return apiFetch<Ingredient>(
    `${API_URL}/ingredients`,
    {
      method: "POST",
      body: JSON.stringify(ingredient),
    },
    true,
  );
}

export async function deleteIngredient(
  drink_id: number,
  ingredient_id: number,
): Promise<number> {
  return apiFetchStatus(
    `${API_URL}/drinks/ingredients/${drink_id}?ingredient_id=${ingredient_id}`,
    { method: "DELETE" },
    true,
  );
}

// Drink operations

export async function getDrinks(): Promise<DrinksIngredients> {
  return apiFetch<DrinksIngredients>(`${API_URL}/drinks`);
}

export async function getDrinksWithIngredients(): Promise<DrinksIngredients> {
  return apiFetch<DrinksIngredients>(`${API_URL}/drinks/ingredients`);
}

export async function getDrinkIngredients(
  drink_id: number,
): Promise<DrinkIngredients> {
  return apiFetch<DrinkIngredients>(
    `${API_URL}/drinks/ingredients/${drink_id}`,
  );
}

export async function addDrink(drink: Drink): Promise<number> {
  return apiFetchStatus(
    `${API_URL}/drinks`,
    {
      method: "POST",
      body: JSON.stringify(drink),
    },
    true,
  );
}

export async function addDrinkIngredient(
  toPost: DrinkIngredientsPost,
): Promise<number> {
  return apiFetchStatus(
    `${API_URL}/drinks/ingredients`,
    {
      method: "POST",
      body: JSON.stringify(toPost),
    },
    true,
  );
}

export async function updateDrink(drink: Drink): Promise<number> {
  return apiFetchStatus(
    `${API_URL}/drinks`,
    {
      method: "PATCH",
      body: JSON.stringify(drink),
    },
    true,
  );
}

export async function deleteDrink(
  drink_id: number,
): Promise<{ number: number }> {
  return apiFetch<{ number: number }>(
    `${API_URL}/drinks/${drink_id}`,
    { method: "DELETE" },
    true,
  );
}

// Board operations

export async function getBoards(): Promise<Boards> {
  return apiFetch<Boards>(`${API_URL}/boards`);
}

export async function getBoard(id: string): Promise<Board> {
  return apiFetch<Board>(`${API_URL}/boards/${id}`);
}

export async function addBoard(board: Board): Promise<number> {
  return apiFetchStatus(
    `${API_URL}/boards`,
    {
      method: "POST",
      body: JSON.stringify(board),
    },
    true,
  );
}

export async function getBoardPlaces(boardId: number): Promise<BoardPlaces> {
  return apiFetch<BoardPlaces>(`${API_URL}/boards/places/${boardId}`);
}

export async function getPlacesNotInBoard(
  boardId: number,
): Promise<{ p: Places; bp: BoardPlaces }> {
  const boardPlaces = await apiFetch<BoardPlaces>(
    `${API_URL}/boards/places/${boardId}`,
  );
  const allPlaces = await apiFetch<Places>(`${API_URL}/boards/places`);

  return {
    p: {
      places: allPlaces.places.filter(
        (place: Place) =>
          !boardPlaces.places.some(
            (boardPlace) => boardPlace.place.place_id === place.place_id,
          ) || place.place_type === "Normal",
      ),
    },
    bp: boardPlaces,
  };
}

// Place operations

export async function createPlace(place: Place): Promise<number> {
  return apiFetchStatus(
    `${API_URL}/boards/places`,
    {
      method: "POST",
      body: JSON.stringify(place),
    },
    true,
  );
}

export async function addBoardPlace(boardPlace: BoardPlace): Promise<number> {
  return apiFetchStatus(
    `${API_URL}/boards/places/${boardPlace.board_id}`,
    {
      method: "POST",
      body: JSON.stringify(boardPlace),
    },
    true,
  );
}

export async function updateCoordinates(
  boardId: number,
  place: BoardPlace,
): Promise<number> {
  return apiFetch<number>(
    `${API_URL}/boards/places/${boardId}/coordinate`,
    {
      method: "PATCH",
      body: JSON.stringify(place),
    },
    true,
  );
}

export async function updatePlace(place: Place): Promise<number> {
  return apiFetch<number>(
    `${API_URL}/boards/places/update/${place.place_id}`,
    {
      method: "PATCH",
      body: JSON.stringify(place),
    },
    true,
  );
}

export async function addDrinksToPlace(drinks: PlaceDrinks): Promise<number> {
  return apiFetch<number>(
    `${API_URL}/boards/places/drinks`,
    {
      method: "POST",
      body: JSON.stringify(drinks),
    },
    true,
  );
}

// Game operations

export async function getGames(): Promise<Games> {
  return apiFetch<Games>(`${API_URL}/games`);
}

export async function createGame(game: PostGame): Promise<Game> {
  return apiFetch<Game>(
    `${API_URL}/games`,
    {
      method: "POST",
      body: JSON.stringify(game),
    },
    true,
  );
}

export async function startGame(
  gameId: number,
  data: FirstTurnPost,
): Promise<void> {
  return apiFetchVoid(
    `${API_URL}/games/${gameId}/start`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    true,
  );
}

export async function createTeam(gameId: number, team: Team): Promise<void> {
  return apiFetchVoid(
    `${API_URL}/games/${gameId}/teams`,
    {
      method: "POST",
      body: JSON.stringify(team),
    },
    true,
  );
}

export async function setMoralVictoryEligible(
  teamId: number,
  moralVictoryEligible: boolean,
): Promise<void> {
  return apiFetchVoid(
    `${API_URL}/teams/${teamId}/moral-victory-eligible`,
    {
      method: "PUT",
      body: JSON.stringify({ moral_victory_eligible: moralVictoryEligible }),
    },
    true,
  );
}

// Turn operations

export async function startTurn(data: PostStartTurn): Promise<Turn> {
  return apiFetch<Turn>(
    `${API_URL}/turns`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    true,
  );
}

export async function changeDice(
  turnId: number,
  body: ChangeDiceBody,
): Promise<void> {
  return apiFetchVoid(
    `${API_URL}/turns/${turnId}/dice`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
    true,
  );
}

export async function confirmTurn(
  turnId: number,
  drinks: TurnDrinks,
): Promise<void> {
  return apiFetchVoid(
    `${API_URL}/turns/${turnId}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({ drinks }),
    },
    true,
  );
}

export async function cancelTurn(turnId: number): Promise<void> {
  return apiFetchVoid(`${API_URL}/turns/${turnId}`, { method: "DELETE" }, true);
}

export async function endTurn(teamId: number): Promise<void> {
  return apiFetchVoid(
    `${API_URL}/teams/${teamId}/end-turn`,
    { method: "POST" },
    true,
  );
}

export async function confirmPenalty(
  turnId: number,
  drinks: TurnDrinks,
): Promise<void> {
  return apiFetchVoid(
    `${API_URL}/turns/${turnId}/penalty`,
    {
      method: "POST",
      body: JSON.stringify({ drinks }),
    },
    true,
  );
}

export async function setDrinkPrepStatus(
  turnId: number,
  status: DrinkPrepStatus,
): Promise<void> {
  return apiFetchVoid(
    `${API_URL}/turns/${turnId}/prep-status`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    },
    true,
  );
}

// Authentication operations

export async function login(loginInfo: LoginInfo): Promise<UserSessionInfo> {
  return apiFetch<UserSessionInfo>(`${API_URL_BASE}/login`, {
    method: "POST",
    body: JSON.stringify(loginInfo),
  });
}

export async function verifySession(
  sessionToken: string,
): Promise<SessionInfo> {
  const body = await apiFetch<SessionInfo>(`${API_URL_BASE}/login`, {
    method: "PUT",
    headers: { Authorization: sessionToken },
  });

  if (
    body.uid < 0 ||
    body.session_hash === "" ||
    body.user_types.user_types.length === 0
  ) {
    throw new Error("Invalid session data");
  }

  return body;
}

export async function createUser(
  user: UserCreateInfo,
): Promise<UserSessionInfo> {
  return apiFetch<UserSessionInfo>(
    `${API_URL_BASE}/login/create_user`,
    {
      method: "POST",
      body: JSON.stringify(user),
    },
    true,
  );
}

export async function usersExist(): Promise<boolean> {
  return apiFetch<boolean>(`${API_URL_BASE}/login`);
}
