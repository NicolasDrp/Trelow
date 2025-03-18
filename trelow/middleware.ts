import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Ne pas appliquer le middleware aux routes API ou aux ressources statiques
  if (
    path.startsWith("/api/") ||
    path.includes("/_next/") ||
    path.includes("/static/") ||
    path.includes(".")
  ) {
    return NextResponse.next();
  }

  console.log("Middleware - Vérification du chemin:", path);

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  console.log("Middleware - Authentifié:", isAuthenticated);

  // Define paths that don't require authentication
  const publicPaths = [
    "/login",
    "/signup",
    "/api/auth/signin",
    "/api/auth/signup",
  ];

  // Check if the path is in the public paths list
  const isPublicPath = publicPaths.some(
    (publicPath) => path === publicPath || path.startsWith("/api/auth/")
  );

  console.log("Middleware - Chemin public:", isPublicPath);

  // Redirect unauthenticated users from protected routes to the login page
  if (!isAuthenticated && !isPublicPath) {
    console.log("Middleware - Redirection vers login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users from login/signup pages to the home page
  if (isAuthenticated && (path === "/login" || path === "/signup")) {
    console.log("Middleware - Redirection vers accueil");
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
