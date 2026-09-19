import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The app is served behind the reverse proxy of
  // `19-security-operations-delivery.md:65`, on the same origin as the API. Nothing here
  // rewrites to the API: a Next rewrite would make requests cross-origin in development
  // and same-origin in production, which is exactly the difference the session cookie
  // cannot survive. The proxy does the routing in every environment.
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
};

export default config;
