"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { verifyUserTypes } from "@/utils/fetchers";
import { usePathname, useRouter } from "next/navigation";
import { UserTypes } from "@/utils/helpers";
import { io, Socket } from "socket.io-client";

export const SocketContext = createContext<Socket | null>(null);
export function useSocket() {
  return useContext(SocketContext);
}

function authorisationCheck(session: SessionInfo, pathname: string): boolean {
  for (const type of UserTypes) {
    if (pathname.startsWith("/" + type.toLowerCase())) {
      return session.user_types.user_types.includes(type);
    }
  }
  return false;
}
function ignoredPaths(pathname: string): boolean {
  const ignored = ["/follow", "/api", "/favicon.ico", "/_next", "/_vercel"];
  return ignored.some((path) => pathname.startsWith(path));
}

export default function AdminTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);

  const ns = ignoredPaths(pathname) ? null : pathname.split("/")[1];

  useEffect(() => {
    if (!ns) return;

    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/${ns}`;
    const s = io(url, {
      transports: ["websocket", "polling"],
      auth: { token: localStorage.getItem("auth_token") || "" },
      withCredentials: true,
    });

    setSocket(s);

    return () => {
      s.off();
      s.close();
      setSocket(null);
    };
  }, [ns]);

  useEffect(() => {
    if (ignoredPaths(pathname)) {
      return;
    } else {
      const sessionToken = localStorage.getItem("auth_token");
      if (!sessionToken) {
        router.push("/");
        return;
      }
      verifyUserTypes(sessionToken)
        .then((data: SessionInfo | undefined) => {
          if (data) {
            if (!authorisationCheck(data, pathname)) {
              router.push("/");
            }
          }
        })
        .catch(() => {
          router.push("/");
        });
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!socket) return;

    const onUnauthorized = () => {
      localStorage.removeItem("auth_token");
      router.push("/");
    };

    const onVerificationReply = (ok: boolean) => {
      if (!ok) {
        localStorage.removeItem("auth_token");
        router.push("/");
      }
    };

    socket.off("unauthorized", onUnauthorized);
    socket.off("verification-reply", onVerificationReply);

    socket.on("unauthorized", onUnauthorized);
    socket.on("verification-reply", onVerificationReply);

    const verify = () => {
      const auth: SocketAuth = {
        token: localStorage.getItem("auth_token") ?? "",
      };
      socket.emit("verify-login", auth);
    };

    const onConnect = () => verify();

    if (socket.connected) verify();
    socket.on("connect", onConnect);

    const intervalId = window.setInterval(verify, 20 * 60 * 1000);

    return () => {
      socket.off("connect", onConnect);
      socket.off("unauthorized", onUnauthorized);
      socket.off("verification-reply", onVerificationReply);
      window.clearInterval(intervalId);
    };
  }, [socket, router]);
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}
