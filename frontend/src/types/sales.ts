export interface Store {
    url: string;
    name: string;
}

export interface ProductData {
    productId: string;
    name: string;
    price: number;
    stockQuantity: number;
    sales: {
        today: number;
        week: number;
        halfYear: number;
    };
}

export interface StoreDataType {
    storeName: string;
    todaySales?: number;
    weekSales?: number;
    halfYearSales?: number;
    products: ProductData[];
}

export interface StoreSummary {
    totalProducts: number;
    totalSales: {
        today: number;
        week: number;
        halfYear: number;
    };
    totalRevenue: {
        today: string;
        week: string;
        halfYear: string;
    };
    products: ProductData[];
}
