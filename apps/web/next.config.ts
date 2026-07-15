import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lcsp/contracts", "@lcsp/i18n"],
};

export default nextConfig;
