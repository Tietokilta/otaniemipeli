import { getApiUrl, getApiBaseUrl } from "@/utils/env";

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

  if (requireAuth && getToken()) {
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
  return apiFetch<Ingredients>(`${getApiUrl()}/ingredients`);
}

export async function addIngredient(
  ingredient: Ingredient,
): Promise<Ingredient> {
  return apiFetch<Ingredient>(
    `${getApiUrl()}/ingredients`,
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
): Promise<void> {
  return apiFetchVoid(
    `${getApiUrl()}/drinks/ingredients/${drink_id}?ingredient_id=${ingredient_id}`,
    { method: "DELETE" },
    true,
  );
}

// Drink operations

export async function getDrinks(): Promise<DrinksIngredients> {
  return apiFetch<DrinksIngredients>(`${getApiUrl()}/drinks`);
}

export async function getDrinksWithIngredients(): Promise<DrinksIngredients> {
  return apiFetch<DrinksIngredients>(`${getApiUrl()}/drinks/ingredients`);
}

export async function getDrinkIngredients(
  drink_id: number,
): Promise<DrinkIngredients> {
  return apiFetch<DrinkIngredients>(
    `${getApiUrl()}/drinks/ingredients/${drink_id}`,
  );
}

export async function addDrink(drink: Drink): Promise<number> {
  return apiFetchStatus(
    `${getApiUrl()}/drinks`,
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
    `${getApiUrl()}/drinks/ingredients`,
    {
      method: "POST",
      body: JSON.stringify(toPost),
    },
    true,
  );
}

export async function updateDrink(drink: Drink): Promise<number> {
  return apiFetchStatus(
    `${getApiUrl()}/drinks`,
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
    `${getApiUrl()}/drinks/${drink_id}`,
    { method: "DELETE" },
    true,
  );
}

// Board operations

export async function getBoards(): Promise<Boards> {
  return apiFetch<Boards>(`${getApiUrl()}/boards`);
}

export async function getBoard(id: string): Promise<Board> {
  return apiFetch<Board>(`${getApiUrl()}/boards/${id}`);
}

export async function addBoard(board: Board): Promise<number> {
  return apiFetchStatus(
    `${getApiUrl()}/boards`,
    {
      method: "POST",
      body: JSON.stringify(board),
    },
    true,
  );
}

export async function getBoardPlaces(boardId: number): Promise<BoardPlaces> {
  return apiFetch<BoardPlaces>(`${getApiUrl()}/boards/places/${boardId}`);
}

/** Fetches all reusable place definitions. */
export async function getPlaces(): Promise<Places> {
  return apiFetch<Places>(`${getApiUrl()}/boards/places`);
}

export async function getPlacesNotInBoard(
  boardId: number,
): Promise<{ places: Places; board: BoardPlaces }> {
  const boardPlaces = await apiFetch<BoardPlaces>(
    `${getApiUrl()}/boards/places/${boardId}`,
  );
  const allPlaces = await apiFetch<Places>(`${getApiUrl()}/boards/places`);

  return {
    places: {
      places: allPlaces.places.filter(
        (place: Place) =>
          !boardPlaces.places.some(
            (boardPlace) => boardPlace.place.place_id === place.place_id,
          ) || place.place_type === "Normal",
      ),
    },
    board: boardPlaces,
  };
}

// Place operations

export async function createPlace(place: Place): Promise<number> {
  return apiFetchStatus(
    `${getApiUrl()}/boards/places`,
    {
      method: "POST",
      body: JSON.stringify(place),
    },
    true,
  );
}

export async function addBoardPlace(boardPlace: BoardPlace): Promise<number> {
  return apiFetchStatus(
    `${getApiUrl()}/boards/places/${boardPlace.board_id}`,
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
    `${getApiUrl()}/boards/places/${boardId}/coordinate`,
    {
      method: "PATCH",
      body: JSON.stringify(place),
    },
    true,
  );
}

export async function updatePlace(place: Place): Promise<number> {
  return apiFetch<number>(
    `${getApiUrl()}/boards/places/update/${place.place_id}`,
    {
      method: "PATCH",
      body: JSON.stringify(place),
    },
    true,
  );
}

export async function setPlaceDrinks(drinks: PlaceDrinks): Promise<number> {
  return apiFetch<number>(
    `${getApiUrl()}/boards/places/drinks`,
    {
      method: "PUT",
      body: JSON.stringify(drinks),
    },
    true,
  );
}

// Game operations

export async function getGames(): Promise<Games> {
  return apiFetch<Games>(`${getApiUrl()}/games`);
}

export async function createGame(game: PostGame): Promise<Game> {
  return apiFetch<Game>(
    `${getApiUrl()}/games`,
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
    `${getApiUrl()}/games/${gameId}/start`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    true,
  );
}

export async function createTeam(
  gameId: number,
  teamName: string,
): Promise<void> {
  const team: TeamNameUpdate = { team_name: teamName };
  return apiFetchVoid(
    `${getApiUrl()}/games/${gameId}/teams`,
    {
      method: "POST",
      body: JSON.stringify(team),
    },
    true,
  );
}

export async function updateTeam(
  gameId: number,
  teamId: number,
  teamName: string,
): Promise<void> {
  const team: TeamNameUpdate = { team_name: teamName };
  return apiFetchVoid(
    `${getApiUrl()}/games/${gameId}/teams/${teamId}`,
    {
      method: "PATCH",
      body: JSON.stringify(team),
    },
    true,
  );
}

export async function deleteTeam(
  gameId: number,
  teamId: number,
): Promise<void> {
  return apiFetchVoid(
    `${getApiUrl()}/games/${gameId}/teams/${teamId}`,
    {
      method: "DELETE",
    },
    true,
  );
}

export async function setMoralVictoryEligible(
  teamId: number,
  moralVictoryEligible: boolean,
): Promise<void> {
  return apiFetchVoid(
    `${getApiUrl()}/teams/${teamId}/moral-victory-eligible`,
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
    `${getApiUrl()}/turns`,
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
    `${getApiUrl()}/turns/${turnId}/dice`,
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
    `${getApiUrl()}/turns/${turnId}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({ drinks }),
    },
    true,
  );
}

export async function cancelTurn(turnId: number): Promise<void> {
  try {
    return await apiFetchVoid(
      `${getApiUrl()}/turns/${turnId}`,
      { method: "DELETE" },
      true,
    );
  } catch (error) {
    // If the turn is already gone (404), treat it as success (idempotent)
    if (error instanceof Error && error.message.includes("404")) {
      return;
    }
    throw error;
  }
}

export async function endTurn(teamId: number): Promise<void> {
  return apiFetchVoid(
    `${getApiUrl()}/teams/${teamId}/end-turn`,
    { method: "POST" },
    true,
  );
}

export async function teleportTeam(
  teamId: number,
  location: number,
): Promise<Turn> {
  return apiFetch<Turn>(
    `${getApiUrl()}/teams/${teamId}/teleport`,
    {
      method: "POST",
      body: JSON.stringify({ location }),
    },
    true,
  );
}

export async function confirmPenalty(
  turnId: number,
  drinks: TurnDrinks,
): Promise<void> {
  return apiFetchVoid(
    `${getApiUrl()}/turns/${turnId}/penalty`,
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
    `${getApiUrl()}/turns/${turnId}/prep-status`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    },
    true,
  );
}

/** Updates drinks on an already-confirmed turn (used by IE for "IE" special). */
export async function editTurnDrinks(
  turnId: number,
  drinks: TurnDrinks,
): Promise<void> {
  return apiFetchVoid(
    `${getApiUrl()}/turns/${turnId}/drinks`,
    {
      method: "PUT",
      body: JSON.stringify({ drinks }),
    },
    true,
  );
}

// User operations

export async function getUsers(): Promise<UsersPublic> {
  return apiFetch<UsersPublic>(`${getApiUrl()}/users`, {}, true);
}

export async function deleteUser(uid: number): Promise<void> {
  return apiFetchVoid(
    `${getApiUrl()}/users/${uid}`,
    { method: "DELETE" },
    true,
  );
}

// Authentication operations

export async function login(loginInfo: LoginInfo): Promise<UserSessionInfo> {
  return apiFetch<UserSessionInfo>(`${getApiBaseUrl()}/login`, {
    method: "POST",
    body: JSON.stringify(loginInfo),
  });
}

export async function verifySession(
  sessionToken: string,
): Promise<SessionInfo> {
  const body = await apiFetch<SessionInfo>(`${getApiBaseUrl()}/login`, {
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
    `${getApiBaseUrl()}/login/create_user`,
    {
      method: "POST",
      body: JSON.stringify(user),
    },
    true,
  );
}

export async function usersExist(): Promise<boolean> {
  return apiFetch<boolean>(`${getApiBaseUrl()}/login`);
}

/** Fetches server status message as plain text. */
export async function getServerStatus(): Promise<string> {
  if (!getApiBaseUrl()) {
    throw new Error("No NEXT_PUBLIC_API_BASE_URL environment variable");
  }
  const res = await fetch(getApiBaseUrl()!);
  return res.text();
}

/** Logs out the current session (or all sessions if `all` is true). */
export async function logout(all?: boolean): Promise<void> {
  const url = all ? "/login/all" : "/login";
  return apiFetchVoid(`${getApiBaseUrl()}${url}`, { method: "DELETE" }, true);
}
