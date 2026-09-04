import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "pino",
    "onnxruntime-node",
    "@huggingface/transformers",
    "sharp",
    "@vladmandic/face-api",
    "@tensorflow/tfjs",
    "@tensorflow/tfjs-backend-wasm",
  ],
};

export default nextConfig;
