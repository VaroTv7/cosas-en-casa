import axios from 'axios';

const api = axios.create({
    baseURL: '/api'
});

export interface Space {
    id: number;
    name: string;
    parent_id?: number;
    containers: Container[];
}

export interface Container {
    id: number;
    name: string;
    space_id: number;
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

export const createSpace = async (name: string, parent_id?: number) => {
    const response = await api.post('/spaces', { name, parent_id });
    return response.data;
};

export const updateSpace = async (id: number, name: string) => {
    const response = await api.put(`/spaces/${id}`, { name });
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

export default api;
