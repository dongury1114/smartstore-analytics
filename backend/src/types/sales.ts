export interface Sales {
    today: number;
    week: number;
    halfYear: number;
}

export interface ProductData {
    productId: string;
    name: string;
    price: number;
    stockQuantity: number;
    sales: Sales;
}

export interface StoreData {
    storeUrl: string;
    storeName: string;
    products: ProductData[];
}
