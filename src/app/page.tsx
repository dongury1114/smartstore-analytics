"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatNumber } from "@/utils/format";
import { StoreData } from "@/types/sales";
import { STORE_LIST } from "@/config/stores";
import StoreSelector from "@/components/StoreSelector";
import { extractStoreUrl } from "@/utils/url";

export default function Home() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [storeData, setStoreData] = useState<StoreData[]>([]);
    const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
    const [storeUrl, setStoreUrl] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    const handleStoreToggle = (storeName: string) => {
        const newSelectedStores = new Set(selectedStores);
        if (newSelectedStores.has(storeName)) {
            newSelectedStores.delete(storeName);
        } else {
            newSelectedStores.add(storeName);
        }
        setSelectedStores(newSelectedStores);
    };

    const handleSelectAll = (selected: boolean) => {
        if (selected) {
            const allStoreNames = new Set(STORE_LIST.map((store) => store.name));
            setSelectedStores(allStoreNames);
        } else {
            setSelectedStores(new Set());
        }
    };

    const handleUrlSubmit = () => {
        const extractedUrl = extractStoreUrl(storeUrl);
        if (!extractedUrl) {
            setError("유효한 네이버 스토어 URL을 입력해주세요.");
            return;
        }

        // URL 비교 시 슬래시 처리
        const normalizedExtractedUrl = extractedUrl.replace(/\/+$/, "");
        const store = STORE_LIST.find((s) => {
            const normalizedStoreUrl = s.url.replace(/\/+$/, "");
            return normalizedStoreUrl === normalizedExtractedUrl;
        });

        if (store) {
            handleStoreToggle(store.name);
            setStoreUrl("");
        } else {
            // 등록되지 않은 스토어인 경우, 새로운 스토어로 추가
            const storeName = normalizedExtractedUrl.split("/").filter(Boolean).pop() || "새 스토어";
            const newStore = {
                url: normalizedExtractedUrl,
                name: storeName,
            };

            // STORE_LIST에 추가
            STORE_LIST.push(newStore);
            // 스토어 선택
            handleStoreToggle(storeName);
            setStoreUrl("");
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const selectedStoreUrls = STORE_LIST.filter((store) => selectedStores.has(store.name)).map((store) => store.url);

            if (selectedStoreUrls.length === 0) {
                setError("최소 하나의 스토어를 선택해주세요.");
                return;
            }

            const responses = await Promise.all(
                selectedStoreUrls.map((url) =>
                    fetch("/api/sales", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            storeUrl: url,
                            storeName: STORE_LIST.find((s) => s.url === url)?.name,
                        }),
                    })
                )
            );

            const data = await Promise.all(responses.map((response) => response.json()));

            setStoreData(data);
        } catch (err) {
            setError("데이터를 가져오는 중 오류가 발생했습니다.");
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">로딩 중...</div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">네이버 스토어 판매량 분석</h1>
                    <p className="mt-2 text-sm text-gray-600">선택한 스토어의 판매 데이터를 분석합니다.</p>
                </div>

                <div className="bg-white shadow rounded-lg p-6 mb-8">
                    <div className="mb-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={storeUrl}
                                onChange={(e) => setStoreUrl(e.target.value)}
                                placeholder="네이버 스토어 URL을 입력하세요"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                                onClick={handleUrlSubmit}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                추가
                            </button>
                        </div>
                    </div>
                    <StoreSelector stores={STORE_LIST} selectedStores={selectedStores} onStoreToggle={handleStoreToggle} onSelectAll={handleSelectAll} />
                    <div className="mt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={loading || selectedStores.size === 0}
                            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                                loading || selectedStores.size === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                            }`}
                        >
                            {loading ? "분석 중..." : "분석 시작"}
                        </button>
                    </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-8">{error}</div>}

                {storeData.length > 0 && (
                    <div className="space-y-8">
                        {storeData.map((store, index) => (
                            <div key={`${store.storeName}-${index}`} className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">{store.storeName}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <h3 className="text-sm text-blue-600">오늘 판매량</h3>
                                        <p className="text-2xl font-bold text-blue-700">{formatNumber(store.products.reduce((sum, product) => sum + product.sales.today, 0))}개</p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <h3 className="text-sm text-green-600">주간 판매량</h3>
                                        <p className="text-2xl font-bold text-green-700">{formatNumber(store.products.reduce((sum, product) => sum + product.sales.week, 0))}개</p>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-lg">
                                        <h3 className="text-sm text-purple-600">반년 판매량</h3>
                                        <p className="text-2xl font-bold text-purple-700">
                                            {formatNumber(store.products.reduce((sum, product) => sum + product.sales.halfYear, 0))}개
                                        </p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품명</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">가격</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">재고</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">오늘 판매</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">주간 판매</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">반년 판매</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {store.products.map((product) => (
                                                <tr key={product.productId} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                        <div className="text-sm text-gray-500">ID: {product.productId}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(product.price)}원</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(product.stockQuantity)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(product.sales.today)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(product.sales.week)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(product.sales.halfYear)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
