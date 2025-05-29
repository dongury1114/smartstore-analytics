import axios from "axios";
import { Store } from "../types/store";
import { logger } from "../utils/logger";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const storeService = {
    async getStores(): Promise<Store[]> {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/stores`);
            return response.data.stores;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
            logger.error("Failed to fetch stores:", { error: errorMessage });
            throw error;
        }
    },

    async getStoreById(id: string): Promise<Store> {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/stores/${id}`);
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
            logger.error(`Failed to fetch store ${id}:`, { error: errorMessage, storeId: id });
            throw error;
        }
    },
};
