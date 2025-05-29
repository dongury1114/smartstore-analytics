export interface Store {
    url: string;
    name: string;
}

export interface Sales {
    today: number;
    week: number;
    halfYear: number;
}

export interface ProductData {
    productId: string;
    name: string;
    stockQuantity: number;
    price: number;
    sales: Sales;
}

export interface StoreData {
    storeName: string;
    storeUrl: string;
    todaySales: number;
    weekSales: number;
    halfYearSales: number;
    products: ProductData[];
}

// API 응답 타입을 StoreData와 통일
export type StoreDataType = StoreData;

export interface StoreSummary {
    totalProducts: number;
    totalSales: Sales;
    totalRevenue: {
        today: string;
        week: string;
        halfYear: string;
    };
    products: ProductData[];
}
