"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { verifySession } from "@/utils/fetchers";
import { usePathname, useRouter } from "next/navigation";
import { UserTypes } from "@/utils/helpers";
import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "@/utils/env";

export const SocketContext = createContext<Socket | null>(null);
export function useSocket() {
  return useContext(SocketContext);
}

function neededType(pathname: string): UserType | null {
  for (const type of UserTypes) {
    if (pathname.startsWith("/" + type.toLowerCase())) {
      return type;
    }
  }
  return null;
}

/** Paths that need neither socket nor auth. */
function ignoredPaths(pathname: string): boolean {
  const ignored = ["/follow", "/api", "/favicon.ico", "/_next", "/_vercel"];
  return ignored.some((path) => pathname.startsWith(path));
}

/** Paths that need a socket but should skip auth (no redirect on invalid token). */
function overlayPaths(pathname: string): boolean {
  return pathname.endsWith("/caster/overlay");
}

function getSessionToken(overlayAuth: boolean): string {
  let token = localStorage.getItem("auth_token") || "";

  // For skipAuth paths (e.g. caster overlay), read the token from the URL hash
  if (overlayAuth) {
    const hash = window.location.hash.slice(1);
    token ||= hash;
  }

  return token;
}

export default function AdminTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);

  // All authenticated pages use the /referee namespace for websocket
  const needsSocket = !ignoredPaths(pathname);
  const needsUserType = neededType(pathname);
  const overlayAuth = needsSocket && overlayPaths(pathname);

  useEffect(() => {
    console.log("AdminTemplate starting socket:", needsSocket);
    if (!needsSocket) return;

    const token = getSessionToken(overlayAuth);

    const s = io(`${getApiBaseUrl()}/referee`, {
      transports: ["websocket", "polling"],
      auth: { token },
      withCredentials: true,
    });

    setSocket(s);

    return () => {
      console.log("AdminTemplate disconnecting socket");
      s.off();
      s.close();
      setSocket(null);
    };
  }, [needsSocket, overlayAuth]);

  useEffect(() => {
    if (overlayAuth) return;

    const sessionToken = getSessionToken(overlayAuth);
    if (!sessionToken) {
      router.push("/");
      return;
    }
    verifySession(sessionToken)
      .then((data: SessionInfo | undefined) => {
        if (
          data &&
          needsUserType &&
          !data.user_types.user_types.includes(needsUserType)
        ) {
          router.push("/");
        }
      })
      .catch(() => {
        router.push("/");
      });
  }, [overlayAuth, needsUserType, router]);

  useEffect(() => {
    if (!socket) return;

    const onUnauthorized = () => {
      if (overlayAuth) return;
      localStorage.removeItem("auth_token");
      router.push("/");
    };

    const onVerificationReply = (ok: boolean) => {
      if (!ok && !overlayAuth) {
        localStorage.removeItem("auth_token");
        router.push("/");
      }
    };

    socket.on("unauthorized", onUnauthorized);
    socket.on("verification-reply", onVerificationReply);

    const verify = () => {
      const auth: SocketAuth = {
        token: localStorage.getItem("auth_token") ?? "",
      };
      socket.emit("verify-login", auth);
    };

    if (socket.connected) verify();
    socket.on("connect", verify);

    const intervalId = window.setInterval(verify, 20 * 60 * 1000);

    return () => {
      socket.off("connect", verify);
      socket.off("unauthorized", onUnauthorized);
      socket.off("verification-reply", onVerificationReply);
      window.clearInterval(intervalId);
    };
  }, [socket, overlayAuth, router]);
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}
