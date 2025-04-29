import { Request, Response } from "express";
import { SalesDataCollector } from "../services/SalesDataCollector";
import { StoreManager } from "../services/StoreManager";
import { StoreData } from "../types/sales";

export const getSalesData = async (req: Request, res: Response) => {
    try {
        const { productId, productName, stockQuantity } = req.query;

        if (!productId || !productName || !stockQuantity) {
            return res.status(400).json({ error: "잘못된 요청 파라미터" });
        }

        const collector = new SalesDataCollector(productId as string, productName as string, Number(stockQuantity));

        const result = await collector.collectSalesData();
        return res.json(result);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
        return res.status(500).json({ error: errorMessage });
    }
};

export const getStoreData = async (req: Request, res: Response) => {
    try {
        const { storeUrl, storeName } = req.body;

        if (!storeUrl) {
            return res.status(400).json({ error: "스토어 URL이 필요합니다." });
        }

        const storeManager = new StoreManager(storeUrl, storeName || "알 수 없음");
        const storeData = await storeManager.getStoreData();

        return res.json(storeData);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
        return res.status(500).json({ error: errorMessage });
    }
};
