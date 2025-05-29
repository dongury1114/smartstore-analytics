import { StoreDataType } from "@/types/sales";
import { logger } from "@/utils/logger";

class ApiError extends Error {
    constructor(message: string, public status?: number, public code?: string) {
        super(message);
        this.name = "ApiError";
    }
}

export const salesService = {
    async fetchStoreData(storeUrl: string, storeName: string): Promise<StoreDataType> {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sales`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ storeUrl, storeName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new ApiError(data.error || "서버 오류가 발생했습니다.", response.status, data.code);
            }

            return data;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            if (error instanceof TypeError) {
                // 네트워크 오류
                logger.error("네트워크 오류:", {
                    error: error.message,
                    store: { name: storeName, url: storeUrl },
                });
                throw new ApiError("네트워크 연결에 실패했습니다.");
            }

            const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
            logger.error("판매 데이터 조회 실패:", {
                error: errorMessage,
                store: { name: storeName, url: storeUrl },
            });
            throw new ApiError(errorMessage);
        }
    },

    async fetchProductData(productId: string, productName: string, stockQuantity: number) {
        try {
            const params = new URLSearchParams({
                productId,
                productName,
                stockQuantity: stockQuantity.toString(),
            });

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sales?${params}`);
            const data = await response.json();

            if (!response.ok) {
                throw new ApiError(data.error || "서버 오류가 발생했습니다.", response.status, data.code);
            }

            return data;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            if (error instanceof TypeError) {
                logger.error("네트워크 오류:", {
                    error: error.message,
                    product: { id: productId, name: productName },
                });
                throw new ApiError("네트워크 연결에 실패했습니다.");
            }

            const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
            logger.error("상품 데이터 조회 실패:", {
                error: errorMessage,
                product: { id: productId, name: productName },
            });
            throw new ApiError(errorMessage);
        }
    },
};
