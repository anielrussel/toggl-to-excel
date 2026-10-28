import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs and unpdf are Node-only libraries; keep them out of the bundler.
  serverExternalPackages: ["exceljs", "unpdf"],
};

export default nextConfig;
