"use client";
import { useRouter } from "next/navigation";
import { verifySession } from "@/utils/fetchers";
import React, { useEffect } from "react";
import { UserTypeEnum } from "@/utils/helpers";

export default function SelectMode({
  setLoginAction,
}: {
  setLoginAction: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const [session, setSession] = React.useState<SessionInfo | null>(null);
  const [, setLoading] = React.useState(true);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem("auth_token");
    console.log(token);
    if (token) {
      verifySession(token)
        .then((response) => {
          console.log("Response: ", response);
          if (response) {
            setSession(response);
          } else {
            console.error("User verification failed, redirecting to login.");
            setLoginAction(false);
            localStorage.removeItem("auth_token");
            router.refresh();
          }
        })
        .catch((error) => {
          console.error("Error verifying user types:", error);
          setLoginAction(false);
          localStorage.removeItem("auth_token");
          router.refresh();
        })
        .finally(() => {
          setLoading(false);
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
      .then()
      .catch((err) => {
        console.error("Logout failed:", err);
      })
      .finally(() => {
        localStorage.removeItem("auth_token");
        setLoginAction(false);
        router.refresh();
      });
  };

  if (!session) return null;
  return (
    <div className="flex flex-col items-center gap-3.5 max-h-[90dvh] sm:px-10 sm:py-4 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-tertiary-900 text-2xl font-bold">
        Valitse käyttötila:
      </h1>
      <div className="flex flex-col items-center gap-3.5 w-56">
        {session &&
          session.user_types.user_types.map((user_type) => (
            <a
              className="button w-full center select-none"
              key={user_type}
              href={`/${user_type.toLowerCase()}`}
            >
              {UserTypeEnum[user_type]}
            </a>
          ))}
        <h1 className="text-tertiary-900 text-2xl font-bold">...tai...</h1>
        <button
          className="button w-full center select-none"
          onClick={() => handleLogout()}
        >
          Kirjaudu ulos
        </button>
        <a href="/websocket">websocket</a>
      </div>
    </div>
  );
}
