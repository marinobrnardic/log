import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import path from "node:path";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Pin the workspace root so an unrelated lockfile in $HOME doesn't
  // confuse Next's file-tracing.
  outputFileTracingRoot: path.resolve(__dirname),
};

export default withSerwist(nextConfig);
