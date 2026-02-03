import axios from 'axios';

const api = axios.create({
    baseURL: '/api'
});

export interface Space {
    id: number;
    name: string;
    description?: string;
    parent_id?: number;
    containers: Container[];
}

export interface Container {
    id: number;
    name: string;
    description?: string;
    space_id?: number;
    photo_url?: string;
    items: Item[];
}

export interface Item {
    id: number;
    name: string;
    container_id: number;
    quantity: number;
    description?: string;
    tags?: string;
    expiration_date?: string;
    photo_url?: string;
}

export const getInventory = async () => {
    const response = await api.get<Space[]>('/inventory');
    return response.data;
};

export const createSpace = async (data: { name: string; description?: string; parent_id?: number | null }) => {
    const response = await api.post('/spaces', data);
    return response.data;
};

export const updateSpace = async (id: number, data: { name: string; description?: string; parent_id?: number | null }) => {
    const response = await api.put(`/spaces/${id}`, data);
    return response.data;
};

export const updateContainer = async (id: number, formData: FormData) => {
    const response = await api.put(`/containers/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const createContainer = async (formData: FormData) => {
    const response = await api.post('/containers', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const createItem = async (formData: FormData) => {
    const response = await api.post('/items', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const updateItem = async (id: number, formData: FormData) => {
    const response = await api.put(`/items/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const deleteItem = async (id: number) => {
    const response = await api.delete(`/items/${id}`);
    return response.data;
};

export const deleteContainer = async (id: number) => {
    const response = await api.delete(`/containers/${id}`);
    return response.data;
};

export const deleteSpace = async (id: number) => {
    const response = await api.delete(`/spaces/${id}`);
    return response.data;
};

export const getItem = async (id: number | string) => {
    const response = await api.get<Item>(`/items/${id}`);
    return response.data;
}

export const searchItems = async (query: string) => {
    const response = await api.get<Item[]>(`/search?q=${encodeURIComponent(query)}`);
    return response.data;
};

// ==================== v0.2 APIs ====================

export interface ItemPhoto {
    id: number;
    item_id: number;
    photo_url: string;
    is_primary: number;
    created_at: string;
}

export interface ItemFull extends Item {
    photos: ItemPhoto[];
}

export interface FloorPlan {
    id: number;
    name: string;
    width: number;
    height: number;
    background_color: string;
}

export interface RoomLayout {
    id: number;
    space_id: number;
    space_name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}

export interface ContainerPosition {
    id: number;
    container_id: number;
    container_name: string;
    space_id: number;
    room_layout_id?: number;
    x: number;
    y: number;
    width?: number;
    height?: number;
    icon: string;
}

export interface FloorPlanData {
    plan: FloorPlan;
    rooms: RoomLayout[];
    containers: ContainerPosition[];
}

// Item with photos
export const getItemFull = async (id: number | string) => {
    const response = await api.get<ItemFull>(`/items/${id}/full`);
    return response.data;
};

// Item Photos
export const getItemPhotos = async (itemId: number) => {
    const response = await api.get<ItemPhoto[]>(`/items/${itemId}/photos`);
    return response.data;
};

export const addItemPhoto = async (itemId: number, photo: File) => {
    const formData = new FormData();
    formData.append('photo', photo);
    const response = await api.post(`/items/${itemId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const deleteItemPhoto = async (itemId: number, photoId: number) => {
    const response = await api.delete(`/items/${itemId}/photos/${photoId}`);
    return response.data;
};

export const setItemPhotoPrimary = async (itemId: number, photoId: number) => {
    const response = await api.put(`/items/${itemId}/photos/${photoId}/primary`);
    return response.data;
};

// Floor Plan
export const getFloorPlan = async () => {
    const response = await api.get<FloorPlanData>('/floor-plan');
    return response.data;
};

export const updateFloorPlan = async (data: Partial<FloorPlan>) => {
    const response = await api.put('/floor-plan', data);
    return response.data;
};

// Room Layouts
export const createRoomLayout = async (data: { space_id: number; x?: number; y?: number; width?: number; height?: number; color?: string }) => {
    const response = await api.post('/room-layouts', data);
    return response.data;
};

export const updateRoomLayout = async (id: number, data: { x?: number; y?: number; width?: number; height?: number; color?: string }) => {
    const response = await api.put(`/room-layouts/${id}`, data);
    return response.data;
};

export const deleteRoomLayout = async (id: number) => {
    const response = await api.delete(`/room-layouts/${id}`);
    return response.data;
};

// Container Positions
export const createContainerPosition = async (data: { container_id: number; room_layout_id?: number; x?: number; y?: number; width?: number; height?: number; icon?: string }) => {
    const response = await api.post('/container-positions', data);
    return response.data;
};

export const updateContainerPosition = async (id: number, data: { room_layout_id?: number; x?: number; y?: number; width?: number; height?: number; icon?: string }) => {
    const response = await api.put(`/container-positions/${id}`, data);
    return response.data;
};

export const deleteContainerPosition = async (id: number) => {
    const response = await api.delete(`/container-positions/${id}`);
    return response.data;
};

// Helper: Generate QR code content with item name
export const generateQRContent = (item: Item) => {
    const safeName = item.name
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_')
        .substring(0, 20);
    return `cec:${item.id}:${safeName}`;
};

export default api;
