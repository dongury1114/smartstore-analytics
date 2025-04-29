import { NextResponse } from "next/server";
import { exec } from "child_process";
import axios from "axios";
import { getServerSession } from "next-auth";
import { StoreManager } from "@/lib/StoreManager";
import { ProductData } from "@/types/sales";

interface ParsedData {
    price: number;
    name: string;
    stockQuantity: number;
}

const CONSTANTS = {
    TODAY_BASIS: 0,
    INITIAL_BASIS: 1,
    MAX_RETRIES: 3,
    BATCH_SIZE: 5,
    BATCH_DELAY: 2000,
};

class ParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ParseError";
    }
}

class SalesDataCollector {
    private productId: string;
    private productName: string;
    private stockQuantity: number;
    private sales: {
        price: number;
        today: number;
        week: number;
        halfYear: number;
    };

    constructor(productId: string, productName: string, stockQuantity: number) {
        this.productId = productId;
        this.productName = productName;
        this.stockQuantity = stockQuantity;
        this.sales = {
            price: 0,
            today: 0,
            week: 0,
            halfYear: 0,
        };
    }

    private generateCurlCommand(basis: number): string {
        return `curl 'https://smartstore.naver.com/i/v1/marketing-message/${this.productId}?currentPurchaseType=Repaid&usePurchased=true&basisPurchased=${basis}' \
        -H 'accept: application/json, text/plain, */*' \
        -H 'referer: https://smartstore.naver.com/product/${this.productId}' \
        -H 'user-agent: Mozilla/5.0' \
        -b '${process.env.NAVER_COOKIE}'`;
    }

