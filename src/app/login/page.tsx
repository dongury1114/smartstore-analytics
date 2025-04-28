"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                username,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("로그인에 실패했습니다.");
            } else {
                router.push("/");
            }
        } catch (error) {
            setError("로그인 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">로그인</h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <Input
                            id="username"
                            name="username"
                            type="text"
                            required
                            label="사용자 이름"
                            placeholder="사용자 이름을 입력하세요"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            error={error}
                        />
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            label="비밀번호"
                            placeholder="비밀번호를 입력하세요"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <Button type="submit" className="w-full" isLoading={isLoading}>
                        로그인
                    </Button>
                </form>
            </div>
        </div>
    );
}
