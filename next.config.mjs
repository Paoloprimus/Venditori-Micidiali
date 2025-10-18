/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔍 permette di vedere gli errori reali anche in produzione (stack leggibili)
  productionBrowserSourceMaps: true,

  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
