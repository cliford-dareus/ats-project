import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ['pdf-parse', 'mongoose'],
    output: 'standalone',
    // I will add ci later
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
