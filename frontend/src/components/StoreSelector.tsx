import { Store } from "@/types/store";

interface StoreSelectorProps {
    stores: Store[];
    selectedStores: Set<string>;
    onStoreToggle: (storeId: string) => void;
    onSelectAll: (selected: boolean) => void;
}

export default function StoreSelector({ stores, selectedStores, onStoreToggle, onSelectAll }: StoreSelectorProps) {
    const allSelected = stores.length > 0 && stores.every((store) => selectedStores.has(store.id));

    const handleSelectAll = () => {
        onSelectAll(!allSelected);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">스토어 선택</h3>
                <button onClick={handleSelectAll} className="text-sm text-blue-600 hover:text-blue-800">
                    {allSelected ? "전체 해제" : "전체 선택"}
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stores.map((store) => (
                    <div key={store.id} className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id={store.id}
                            checked={selectedStores.has(store.id)}
                            onChange={() => onStoreToggle(store.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={store.id} className="text-sm font-medium text-gray-700">
                            {store.name}
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
}
