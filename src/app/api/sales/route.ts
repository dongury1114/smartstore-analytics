import { NextResponse } from "next/server";
import { exec } from "child_process";
import { chromium } from "playwright";
import { StoreData, Product } from "@/types/sales";
import axios from "axios";
import { getServerSession } from "next-auth";

const CONSTANTS = {
    TODAY_BASIS: 0,
    INITIAL_BASIS: 1,
    MAX_RETRIES: 3,
    BATCH_SIZE: 5,
    BATCH_DELAY: 2000,
};

class SalesDataCollector {
    private productId: string;
    private productName: string;
    private stockQuantity: number;
    private sales: { today: number; week: number; halfYear: number };
    private price: number;

    constructor(productId: string, productName: string, stockQuantity: number) {
        this.productId = productId;
        this.productName = productName;
        this.stockQuantity = stockQuantity;
        this.sales = { today: 0, week: 0, halfYear: 0 };
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
                } catch (e) {
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

    private parseSalesCount(data: any): number {
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
        } catch (e) {
            console.error(`[API] 판매량 파싱 실패: ${this.productName} (${this.productId})`, e);
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
                price: this.price,
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
                price: this.price,
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

    private async processProduct(productId: string): Promise<void> {
        try {
            const productInfo = await this.fetchProductInfo(productId);
            const salesCount = await this.fetchSalesData(productId);

            this.products.push({
                productId,
                name: productInfo.name,
                stockQuantity: productInfo.stockQuantity,
                price: productInfo.price,
                sales: salesCount,
            });
        } catch (error) {
            console.error(`상품 처리 실패 (${productId}):`, error);
        }
    }
}

class StoreManager {
    private storeUrl: string;
    private storeName: string;

    constructor(storeUrl: string, storeName: string) {
        this.storeUrl = storeUrl;
        this.storeName = storeName;
    }

    private async getProductList(): Promise<{ productId: string; name: string; stockQuantity: number; price: number }[]> {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        });
        const page = await context.newPage();

        try {
            await page.goto(this.storeUrl);
            await page.waitForLoadState("networkidle");

            const scriptContent = await page.evaluate(() => {
                const scripts = Array.from(document.querySelectorAll("script"));
                const targetScript = scripts.find((s) => s.textContent?.includes("window.__PRELOADED_STATE__"));
                return targetScript?.textContent || "";
            });

            if (!scriptContent) {
                console.error(`❌ ${this.storeUrl}: PRELOADED_STATE를 찾을 수 없습니다`);
                return [];
            }

            const jsonStr = scriptContent.replace("window.__PRELOADED_STATE__=", "").trim().replace(/;$/, "");

            try {
                const data = JSON.parse(jsonStr);
                let products = [];

                // 데이터 구조 디버깅
                const dataStructure = {
                    hasNewProductWidget: !!data?.widgetContents?.newProductWidget?.A?.data,
                    hasWholeProductWidget: !!data?.widgetContents?.wholeProductWidget?.A?.data?.simpleProducts,
                    hasProductList: !!data?.widgetContents?.productList?.A?.data,
                };
                console.log(`📊 ${this.storeUrl} 데이터 구조:`, dataStructure);

                // 경로 1: 신상품 위젯
                if (data?.widgetContents?.newProductWidget?.A?.data) {
                    console.log(`✓ ${this.storeUrl}: 신상품 위젯에서 상품 발견`);
                    products = data.widgetContents.newProductWidget.A.data;
                }

                // 경로 2: 전체상품 위젯
                if (products.length === 0 && data?.widgetContents?.wholeProductWidget?.A?.data?.simpleProducts) {
                    console.log(`✓ ${this.storeUrl}: 전체상품 위젯에서 상품 발견`);
                    products = data.widgetContents.wholeProductWidget.A.data.simpleProducts;
                }

                // 경로 3: 상품 리스트
                if (products.length === 0 && data?.widgetContents?.productList?.A?.data) {
                    console.log(`✓ ${this.storeUrl}: 상품 리스트에서 상품 발견`);
                    products = data.widgetContents.productList.A.data;
                }

                if (products.length === 0) {
                    console.error(`❌ ${this.storeUrl}: 어떤 경로에서도 상품을 찾을 수 없습니다`);
                    return [];
                }

                const extracted = products.map((p: any) => ({
                    productId: p.productNo,
                    name: p.name,
                    stockQuantity: p.stockQuantity ?? 0,
                    price: p.benefitsView?.discountedSalePrice ?? p.salePrice ?? 0,
                }));

                console.log(`✅ ${this.storeUrl}: ${extracted.length}개 상품 추출 완료`);
                return extracted;
            } catch (parseError) {
                console.error(`❌ ${this.storeUrl}: JSON 파싱 실패:`, parseError.message);
                return [];
            }
        } catch (e) {
            console.error(`❌ ${this.storeUrl}: 상품 목록 추출 중 에러:`, e.message);
            return [];
        } finally {
            await browser.close();
        }
    }

