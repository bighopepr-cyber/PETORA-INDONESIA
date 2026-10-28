import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@petora/contracts", "@petora/db-types", "@petora/ui"],
};

export default nextConfig;
