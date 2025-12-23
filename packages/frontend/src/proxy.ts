import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/about")) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}
