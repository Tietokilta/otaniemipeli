"use client";
import { login } from "@/utils/fetchers";
import Link from "next/link";
import { useState } from "react";

export default function LoginComponent({
  setLoginAction,
}: {
  setLoginAction: (loggedIn: boolean) => void;
}): JSX.Element {
  const [loginInfo, setLoginInfo] = useState<LoginInfo>({
    username: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);

  function handleLogin() {
    login(loginInfo).then((body) => {
      if (!body || !body.session || !body.session.session_hash) {
        console.error("Login failed: ", body);
        setError("Login failed");
        return;
      }
      localStorage.setItem("auth_token", body.session.session_hash);
      setLoginAction(true);
      setError(null);
    });
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      onKeyUp={(e) => {
        if (e.key === "Enter") {
          handleLogin();
        }
      }}
      className="flex flex-col center gap-4"
    >
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-2xl text-center border-b-1 border-primary-900">
          Kirjautuminen
        </h1>
        <input
          className="box text-lg text-center"
          type="text"
          placeholder="Käyttäjänimi"
          required={true}
          onChange={(e) =>
            setLoginInfo({
              ...loginInfo,
              username: e.target.value,
            })
          }
        />
        <input
          className="box text-lg text-center"
          type="password"
          placeholder="Salasana"
          required={true}
          onChange={(e) =>
            setLoginInfo({
              ...loginInfo,
              password: e.target.value,
            })
          }
        />
      </div>
      {error && <p className="text-center">{error}</p>}
      <button
        className="button select-none w-full"
        onClick={() => handleLogin()}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            handleLogin();
          }
        }}
      >
        Kirjaudu Sisään
      </button>
      <Link className="button w-4/5 text-sm" href="/follow">
        Jatka kirjautumatta
      </Link>
    </form>
  );
}
