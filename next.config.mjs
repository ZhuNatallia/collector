/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: '/collector',
  assetPrefix: '/collector',
};
export default nextConfig;
