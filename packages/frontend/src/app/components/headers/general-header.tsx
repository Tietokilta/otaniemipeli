"use client";
import { useRouter } from "next/navigation";
import React from "react";
import { UserTypeEnum } from "@/utils/helpers";

export default function GeneralHeader({
  base_path,
  items,
}: {
  base_path: string;
  items: HeaderItem[];
}) {
  const router = useRouter();
  const handleLogout = (all?: string) => {
    let url = "/login";
    if (all) {
      url = "/login/all";
    }
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
      });
    router.push("/");
  };
  const role =
    UserTypeEnum[base_path.replace("/", "") as keyof typeof UserTypeEnum];
  const className = "flex center py-2 text-tertiary-500 h-full font-bold";
  const hoverClass =
    "flex center w-full h-full hover:bg-primary-500 hover:text-tertiary-900 px-4 rounded-sm";
  return (
    <div className="flex items-end justify-right w-full h-[15dvh] px-4 mb-4 bg-quaternary-500">
      <div className="flex center h-full mr-auto pt-4">
        <h2
          className="
          ml-6
          center
          text-secondary-100
          hover:text-tertiary-100
          select-none
          text-shadow-lg
          text-shadow-tertiary-900
          hover:text-shadow-secondary-900
          text-4xl
          font-pixel-b"
          onClick={() => router.push("/")}
        >
          Otaniemipeli {role}
        </h2>
      </div>
      <div className="flex h-full items-center pt-6">
        <nav className="flex cursor-default h-full py-3 rounded-md bottom">
          <div
            className={className}
            onClick={() => {
              router.push("/");
            }}
          >
            <div className={hoverClass}>
              <h3>Alkuun</h3>
            </div>
          </div>
          <div
            className={className}
            onClick={() => {
              router.push(base_path);
            }}
          >
            <div className={hoverClass}>
              <h3>{role}</h3>
            </div>
          </div>
          {items.map((item) => (
            <div
              key={item.text}
              className={className}
              onClick={() => router.push(base_path + item.href)}
            >
              <div className={hoverClass}>
                <h3>{item.text}</h3>
              </div>
            </div>
          ))}
          <div
            className={className}
            onClick={() => {
              handleLogout();
            }}
          >
            <div className={hoverClass}>
              <h3>Kirjaudu ulos</h3>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
