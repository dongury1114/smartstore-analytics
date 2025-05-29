import { Store } from "../types/store";
import storeConfig from "../config/stores.json";

export class StoreService {
    private stores: Store[];

    constructor() {
        this.stores = storeConfig.stores;
    }

    public getAllStores(): Store[] {
        return this.stores;
    }

    public getStoreById(id: string): Store | undefined {
        return this.stores.find((store) => store.id === id);
    }
}
