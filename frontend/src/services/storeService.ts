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
            logger.error("Failed to fetch stores:", error);
            throw error;
        }
    },

    async getStoreById(id: string): Promise<Store> {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/stores/${id}`);
            return response.data;
        } catch (error) {
            logger.error(`Failed to fetch store ${id}:`, error);
            throw error;
        }
    },
};
