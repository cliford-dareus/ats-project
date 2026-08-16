import type { Metadata } from "next";
import { Inter, Ubuntu_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Inter({
    variable: "--font-inter-sans",
    subsets: ["latin"],
});

const geistMono = Ubuntu_Mono({
    variable: "--font-ubuntu-mono",
    subsets: ["latin"],
    weight: ["400", "700"]
});

export const metadata: Metadata = {
    title: 'ATS - Applicant Tracking System',
    description: 'Modern ATS for recruiters and hiring teams',
    icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ClerkProvider>
                    {children}
                </ClerkProvider>
            </body>
        </html>
    );
};
