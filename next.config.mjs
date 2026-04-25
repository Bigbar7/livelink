/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist']
};

export default nextConfig;
