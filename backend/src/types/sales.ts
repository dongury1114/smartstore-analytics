export interface SalesData {
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
    storeUrl: string;
    storeName: string;
    products: SalesData[];
}
