import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

console.log("MongoDB URI:", MONGODB_URI ? "설정됨" : "설정되지 않음");

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in the environment variables.");
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            dbName: "test",
        };

        console.log("MongoDB에 연결 시도 중...");
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            const db = mongoose.connection;

            db.on("error", console.error.bind(console, "MongoDB 연결 오류:"));
            db.once("open", function () {
                console.log("MongoDB 연결 성공!");
                console.log("현재 데이터베이스:", db.name);
                console.log("사용 가능한 컬렉션:", Object.keys(db.collections));
            });

            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error("MongoDB 연결 실패:", e);
        throw e;
    }

    return cached.conn;
}

export default connectDB;
