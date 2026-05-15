import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static fica fora do bundle (para __dirname resolver em node_modules)…
  serverExternalPackages: ['ffmpeg-static'],
  // …e o binário é forçado para dentro das funções de API.
  outputFileTracingIncludes: {
    '/api/**': ['./node_modules/ffmpeg-static/**'],
  },
};

export default nextConfig;
