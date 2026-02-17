"use client";

import { useCallback, useEffect, useState } from "react";
import ItemList from "@/app/components/item-list";
import SimpleConfirmedButton from "@/app/components/simple-confirmed-button";
import { deleteUser, getUsers } from "@/utils/fetchers";
import { userTypeNames } from "@/utils/helpers";

/** Displays a list of users with delete buttons. */
export default function UserList({
  className,
  refresh,
}: {
  className?: string;
  refresh?: unknown;
}) {
  const [users, setUsers] = useState<UserPublic[] | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(data.users);
    } catch {
      setUsers(null);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refresh]);

  const handleDelete = useCallback(
    async (uid: number) => {
      await deleteUser(uid);
      fetchUsers();
    },
    [fetchUsers],
  );

  return (
    <ItemList title="Käyttäjät" addDialog={null} className={className}>
      {users && users.length > 0 ? (
        users.map((user) => (
          <li
            key={user.uid}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex flex-col">
              <span className="font-bold">{user.username}</span>
              <span className="text-sm text-primary-600">
                {user.user_types.user_types
                  .map((t) => userTypeNames[t])
                  .join(", ")}
              </span>
            </div>
            <SimpleConfirmedButton
              buttonText="Poista"
              dialogTitle={`Poista ${user.username}`}
              dialogText={`Haluatko varmasti poistaa käyttäjän ${user.username}?`}
              buttonClassName="button"
              onAccept={() => handleDelete(user.uid)}
            />
          </li>
        ))
      ) : (
        <p>Ei käyttäjiä</p>
      )}
    </ItemList>
  );
}
