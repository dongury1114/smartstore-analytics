import { Request, Response } from "express";
import { StoreService } from "../services/storeService";

export class StoreController {
    private storeService: StoreService;

    constructor() {
        this.storeService = new StoreService();
    }

    public getStores = async (req: Request, res: Response): Promise<void> => {
        try {
            const stores = this.storeService.getAllStores();
            res.json({ stores });
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch stores" });
        }
    };

    public getStoreById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const store = this.storeService.getStoreById(id);

            if (!store) {
                res.status(404).json({ error: "Store not found" });
                return;
            }

            res.json(store);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch store" });
        }
    };
}
