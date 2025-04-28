export interface User {
    id: string;
    username: string;
    role: "user" | "admin";
}

export interface AuthResponse {
    message: string;
    user?: User;
    error?: string;
}
