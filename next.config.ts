import type { NextConfig } from "next";

function getRegistrationHosts(): string[] {
  return (process.env.REGISTRATION_PUBLIC_HOSTS || "kayit.athleticlabs.com.tr")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async redirects() {
    const marketingBaseUrl =
      process.env.NEXT_PUBLIC_MARKETING_BASE_URL ||
      "https://www.athleticlabs.com.tr";

    return getRegistrationHosts().map((host) => ({
      source:
        "/:path((?!kayit(?:/.*)?$|_next/.*|favicon\\.ico$|icon\\.png$|athleticlabs_logo\\.png$|athleticlabs_logo_export\\.png$|athleticlabslogo\\.jpg$).*)",
      has: [
        {
          type: "host" as const,
          value: host,
        },
      ],
      destination: marketingBaseUrl,
      permanent: false,
    }));
  },
};

export default nextConfig;
