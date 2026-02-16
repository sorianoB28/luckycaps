import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const DEV_SECRET_WARNING =
  "[admin-middleware] Missing NEXTAUTH_SECRET/AUTH_SECRET. Admin routes will be treated as unauthenticated.";

function buildSignInRedirect(request: NextRequest, reason: "auth_required" | "admin_required") {
  const url = request.nextUrl.clone();
  const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = "/auth/sign-in";
  url.search = "";
  url.searchParams.set("redirect", redirectTarget);
  url.searchParams.set("reason", reason);
  return url;
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function middleware(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      console.error(DEV_SECRET_WARNING);
    }
    const response = NextResponse.redirect(buildSignInRedirect(request, "auth_required"));
    if (process.env.NODE_ENV !== "production") {
      response.headers.set("x-admin-auth-warning", "missing-nextauth-secret");
    }
    return response;
  }

  const token = await getToken({ req: request, secret });
  if (!token) {
    return NextResponse.redirect(buildSignInRedirect(request, "auth_required"));
  }

  if (isAdminPath(request.nextUrl.pathname)) {
    const role = typeof token.role === "string" ? token.role.toLowerCase() : "";
    if (role !== "admin") {
      return NextResponse.redirect(buildSignInRedirect(request, "admin_required"));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
