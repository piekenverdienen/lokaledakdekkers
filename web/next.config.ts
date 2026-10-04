import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  trailingSlash: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  async rewrites() {
    // /betrouwbare-dakdekker/ en straks /betrouwbare-hovenier/ delen één pagina
    return [{ source: "/betrouwbare-:vak/", destination: "/betrouwbaar/" }];
  },
};
export default nextConfig;
