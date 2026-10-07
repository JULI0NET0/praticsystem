import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // O lockfile da agência está dois níveis acima. Sem isto, o Next trata
  // a raiz do repositório como o app e compila o sistema errado.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
