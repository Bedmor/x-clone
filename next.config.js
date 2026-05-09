/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === "true",
});

/** @type {import("next").NextConfig} */
const config = {
    // Let Next.js enable gzip compression where applicable
    compress: true,
    allowedDevOrigins: ["192.168.1.8"],
    // Image optimization: prefer modern formats and reasonable device sizes
    images: {
        unoptimized: true, // Disable Next.js image optimization to serve images directly from R2
        formats: ["image/avif", "image/webp"],
        deviceSizes: [320, 420, 768, 1024, 1280, 1600, 1920],
        remotePatterns: [
            {
                protocol: "https",
                hostname: "pub-d09790ae7bd240a1b758ff0f2f35ddcb.r2.dev",
                pathname: "/**",
            },
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
            },
            {
                protocol: "https",
                hostname: "**.public.blob.vercel-storage.com",
                pathname: "/**",
            },
        ],
    },

    // Cache-control headers for statics and API responses
    async headers() {
        return [
            {
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, immutable, max-age=31536000',
                    },
                ],
            },
            {
                source: '/_next/image/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, immutable, max-age=31536000',
                    },
                ],
            },
            {
                source: '/api/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, s-maxage=60, stale-while-revalidate=300',
                    },
                ],
            },
            {
                source: '/images/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=86400, stale-while-revalidate=259200',
                    },
                ],
            },
        ];
    },
};

export default withBundleAnalyzer(config);
