import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip Next internals, static files, and PWA assets. Everything else
     * flows through the auth check so we can redirect unauthenticated users
     * to /login.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon|icon0|icon1|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
