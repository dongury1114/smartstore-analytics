import { chromium } from "playwright";
import { ProductData, StoreData } from "../types/sales";
import { SalesDataCollector } from "./SalesDataCollector";

const CONSTANTS = {
    BATCH_SIZE: 5,
    BATCH_DELAY: 2000,
};

export class StoreManager {
    private storeUrl: string;
    private storeName: string;
    private products: ProductData[] = [];

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

                interface Product {
                    productNo: string;
                    name: string;
                    stockQuantity?: number;
                    benefitsView?: {
                        discountedSalePrice?: number;
                    };
                    salePrice?: number;
                }

                const extracted = products.map((p: Product) => ({
                    productId: p.productNo,
                    name: p.name,
                    stockQuantity: p.stockQuantity ?? 0,
                    price: p.benefitsView?.discountedSalePrice ?? p.salePrice ?? 0,
                }));

                console.log(`✅ ${this.storeUrl}: ${extracted.length}개 상품 추출 완료`);
                return extracted;
            } catch (error) {
                if (error instanceof Error) {
                    console.error(`❌ ${this.storeUrl}: JSON 파싱 실패:`, error.message);
                }
                return [];
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error(`❌ ${this.storeUrl}: 상품 목록 추출 중 에러:`, error.message);
            }
            return [];
        } finally {
            await browser.close();
        }
    }

    public async getStoreData(): Promise<StoreData> {
        console.log(`Starting store data request for ${this.storeName} (${this.storeUrl})`);

        const products = await this.getProductList();
        console.log(`Fetched product list for ${this.storeName}: ${products.length} products`);

        const storeSummary: ProductData[] = [];

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

        console.log(`Completed store data processing for ${this.storeName}`);

        return {
            storeUrl: this.storeUrl,
            storeName: this.storeName,
            products: storeSummary,
        };
    }
}
