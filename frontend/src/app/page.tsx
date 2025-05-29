"use client";

import { useState, useEffect } from "react";
import { formatNumber } from "@/utils/format";
import { StoreData } from "@/types/sales";
import { Store } from "@/types/store";
import StoreSelector from "@/components/StoreSelector";
import { extractStoreUrl } from "@/utils/url";
import { storeService } from "@/services/storeService";
import { salesService } from "@/services/salesService";
import { logger } from "@/utils/logger";

export default function Home() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [storeData, setStoreData] = useState<StoreData[]>([]);
    const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
    const [storeUrl, setStoreUrl] = useState("");
    const [stores, setStores] = useState<Store[]>([]);

    useEffect(() => {
        loadStores();
    }, []);

    const loadStores = async () => {
        try {
            const storeList = await storeService.getStores();
            setStores(storeList);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
            logger.error("Failed to load stores:", { error: errorMessage });
            setError("스토어 목록을 불러오는데 실패했습니다.");
        }
    };

    const handleStoreToggle = (storeId: string) => {
        const newSelectedStores = new Set(selectedStores);
        if (newSelectedStores.has(storeId)) {
            newSelectedStores.delete(storeId);
        } else {
            newSelectedStores.add(storeId);
        }
        setSelectedStores(newSelectedStores);
    };

    const handleSelectAll = (selected: boolean) => {
        if (selected) {
            const allStoreIds = new Set(stores.map((store) => store.id));
            setSelectedStores(allStoreIds);
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

        const normalizedExtractedUrl = extractedUrl.replace(/\/+$/, "");
        const store = stores.find((s) => {
            const normalizedStoreUrl = s.url.replace(/\/+$/, "");
            return normalizedStoreUrl === normalizedExtractedUrl;
        });

        if (store) {
            handleStoreToggle(store.id);
            setStoreUrl("");
        } else {
            setError("등록되지 않은 스토어입니다. 관리자에게 문의해주세요.");
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const selectedStoreList = stores.filter((store) => selectedStores.has(store.id));

            if (selectedStoreList.length === 0) {
                setError("최소 하나의 스토어를 선택해주세요.");
                return;
            }

            const storeResults = await Promise.allSettled(
                selectedStoreList.map(async (store) => {
                    try {
                        return await salesService.fetchStoreData(store.url, store.name);
                    } catch (error) {
                        logger.error(`${store.name} 데이터 조회 실패:`, {
                            error: error instanceof Error ? error.message : "알 수 없는 오류",
                            storeUrl: store.url,
                        });
                        throw error;
                    }
                })
            );

            const successfulResults = storeResults.filter((result): result is PromiseFulfilledResult<StoreData> => result.status === "fulfilled").map((result) => result.value);

            const failedStores = storeResults
                .filter((result): result is PromiseRejectedResult => result.status === "rejected")
                .map((result, index) => selectedStoreList[index].name);

            if (failedStores.length > 0) {
                setError(`일부 스토어 데이터 조회 실패: ${failedStores.join(", ")}`);
            }

            if (successfulResults.length > 0) {
                setStoreData(successfulResults);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "데이터를 가져오는 중 오류가 발생했습니다.";
            setError(errorMessage);
            logger.error("Error:", { error: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">네이버 스토어 판매량 분석</h1>
                    <p className="text-lg text-gray-600">선택한 스토어의 판매 데이터를 분석합니다.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-8 mb-12">
                    <div className="mb-6">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={storeUrl}
                                onChange={(e) => setStoreUrl(e.target.value)}
                                placeholder="네이버 스토어 URL을 입력하세요"
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                            <button
                                onClick={handleUrlSubmit}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                            >
                                추가
                            </button>
                        </div>
                    </div>
                    <StoreSelector stores={stores} selectedStores={selectedStores} onStoreToggle={handleStoreToggle} onSelectAll={handleSelectAll} />
                    <div className="mt-6">
                        <button
                            onClick={handleSubmit}
                            disabled={loading || selectedStores.size === 0}
                            className={`w-full py-3 px-4 rounded-xl text-white font-medium transition-all ${
                                loading || selectedStores.size === 0
                                    ? "bg-gray-300 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            }`}
                        >
                            {loading ? "분석 중..." : "분석 시작"}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-12">
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                {storeData.length > 0 && (
                    <div className="space-y-12">
                        {storeData.map((store, index) => (
                            <div key={`${store.storeName}-${index}`} className="bg-white rounded-2xl shadow-sm p-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">{store.storeName}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-blue-50 rounded-xl p-6">
                                        <h3 className="text-sm font-medium text-blue-600 mb-2">오늘 판매량</h3>
                                        <p className="text-3xl font-bold text-blue-700">{formatNumber(store.products.reduce((sum, product) => sum + product.sales.today, 0))}개</p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-6">
                                        <h3 className="text-sm font-medium text-green-600 mb-2">주간 판매량</h3>
                                        <p className="text-3xl font-bold text-green-700">{formatNumber(store.products.reduce((sum, product) => sum + product.sales.week, 0))}개</p>
                                    </div>
                                    <div className="bg-purple-50 rounded-xl p-6">
                                        <h3 className="text-sm font-medium text-purple-600 mb-2">반년 판매량</h3>
                                        <p className="text-3xl font-bold text-purple-700">
                                            {formatNumber(store.products.reduce((sum, product) => sum + product.sales.halfYear, 0))}개
                                        </p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품명</th>
                                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">가격</th>
                                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">재고</th>
                                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">오늘 판매</th>
                                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">주간 판매</th>
                                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">반년 판매</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {store.products.map((product) => (
                                                <tr key={product.productId} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                        <div className="text-sm text-gray-500">ID: {product.productId}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatNumber(product.price)}원</td>
                                                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatNumber(product.stockQuantity)}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatNumber(product.sales.today)}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatNumber(product.sales.week)}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatNumber(product.sales.halfYear)}</td>
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
