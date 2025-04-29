import { Router } from "express";
import { getSalesData, getStoreData } from "../controllers/salesController";

const router = Router();

// 테스트용 엔드포인트 추가
router.get("/test", (req, res) => {
    res.json({ message: "API 서버가 정상적으로 동작중입니다." });
});

router.get("/", getSalesData);
router.post("/", getStoreData);

export default router;
