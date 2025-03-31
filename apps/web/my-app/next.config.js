/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined, // Ensures proper file tracing in monorepo
  },
};

module.exports = nextConfig; 