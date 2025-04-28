import { AuthResponse } from "./types";

export async function registerUser(username: string, password: string): Promise<AuthResponse> {
    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        return {
            message: "사용자 등록 중 오류가 발생했습니다.",
            error: error instanceof Error ? error.message : "알 수 없는 오류",
        };
    }
}

export async function loginUser(username: string, password: string): Promise<AuthResponse> {
    try {
        const response = await fetch("/api/auth/callback/credentials", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        return {
            message: "로그인 중 오류가 발생했습니다.",
            error: error instanceof Error ? error.message : "알 수 없는 오류",
        };
    }
}
