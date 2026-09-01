import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "pino",
  ],
};

export default nextConfig;
