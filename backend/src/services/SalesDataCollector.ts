import { exec } from "child_process";
import axios from "axios";
import { SalesData } from "../types/sales";

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

export class SalesDataCollector {
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

    async collectSalesData(): Promise<SalesData> {
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
}
