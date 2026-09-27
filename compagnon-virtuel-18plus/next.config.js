/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ioredis et le SDK Stripe ne doivent pas être bundlés côté client
  experimental: {
    serverComponentsExternalPackages: ["ioredis", "@prisma/client"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.d-id.com" },
      { protocol: "https", hostname: "d-id-talks-prod.s3.us-west-2.amazonaws.com" },
    ],
  },
  // En-têtes de sécurité de base
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
