import express from "express";
import cors from "cors";
import { config } from "./config";
import { errorHandler } from "./middlewares/errorHandler";
import salesRoutes from "./routes/sales";
import { logger } from "./utils/logger";

const app = express();

// 미들웨어
app.use(cors());
app.use(express.json());

// 라우트
app.use("/api/sales", salesRoutes);

// 에러 핸들링
app.use(errorHandler);

app.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`);
});
