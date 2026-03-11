"use client";
import { verifySession } from "@/utils/fetchers";
import { toastError } from "@/utils/toast-error";
import { userTypeNames } from "@/utils/helpers";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function SelectMode({
  setLoginAction,
}: {
  setLoginAction: (loggedIn: boolean) => void;
}) {
  const router = useRouter();
  const [session, setSession] = React.useState<SessionInfo | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      verifySession(token)
        .then((response) => {
          if (response) {
            setSession(response);
          } else {
            setLoginAction(false);
            localStorage.removeItem("auth_token");
            router.refresh();
          }
        })
        .catch((error) => {
          toastError(error);
          setLoginAction(false);
          localStorage.removeItem("auth_token");
          router.refresh();
        });
    } else {
      setLoginAction(false);
      router.refresh();
    }
  }, [router, setLoginAction]);
  const handleLogout = () => {
    const url = "/login";
    fetch(process.env.NEXT_PUBLIC_API_BASE_URL + url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${localStorage.getItem("auth_token")}`,
      },
    })
      .catch(toastError)
      .finally(() => {
        localStorage.removeItem("auth_token");
        setLoginAction(false);
        router.refresh();
      });
  };

  if (!session) return null;
  return (
    <div className="flex flex-col items-center gap-4 sm:px-10 sm:py-4">
      <h2 className="text-tertiary-900 text-2xl font-bold">
        Valitse käyttötila:
      </h2>
      <div className="flex flex-col items-center gap-4 w-56">
        {session &&
          session.user_types.user_types.map((user_type) => (
            <Link
              className="button w-full select-none"
              key={user_type}
              href={`/${user_type.toLowerCase()}`}
            >
              {userTypeNames[user_type]}
            </Link>
          ))}
        <h2 className="text-tertiary-900 text-2xl font-bold">...tai...</h2>
        <button
          className="button w-full select-none"
          onClick={() => handleLogout()}
        >
          Kirjaudu ulos
        </button>
        <Link href="/websocket">websocket</Link>
      </div>
    </div>
  );
}
