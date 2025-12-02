/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔍 permette di vedere gli errori reali anche in produzione (stack leggibili)
  productionBrowserSourceMaps: true,

  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },

  // 🌐 Routing multi-dominio: reping.it (marketing) vs reping.app (app)
  async rewrites() {
    return {
      beforeFiles: [
        // reping.it → serve le pagine /site
        {
          source: '/',
          has: [{ type: 'host', value: 'reping.it' }],
          destination: '/site',
        },
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'reping.it' }],
          destination: '/site/:path*',
        },
        // www.reping.it → stessa cosa
        {
          source: '/',
          has: [{ type: 'host', value: 'www.reping.it' }],
          destination: '/site',
        },
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'www.reping.it' }],
          destination: '/site/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
