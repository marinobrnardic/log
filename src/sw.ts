/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheableResponsePlugin,
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: [
    ...(self.__SW_MANIFEST ?? []),
    // Precache the offline fallback so navigations to never-visited pages
    // can fall back to it. Serwist's fallback uses matchPrecache, so without
    // this the fallback rule below silently misses.
    { url: "/offline", revision: null },
  ],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Supabase auth and writes — never cache.
    {
      matcher: ({ url, request }) =>
        url.hostname.endsWith(".supabase.co") &&
        (url.pathname.startsWith("/auth/") || request.method !== "GET"),
      handler: new NetworkOnly(),
    },
    // Supabase REST reads — network first, fall back to cache on failure.
    // Lets history / detail / analytics still render the last fetch offline.
    {
      matcher: ({ url, request }) =>
        url.hostname.endsWith(".supabase.co") &&
        url.pathname.startsWith("/rest/") &&
        request.method === "GET",
      handler: new NetworkFirst({
        cacheName: "supabase-rest",
        networkTimeoutSeconds: 3,
        plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
      }),
    },
    // Google Fonts (used by next/font for Inter at runtime in some paths).
    {
      matcher: ({ url }) => url.hostname === "fonts.gstatic.com",
      handler: new CacheFirst({
        cacheName: "google-fonts",
      }),
    },
    // App Router RSC navigation payloads: never cache. A cached RSC payload
    // references the JS chunk hashes of the build it was fetched from; after a
    // deploy those chunks are gone, so serving a stale payload leaves the client
    // stuck on the loading.tsx skeleton (dynamic routes like /workouts/[id]).
    // Must sit before ...defaultCache so it shadows its pages-rsc NetworkFirst
    // rules (Serwist uses first-match routing).
    {
      matcher: ({ request, url, sameOrigin }) =>
        sameOrigin &&
        request.headers.get("RSC") === "1" &&
        !url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    // Everything else (app shell, navigations, static assets) uses Serwist's
    // sensible defaults.
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// Purge the RSC navigation caches populated by earlier service-worker versions.
// The new SW no longer reads them (RSC is NetworkOnly above), but deleting them
// keeps leftover stale payloads from lingering after this update lands.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all(
      ["pages-rsc", "pages-rsc-prefetch"].map((name) => caches.delete(name)),
    ).then(() => undefined),
  );
});
