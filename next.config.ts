import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "app/api/**": ["node_modules/@sparticuz/chromium/**"],
      "api/**": ["node_modules/@sparticuz/chromium/**"],
    },
  } as any,
};

export default nextConfig;
