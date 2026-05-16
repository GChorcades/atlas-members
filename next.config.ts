import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static fica fora do bundle (para __dirname resolver em node_modules)…
  serverExternalPackages: ['ffmpeg-static'],
  // …e o binário é forçado para dentro das funções de API.
  // As fontes do certificado (next/og) também precisam ir no bundle —
  // public/ não é empacotado nas funções por padrão.
  outputFileTracingIncludes: {
    '/api/**': ['./node_modules/ffmpeg-static/**', './public/fonts/**'],
  },
};

export default nextConfig;
