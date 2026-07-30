import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "flanked-shredding-theatrics.ngrok-free.dev",
    "127.0.0.1",
  ],
  transpilePackages: ["@lcsp/contracts", "@lcsp/i18n"],
};

export default nextConfig;
