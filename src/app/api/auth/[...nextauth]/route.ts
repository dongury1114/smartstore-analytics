import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials: { username: string; password: string } | undefined) {
                try {
                    if (!credentials?.username || !credentials?.password) {
                        console.log("사용자 이름 또는 비밀번호가 없습니다.");
                        return null;
                    }

                    await connectDB();
                    console.log("MongoDB 연결 성공, 사용자 검색 중...");

                    const user = await User.findOne({ username: credentials.username });
                    console.log("사용자 검색 결과:", user ? "사용자 찾음" : "사용자 없음");

                    if (!user) {
                        console.log("사용자를 찾을 수 없습니다.");
                        return null;
                    }

                    const isPasswordValid = await user.comparePassword(credentials.password);
                    console.log("비밀번호 검증 결과:", isPasswordValid ? "성공" : "실패");

                    if (!isPasswordValid) {
                        console.log("비밀번호가 일치하지 않습니다.");
                        return null;
                    }

                    console.log("인증 성공, 사용자 정보 반환");
                    return {
                        id: user._id.toString(),
                        name: user.username,
                        email: user.username,
                        role: user.role,
                    };
                } catch (error) {
                    console.error("인증 중 오류 발생:", error);
                    return null;
                }
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role;
            }
            return session;
        },
    },
    debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };
