import type { NextConfig } from 'next';
const config: NextConfig = { output: 'export', trailingSlash: true, images: { unoptimized: true },webpack(config){config.resolve.fallback={...config.resolve.fallback,path:require.resolve('path-browserify')};return config} };
export default config;
