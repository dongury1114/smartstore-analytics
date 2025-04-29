import React from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "../common/Button";

export const Header: React.FC = () => {
    const { data: session } = useSession();

    return (
        <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <h1 className="text-xl font-bold text-gray-900">네이버 스토어 판매량 분석</h1>
                        </div>
                    </div>
                    <div className="flex items-center">
                        {session ? (
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-700">{session.user?.name}</span>
                                <Button variant="secondary" size="sm" onClick={() => signOut()}>
                                    로그아웃
                                </Button>
                            </div>
                        ) : (
                            <Button variant="primary" size="sm" onClick={() => (window.location.href = "/login")}>
                                로그인
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
