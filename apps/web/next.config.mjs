import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "../..");
const { loadEnvConfig } = nextEnv;

loadEnvConfig(repoRoot);

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  }
};

export default nextConfig;
