"use client";
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { create_user, verifyUserTypes } from "@/utils/fetchers";
import { useRouter } from "next/navigation";
import { UserTypeEnum, UserTypes } from "@/utils/helpers";
import DropdownMenu from "@/app/components/dropdown-menu";

export default function CreateUserForm({
  setLoginAction,
  firstUser = false,
  className,
}: {
  setLoginAction?: Dispatch<SetStateAction<boolean>>;
  firstUser?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [userType, setUserType] = useState<
    { id: string; name: string } | undefined
  >(undefined);

  const [user, setUser] = useState<UserCreateInfo>({
    username: "",
    email: "",
    password: "",
    user_type: firstUser ? "Admin" : "Secretary",
  });
  const [passwordConfirm, setPasswordConfirm] = useState<{
    pw: string;
    pw_confirm: string;
  }>({
    pw: "",
    pw_confirm: "",
  });
  const [pwsMatch, setPwsMatch] = useState<boolean>(false);

  useEffect(() => {
    if (!userType) return;
    setUser((u) => ({ ...u, user_type: userType.name as UserType }));
  }, [userType]);

  useEffect(() => {
    if (firstUser) return;
    const token = localStorage.getItem("auth_token");
    verifyUserTypes(token ?? "").then((ses) => {
      if (ses) setSession(ses);
    });
  }, [firstUser]);

  useEffect(() => {
    setPwsMatch(
      passwordConfirm.pw === passwordConfirm.pw_confirm &&
        passwordConfirm.pw.length > 0,
    );
  }, [passwordConfirm]);

  const handleSend = useCallback(() => {
    if (!pwsMatch) {
      console.log("Passwords do not match");
      return;
    }
    if (!firstUser || !setLoginAction) {
      const token = localStorage.getItem("auth_token");
      console.log(user);
      create_user(user, token ?? "").then();
    } else {
      console.log(user);
      create_user(user).then((res) => {
        if (res && setLoginAction) {
          localStorage.setItem("auth_token", res.session.session_hash);
          setLoginAction(true);
        }
      });
    }
    formRef.current?.reset();
    setPasswordConfirm({ pw: "", pw_confirm: "" });
    setUser((u) => ({ ...u, username: "", email: "", password: "" }));
  }, [firstUser, setLoginAction, user, pwsMatch]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSend();
  };

  // Check for existing session on mount
  useEffect(() => {
    if (!setLoginAction) return;

    const token = localStorage.getItem("auth_token");
    if (!token) return;

    verifyUserTypes(token).then((session) => {
      if (session) {
        setLoginAction(true);
        router.refresh();
      } else {
        setLoginAction(false);
        router.refresh();
      }
    });
  }, [setLoginAction, router]);

  return (
    <div className={`${className} flex flex-col`}>
      <h1>Luo {firstUser && "ensimmäinen"} käyttäjä</h1>
      <form className="flex flex-col gap-3.5" ref={formRef} onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Käyttäjänimi"
          onChange={(e) => {
            setUser({ ...user, username: e.target.value });
          }}
        />
        <input
          type="text"
          placeholder="Sähköposti"
          onChange={(e) => {
            setUser({ ...user, email: e.target.value });
          }}
        />
        <input
          type="password"
          placeholder="Salasana"
          onChange={(e) => {
            const pw = e.target.value;
            setPasswordConfirm((p) => ({ ...p, pw }));
            setUser((u) => ({ ...u, password: pw }));
          }}
        />
        <input
          type="password"
          placeholder="Vahvista salasana"
          onChange={(e) => {
            setPasswordConfirm({
              ...passwordConfirm,
              pw_confirm: e.target.value,
            });
          }}
        />
        {!pwsMatch && passwordConfirm.pw.length != 0 && (
          <p className="text-alert-900">Salasanat eivät täsmää</p>
        )}
        {!firstUser && (
          <DropdownMenu
            buttonText="Käyttäjätyyppi"
            options={
              session
                ? (session.user_types.user_types as string[])
                : (UserTypes as string[])
            }
            selectedOption={{
              id: user.user_type as string,
              name: user.user_type as string,
            }}
            setSelectedOption={setUserType}
          />
        )}
        <p className="w-full text-center font-bold text-lg">
          {UserTypeEnum[user.user_type]}
        </p>
        <button type="submit" className="button text-lg">
          Luo käyttäjä
        </button>
      </form>
    </div>
  );
}
