/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas']
};

export default nextConfig;
