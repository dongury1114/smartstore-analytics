import { logger } from "./logger";

export function extractStoreUrl(url: string): string | null {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        const pathname = urlObj.pathname;

        if (hostname === "smartstore.naver.com") {
            return `https://smartstore.naver.com${pathname}`;
        }
        return null;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
        logger.error("URL 파싱 에러:", { error: errorMessage, url });
        return null;
    }
}
