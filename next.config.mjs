/** @type {import('next').NextConfig} */
const nextConfig = {
    // 禁用 reactStrictMode 以避免某些第三方库在开发模式下的双重渲染问题
    reactStrictMode: false,
    webpack: (config) => {
        config.resolve.alias.canvas = false;
        return config;
    },
};

export default nextConfig;