    async fetchSalesData(basis: number, attempt = 1): Promise<{ count: number }> {
        return new Promise((resolve, reject) => {
            const cmd = this.generateCurlCommand(basis);
            console.log(`[API] 판매량 조회 시도: ${this.productName} (${this.productId}), basis: ${basis}, 시도: ${attempt}`);

            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    const isSSLError = stderr.includes("SSL") || stderr.includes("tlsv1 alert");
                    if (isSSLError && attempt < CONSTANTS.MAX_RETRIES) {
                        setTimeout(() => {
                            this.fetchSalesData(basis, attempt + 1)
                                .then(resolve)
                                .catch(reject);
                        }, 100 * attempt);
                        return;
                    }
                    resolve({ count: 0 });
                    return;
                }

                if (!stdout || stdout.trim() === "") {
                    if (attempt < CONSTANTS.MAX_RETRIES) {
                        setTimeout(() => {
                            this.fetchSalesData(basis, attempt + 1)
                                .then(resolve)
                                .catch(reject);
                        }, 1000 * attempt);
                        return;
                    }
                    resolve({ count: 0 });
                    return;
                }

                try {
                    const json = JSON.parse(stdout.trim());

                    if (!json || typeof json !== "object") {
                        throw new Error("Invalid JSON structure");
                    }

                    const count = this.parseSalesCount(json);
                    console.log(`[API] 판매량 조회 결과: ${this.productName} (${this.productId}), basis: ${basis}, 판매량: ${count}`);
                    resolve({ count });
                } catch (parseError) {
                    console.error(`[API] JSON 파싱 실패: ${parseError instanceof Error ? parseError.message : "알 수 없는 오류"}`);
                    if (attempt < CONSTANTS.MAX_RETRIES) {
                        setTimeout(() => {
                            this.fetchSalesData(basis, attempt + 1)
                                .then(resolve)
                                .catch(reject);
                        }, 1000 * attempt);
                        return;
                    }
                    resolve({ count: 0 });
                }
            });
        });
    }

    private parseSalesCount(data: { mainPhrase?: string }): number {
        try {
            if (!data.mainPhrase) {
                console.warn(`[API] mainPhrase 없음: ${this.productName} (${this.productId})`);
                return 0;
            }

            const match = data.mainPhrase.match(/([\d,]+)명/);
            if (!match) {
                console.warn(`[API] 판매량 패턴 매칭 실패: ${this.productName} (${this.productId}), mainPhrase: ${data.mainPhrase}`);
                return 0;
            }

            return parseInt(match[1].replace(/,/g, ""));
        } catch (error) {
            console.error(`[API] 판매량 파싱 실패: ${this.productName} (${this.productId})`, error);
            return 0;
        }
    }

    async collectSalesData() {
        try {
            console.log(`[API] 상품 처리 시작: ${this.productName} (${this.productId})`);

            // 1. 당일 판매량 조회
            const todayResult = await this.fetchSalesData(CONSTANTS.TODAY_BASIS);
            this.sales.today = todayResult.count;
            console.log(`[API] 당일 판매량: ${this.productName} (${this.productId}), ${this.sales.today}`);

            // 2. 판매량에 따른 처리
            if (this.sales.today === 0) {
                // 당일 판매량이 0일 때
                const firstResult = await this.fetchSalesData(CONSTANTS.INITIAL_BASIS);

                if (firstResult.count > 0) {
                    const secondResult = await this.fetchSalesData(firstResult.count + 1);

                    if (secondResult.count > firstResult.count) {
                        this.sales.week = firstResult.count;
                        this.sales.halfYear = secondResult.count;
                    } else {
                        this.sales.week = 0;
                        this.sales.halfYear = firstResult.count;
                    }
                }
            } else {
                // 당일 판매량이 있을 때
                const weekResult = await this.fetchSalesData(this.sales.today + 1);

                if (weekResult.count > this.sales.today) {
                    this.sales.week = weekResult.count;
                    const halfYearResult = await this.fetchSalesData(weekResult.count + 1);
                    this.sales.halfYear = halfYearResult.count || weekResult.count;
                } else {
                    this.sales.week = this.sales.today;
                    this.sales.halfYear = weekResult.count || this.sales.today;
                }
            }

            this.validateSalesData();
            console.log(`[API] 상품 처리 완료: ${this.productName} (${this.productId}), 판매량:`, this.sales);

            return {
                productId: this.productId,
                name: this.productName,
                stockQuantity: this.stockQuantity,
                price: this.sales.price,
                sales: {
                    today: this.sales.today,
                    week: this.sales.week,
                    halfYear: this.sales.halfYear,
                },
            };
        } catch (error) {
            console.error(`[API] 상품 처리 중 에러: ${this.productName} (${this.productId})`, error);
            return {
                productId: this.productId,
                name: this.productName,
                stockQuantity: this.stockQuantity,
                price: this.sales.price,
                sales: {
                    today: this.sales.today,
                    week: this.sales.week,
                    halfYear: this.sales.halfYear,
                },
            };
        }
    }

    private validateSalesData() {
        if (this.sales.week < this.sales.today) this.sales.week = this.sales.today;
        if (this.sales.halfYear < this.sales.week) this.sales.halfYear = this.sales.week;
    }

    private async fetchProductInfo(productId: string): Promise<{ name: string; stockQuantity: number; price: number }> {
        try {
            const response = await axios.get(`https://shopping.naver.com/v1/products/${productId}`, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    Accept: "application/json",
                    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                    Cookie: process.env.NAVER_COOKIE || "",
                },
            });

            const productData = response.data;
            return {
                name: productData.name,
                stockQuantity: productData.stockQuantity || 0,
                price: productData.price || 0,
            };
        } catch (error) {
            console.error(`상품 정보 조회 실패 (${productId}):`, error);
            return {
                name: "알 수 없음",
                stockQuantity: 0,
                price: 0,
            };
        }
    }

    private async fetchProductData(productId: string): Promise<ProductData> {
        const productInfo = await this.fetchProductInfo(productId);
        const collector = new SalesDataCollector(productId, productInfo.name, productInfo.stockQuantity);
        const salesData = await collector.collectSalesData();

        return {
            productId: productId,
            name: productInfo.name,
            price: productInfo.price,
            stockQuantity: productInfo.stockQuantity,
            sales: {
                today: salesData.sales.today,
                week: salesData.sales.week,
                halfYear: salesData.sales.halfYear,
            },
        };
    }

    private async processProduct(productId: string): Promise<ProductData> {
        try {
            const data = await this.fetchProductData(productId);
            return data;
        } catch (error: unknown) {
            throw this.handleError(error);
        }
    }

    private async parseProductData(rawData: string): Promise<ParsedData> {
        try {
            const data = JSON.parse(rawData);
            return {
                price: Number(data.price),
                name: data.name,
                stockQuantity: Number(data.stockQuantity),
            };
        } catch (error) {
            throw new Error(`데이터 파싱 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
        }
    }

    public async collectData(): Promise<ProductData> {
        try {
            await this.processProduct(this.productId);

            return {
                productId: this.productId,
                name: this.productName,
                stockQuantity: this.stockQuantity,
                price: this.sales.price,
                sales: {
                    today: this.sales.today,
                    week: this.sales.week,
                    halfYear: this.sales.halfYear,
                },
            };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    private parseError(error: unknown): Error {
        if (error instanceof Error) {
            return error;
        }
        return new Error("알 수 없는 에러가 발생했습니다.");
    }

    private async handleError(error: unknown): Promise<Error> {
        if (error instanceof Error) {
            console.error("데이터 수집 중 오류 발생:", error.message);
            if (error instanceof ParseError) {
                console.error("파싱 오류:", error.message);
            } else {
                console.error("일반 오류:", error.message);
            }
            return error;
        }
        return new Error("상품 데이터 처리 중 에러가 발생했습니다.");
    }

    private async handleApiError(error: unknown): Promise<never> {
        const parsedError = this.parseError(error);
        throw new Error(`API 요청 실패: ${parsedError.message}`);
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession();

        if (!session) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const { storeUrl, storeName } = await req.json();

        if (!storeUrl) {
            return NextResponse.json({ error: "스토어 URL이 필요합니다." }, { status: 400 });
        }

        const storeManager = new StoreManager(storeUrl, storeName);
        const storeData = await storeManager.getStoreData();

        return NextResponse.json(storeData);
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Error processing request:", error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        console.error("Unknown error:", error);
        return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
    }
}

export async function GET(request: Request): Promise<Response> {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("productId");
        const productName = searchParams.get("productName");
        const stockQuantity = Number(searchParams.get("stockQuantity"));

        if (!productId || !productName || isNaN(stockQuantity)) {
            return Response.json({ error: "잘못된 요청 파라미터" }, { status: 400 });
        }

        const collector = new SalesDataCollector(productId, productName, stockQuantity);
        const result = await collector.collectData();
        return Response.json(result);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
        return Response.json({ error: errorMessage }, { status: 500 });
    }
}
