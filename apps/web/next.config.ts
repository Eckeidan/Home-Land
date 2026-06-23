import { resolve } from "node:path";
import { config as loadEnvironment } from "dotenv";
import type { NextConfig } from "next";

loadEnvironment({ path: resolve(process.cwd(), "../../.env"), quiet: true });

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
