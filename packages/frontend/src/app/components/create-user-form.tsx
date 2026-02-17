"use client";
import DropdownMenu from "@/app/components/dropdown-menu";
import { createUser, verifySession } from "@/utils/fetchers";
import { userTypeNames, UserTypes } from "@/utils/helpers";
import { SubmitEvent, useCallback, useEffect, useRef, useState } from "react";

export default function CreateUserForm({
  setLoginAction,
  firstUser = false,
  className,
  onCreate,
}: {
  setLoginAction?: (loggedIn: boolean) => void;
  firstUser?: boolean;
  className?: string;
  onCreate?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<UserType>("Secretary");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    if (firstUser) return;
    const token = localStorage.getItem("auth_token");
    verifySession(token ?? "").then((ses) => {
      if (ses) setSession(ses);
    });
  }, [firstUser]);

  const pwsMatch = passwordConfirm === password && password.length > 0;

  const handleSend = useCallback(async () => {
    if (!pwsMatch) {
      console.log("Passwords do not match");
      return;
    }
    const res = await createUser({
      username,
      email,
      user_type: userType,
      password,
    });
    if (res && setLoginAction) {
      // first user being created, log in immediately
      localStorage.setItem("auth_token", res.session.session_hash);
      setLoginAction(true);
    }
    onCreate?.();
    setUsername("");
    setEmail("");
    setUserType("Secretary");
    setPassword("");
    setPasswordConfirm("");
  }, [setLoginAction, onCreate, username, email, userType, password, pwsMatch]);

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className={`${className} box flex flex-col`}>
      <h1>Luo {firstUser && "ensimmäinen"} käyttäjä</h1>
      <form className="flex flex-col gap-3.5" ref={formRef} onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Käyttäjänimi"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="text"
          placeholder="Sähköposti"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Salasana"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="Vahvista salasana"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
        />
        {!pwsMatch && passwordConfirm.length != 0 && (
          <p className="text-alert-900">Salasanat eivät täsmää</p>
        )}
        {!firstUser && (
          <DropdownMenu
            buttonText="Käyttäjätyyppi"
            options={session ? session.user_types.user_types : UserTypes}
            selectedOption={userType}
            setSelectedOption={(option) => option && setUserType(option)}
            renderOption={(option) => userTypeNames[option]}
          />
        )}
        <button type="submit" className="button text-lg">
          Luo käyttäjä
        </button>
      </form>
    </div>
  );
}
