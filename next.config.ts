import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ['pdf-parse', 'mongoose'],
    output: 'standalone',
    // I will add ci later
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Type errors now fail the build: `npx tsc --noEmit` is clean
    // (was 110 errors before the Nov 18 type-fix pass).
};

export default nextConfig;
