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
