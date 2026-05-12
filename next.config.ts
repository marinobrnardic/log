import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so an unrelated lockfile in $HOME doesn't
  // confuse Next's file-tracing.
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
