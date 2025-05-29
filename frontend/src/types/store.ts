export interface Store {
    id: string;
    name: string;
    url: string;
}

export interface StoreListResponse {
    stores: Store[];
}
