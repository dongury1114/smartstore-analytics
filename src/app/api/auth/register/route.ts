import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: "사용자 이름과 비밀번호는 필수입니다." }, { status: 400 });
        }

        await connectDB();

        // 사용자 이름 중복 체크
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return NextResponse.json({ error: "이미 존재하는 사용자 이름입니다." }, { status: 400 });
        }

        // 새 사용자 생성
        const user = await User.create({
            username,
            password,
            role: "user", // 기본 역할은 'user'
        });

        return NextResponse.json(
            {
                message: "사용자가 성공적으로 생성되었습니다.",
                user: {
                    id: user._id,
                    username: user.username,
                    role: user.role,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error in register route:", error);
        return NextResponse.json({ error: "사용자 생성 중 오류가 발생했습니다." }, { status: 500 });
    }
}
