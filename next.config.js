/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
    // Disable compression to fix Safari "server stopped responding" issues
    compress: false,
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "cdn.discordapp.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "**.google.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
                pathname: "/**",
            }, {
                protocol: "https",
                hostname: "**.public.blob.vercel-storage.com",
                pathname: "/**",
            },],
    },
};

export default config;
