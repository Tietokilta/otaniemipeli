"use client";
import LoginComponent from "@/app/components/login-component";
import { useEffect, useState } from "react";
import SelectMode from "@/app/components/select-mode";
import { usersExist, verifySession } from "@/utils/fetchers";
import CreateFirstUser from "@/app/components/create-user-form";
import { GameLoadingSpinner } from "./components/game-components/game-loading-states";

export default function Home() {
  // Check for existing auth token on mount
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [firstUserExists, setFirstUserExists] = useState<boolean | null>(null);
  const [text, setText] = useState<string>("");

  // Check server status on mount
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!base) {
      setText("No NEXT_PUBLIC_API_BASE_URL environment variable");
      return;
    }
    fetch(base)
      .then((res) => res.text())
      .then(setText)
      .catch((err) =>
        setText((prev) => prev || "Failed to fetch server status: " + err),
      );
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoggedIn(false);
      return;
    }

    verifySession(token)
      .then((session) => setLoggedIn(!!session))
      .catch(() => setLoggedIn(false));
  }, []);

  // Check if users exist - only on mount
  useEffect(() => {
    usersExist()
      .then(setFirstUserExists)
      .catch((error) => {
        setText("Error checking if users exist: " + error);
      });
  }, []);

  return (
    <div className="flex flex-col items-center gap-3.5 max-h-[90dvh] p-4 sm:px-10 sm:py-4 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-2xl font-mono text-center mb-4">
        Tervetuloa Otaniemipelin hallintapaneeliin!
      </h1>
      <p className="text-center">{text}</p>
      {loggedIn == null || firstUserExists == null ? (
        <GameLoadingSpinner />
      ) : loggedIn ? (
        <SelectMode setLoginAction={setLoggedIn} />
      ) : firstUserExists ? (
        <LoginComponent setLoginAction={setLoggedIn} />
      ) : (
        <CreateFirstUser setLoginAction={setLoggedIn} firstUser={true} />
      )}
    </div>
  );
}
