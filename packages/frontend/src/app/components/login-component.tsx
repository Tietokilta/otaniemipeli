"use client";
import React, { useState } from "react";
import { postToLogin } from "@/utils/fetchers";

export default function LoginComponent({
  setLoginAction,
}: {
  setLoginAction: React.Dispatch<React.SetStateAction<boolean>>;
}): JSX.Element {
  const [loginInfo, setLoginInfo] = useState<LoginInfo>({
    username: "",
    password: "",
  });

  function handleLogin() {
    postToLogin(loginInfo).then((body) => {
      if (!body) {
        console.error("Login failed: No response body");
        return;
      }
      const session = body.session;
      if (!session || !session.session_hash) {
        console.error("Login failed: Invalid session data", body);
        return;
      }
      localStorage.setItem("auth_token", session.session_hash);
      setLoginAction(true);
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
        <h1 className="font-bold text-2xl text-center border-b-1 border-juvu-sini-800">
          Kirjautuminen
        </h1>
        <input
          className="box text-lg text-center"
          type="text"
          placeholder="Käyttäjänimi"
          tabIndex={1}
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
          tabIndex={2}
          required={true}
          onChange={(e) =>
            setLoginInfo({
              ...loginInfo,
              password: e.target.value,
            })
          }
        />
      </div>
      <button
        className="button select-none w-full"
        tabIndex={3}
        onClick={() => handleLogin()}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            handleLogin();
          }
        }}
      >
        Kirjaudu Sisään
      </button>
      <a className="button w-4/5 text-sm" href="/follow" tabIndex={4}>
        Jatka kirjautumatta
      </a>
    </form>
  );
}
