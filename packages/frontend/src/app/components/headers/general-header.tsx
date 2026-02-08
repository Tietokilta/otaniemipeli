"use client";
import { useRouter } from "next/navigation";
import { UserTypeEnum } from "@/utils/helpers";
import Link from "next/link";

/** A single navigation item in the header. */
function HeaderItemComponent({
  text,
  href,
  onClick,
}: {
  text: string;
  href?: string;
  onClick?: () => void;
}) {
  const className = `
    flex
    center
    py-2
    text-tertiary-500
    text-2xl
    font-bold
    flex
    center
    hover:bg-primary-500
    hover:text-tertiary-900
    px-4
    rounded-sm`;
  if (href) {
    return (
      <Link className={className} href={href}>
        {text}
      </Link>
    );
  }
  return (
    <span className={className} onClick={onClick}>
      {text}
    </span>
  );
}

export default function GeneralHeader({
  base_path,
  items = [],
}: {
  base_path: string;
  items?: HeaderItem[];
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

  return (
    <div className="flex items-end justify-right w-full h-min-content px-4 bg-quaternary-500">
      <div className="flex center h-full mr-auto pt-4">
        <Link
          className="
          ml-6
          center
          text-secondary-100
          hover:text-tertiary-100
          select-none
          text-shadow-lg
          text-shadow-tertiary-900
          hover:text-shadow-secondary-900
          text-2xl
          2xl:text-4xl
          font-pixel-b"
          href={base_path}
        >
          Otaniemipeli {role}
        </Link>
      </div>
      <div className="flex h-full items-center pt-6">
        <nav className="flex cursor-default h-full py-3 rounded-md bottom">
          {items.map((item) => (
            <HeaderItemComponent
              key={item.text}
              text={item.text}
              href={base_path + item.href}
            />
          ))}
          <HeaderItemComponent text="Vaihda roolia" href="/" />
          <HeaderItemComponent text="Kirjaudu ulos" onClick={handleLogout} />
        </nav>
      </div>
    </div>
  );
}
