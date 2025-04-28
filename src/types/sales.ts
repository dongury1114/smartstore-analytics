export interface Store {
    url: string;
    name: string;
}

export interface Product {
    productId: string;
    name: string;
    stockQuantity: number;
    price: number;
    sales: {
        today: number;
        week: number;
        halfYear: number;
    };
}

export interface StoreData {
    storeName: string;
    todaySales: number;
    weekSales: number;
    halfYearSales: number;
    products: Product[];
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
    products: Product[];
}