    public async getStoreData(): Promise<StoreData> {
        console.log(`Starting store data request for ${this.storeName} (${this.storeUrl})`);

        const products = await this.getProductList();
        console.log(`Fetched product list for ${this.storeName}: ${products.length} products`);

        const storeSummary: Product[] = [];

        for (let i = 0; i < products.length; i += CONSTANTS.BATCH_SIZE) {
            const batch = products.slice(i, i + CONSTANTS.BATCH_SIZE);
            console.log(`Processing batch ${i / CONSTANTS.BATCH_SIZE + 1} for ${this.storeName}`);

            const batchResults = await Promise.all(
                batch.map(async (product) => {
                    const collector = new SalesDataCollector(product.productId, product.name, product.stockQuantity);
                    const result = await collector.collectSalesData();
                    console.log(`[API] 상품 처리 완료: ${product.name} (${product.productId})`);
                    return {
                        ...result,
                        price: product.price,
                    };
                })
            );

            storeSummary.push(...batchResults);

            if (i + CONSTANTS.BATCH_SIZE < products.length) {
                await new Promise((resolve) => setTimeout(resolve, CONSTANTS.BATCH_DELAY));
            }
        }

        const todaySales = storeSummary.reduce((sum, product) => sum + product.sales.today, 0);
        const weekSales = storeSummary.reduce((sum, product) => sum + product.sales.week, 0);
        const halfYearSales = storeSummary.reduce((sum, product) => sum + product.sales.halfYear, 0);

        console.log(`Completed store data processing for ${this.storeName}`);

        return {
            storeName: this.storeName,
            todaySales,
            weekSales,
            halfYearSales,
            products: storeSummary,
        };
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

        // 네이버 쿠키 설정
        const cookies = {
            NID_AUT: process.env.NAVER_NID_AUT,
            NID_SES: process.env.NAVER_NID_SES,
        };

        // 네이버 스토어 데이터 가져오기
        const response = await fetch(storeUrl, {
            headers: {
                Cookie: Object.entries(cookies)
                    .map(([key, value]) => `${key}=${value}`)
                    .join("; "),
            },
        });

        if (!response.ok) {
            throw new Error("스토어 데이터를 가져오는데 실패했습니다.");
        }

        const data = await response.json();

        return NextResponse.json({
            storeName,
            products: data.products.map(
                (product: { id: string; name: string; price: number; stockQuantity: number; sales: { today: number; week: number; halfYear: number } }) => ({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    stockQuantity: product.stockQuantity,
                    sales: {
                        today: product.sales.today,
                        week: product.sales.week,
                        halfYear: product.sales.halfYear,
                    },
                })
            ),
        });
    } catch (error) {
        console.error("Error in sales route:", error);
        return NextResponse.json({ error: "데이터를 가져오는 중 오류가 발생했습니다." }, { status: 500 });
    }
}
