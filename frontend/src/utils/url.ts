export function extractStoreUrl(fullUrl: string): string | null {
    try {
        const url = new URL(fullUrl);
        const pathParts = url.pathname.split("/");
        if (pathParts.length >= 2) {
            // 스토어 ID 추출
            const storeId = pathParts[1];
            // 스토어 URL 생성 (끝에 슬래시 포함)
            return `https://smartstore.naver.com/${storeId}/`;
        }
        return null;
    } catch (error) {
        console.error("URL 파싱 에러:", error);
        return null;
    }
}
