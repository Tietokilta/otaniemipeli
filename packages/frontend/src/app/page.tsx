"use client";
import LoginComponent from "@/app/components/login-component";
import { useEffect, useState } from "react";
import SelectMode from "@/app/components/select-mode";
import { users_exist } from "@/utils/fetchers";
import CreateFirstUser from "@/app/components/create-user-form";

export default function Home() {
  const [loggedIn, setLogin] = useState<boolean>(false);
  const [firstUserExists, setFirstUserExists] = useState<boolean>(false);
  const [text, setText] = useState<string>("");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!base) {
      setText("No NEXT_PUBLIC_API_BASE_URL environment variable");
      return;
    }
    fetch(base)
      .then((res) => res.text())
      .then(setText)
      .catch((err) => setText("Failed to fetch base:" + err));
  }, []);

  useEffect(() => {
    users_exist()
      .then((data: boolean) => {
        setFirstUserExists(data);
      })
      .catch((error) => {
        console.error("Error checking if users exist:", error);
      });
    const userString = localStorage.getItem("auth_token") || "";
    if (userString) {
      setLogin(true);
      setFirstUserExists(true);
    }
  }, [loggedIn, firstUserExists]);

  return (
    <div className="flex flex-col items-center gap-3.5 max-h-[90dvh] sm:px-10 sm:py-4 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-2xl font-mono">
        Tervetuloa Otaniemipelin hallintapaneeliin!
      </h1>
      <p>{text}</p>
      {loggedIn ? (
        <SelectMode setLoginAction={setLogin} />
      ) : firstUserExists ? (
        <LoginComponent setLoginAction={setLogin} />
      ) : (
        <CreateFirstUser setLoginAction={setLogin} firstUser={true} />
      )}
    </div>
  );
}
