import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "네이버 스토어 판매량 분석",
    description: "네이버 스토어의 판매 데이터를 분석하는 도구입니다.",
    icons: {
        icon: "/favicon.ico",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
            <body className={inter.className}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
