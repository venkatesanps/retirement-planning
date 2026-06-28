/**
 * Static export config for GitHub Pages.
 *
 * basePath/assetPrefix are set when BASE_PATH env var is present (CI sets it
 * to the repo name so the site works at https://<user>.github.io/<repo>/).
 * For local dev they stay empty.
 */

const basePath = process.env.BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  transpilePackages: ['@retirement/engine'],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
