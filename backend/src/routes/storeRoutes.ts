import { Router } from "express";
import { StoreController } from "../controllers/storeController";

const router = Router();
const storeController = new StoreController();

router.get("/", storeController.getStores);
router.get("/:id", storeController.getStoreById);

export default router;
