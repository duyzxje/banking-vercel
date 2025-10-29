import { Customer, GetCustomerResponse, ListCustomersResponse, UpsertCustomerBody, UpsertCustomerResponse } from './CustomerTypes';

// Follow Worktime convention like OrderService: use NEXT_PUBLIC_WORKTIME_API_URL or hosted Render API, fallback '/api'
const API_BASE =
    process.env.NEXT_PUBLIC_WORKTIME_API_URL?.replace(/\/$/, '')
    || 'https://worktime-dux3.onrender.com/api'
    || '/api';

async function httpJson<T>(path: string, init?: RequestInit): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(init && init.headers ? init.headers : {})
        },
        cache: 'no-store'
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}

export const CustomerService = {
    async list(options: { page?: number; limit?: number; search?: string; marked?: boolean; }): Promise<ListCustomersResponse> {
        const params = new URLSearchParams();
        if (options.page) params.set('page', String(options.page));
        if (options.limit) params.set('limit', String(options.limit));
        if (options.search && options.search.trim()) params.set('search', options.search.trim());
        if (options.marked) params.set('marked', 'true');
        return httpJson<ListCustomersResponse>(`/customers?${params.toString()}`);
    },

    async getById(id: number): Promise<GetCustomerResponse> {
        return httpJson<GetCustomerResponse>(`/customers/${id}`);
    },

    async getByUsername(username: string): Promise<GetCustomerResponse> {
        return httpJson<GetCustomerResponse>(`/customers/by-username/${encodeURIComponent(username)}`);
    },

    async upsert(body: UpsertCustomerBody): Promise<UpsertCustomerResponse> {
        return httpJson<UpsertCustomerResponse>(`/customers`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    async update(id: number, body: Partial<UpsertCustomerBody>): Promise<{ success: boolean; data: Customer; }> {
        return httpJson<{ success: boolean; data: Customer; }>(`/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    async mark(id: number, marked: boolean): Promise<{ success: boolean; id: number; marked_at: string | null; }> {
        return httpJson<{ success: boolean; id: number; marked_at: string | null; }>(`/customers/${id}/mark`, {
            method: 'PATCH',
            body: JSON.stringify({ marked })
        });
    },

    async remove(id: number): Promise<{ success: boolean; }> {
        return httpJson<{ success: boolean }>(`/customers/${id}`, {
            method: 'DELETE'
        });
    }
};

export default CustomerService;


