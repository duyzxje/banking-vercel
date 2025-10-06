import { CreateFromCommentsPayload, DeleteMultipleResponseItem, ListOrdersResponse, Order, OrderItem, OrderStatus } from './OrderTypes';

// Avoid creating Supabase client at module import time to prevent HMR issues.

// Helpers to map DB rows to app Order/OrderItem types
type OrderRow = {
    id: number;
    customer_username: string;
    total_amount: number;
    status: OrderStatus;
    live_date?: string | null;
    created_at?: string | null;
};

type OrderItemRow = {
    id: number;
    order_id: number;
    product_name?: string | null;
    content?: string | null;
    quantity: number;
    unit_price?: number | null;
    price?: number | null;
    created_at?: string | null;
};

function mapOrder(row: OrderRow): Order {
    return {
        id: row.id,
        customer_username: row.customer_username,
        total_amount: row.total_amount,
        status: row.status,
        live_date: row.live_date ?? undefined,
        created_at: row.created_at ?? undefined
    };
}

function mapItem(row: OrderItemRow): OrderItem {
    return {
        id: row.id,
        order_id: row.order_id,
        product_name: row.product_name ?? undefined,
        content: row.content ?? undefined,
        quantity: row.quantity,
        unit_price: row.unit_price ?? undefined,
        price: row.price ?? undefined,
        created_at: row.created_at ?? undefined
    };
}

// Follow Worktime convention: allow overriding via NEXT_PUBLIC_WORKTIME_API_URL
// Fallback to the hosted Worktime API, and lastly '/api' for local proxy
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

export const OrderService = {
    async listOrders(options: { start?: string; end?: string; page?: number; limit?: number; search?: string; status?: string; }): Promise<ListOrdersResponse> {
        const params = new URLSearchParams();
        if (options.start) params.set('start', options.start);
        if (options.end) params.set('end', options.end);
        if (options.page) params.set('page', String(options.page));
        if (options.limit) params.set('limit', String(options.limit));
        if (options.search && options.search.trim()) params.set('search', options.search.trim());
        if (options.status && options.status.trim()) params.set('status', options.status.trim());
        return httpJson<ListOrdersResponse>(`/orders?${params.toString()}`);
    },

    async getOrder(orderId: number): Promise<{ order: Order; items: OrderItem[] }> {
        return httpJson<{ order: Order; items: OrderItem[] }>(`/orders/${orderId}`);
    },

    async getOrderItems(orderId: number): Promise<{ data: OrderItem[] }> {
        return httpJson<{ data: OrderItem[] }>(`/orders/${orderId}/items`);
    },

    async updateStatus(orderId: number, status: OrderStatus): Promise<{ success: boolean; orderId: number; status: OrderStatus } & Record<string, unknown>> {
        return httpJson<{ success: boolean; orderId: number; status: OrderStatus } & Record<string, unknown>>(`/orders/${orderId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    },

    async createFromComments(payload: CreateFromCommentsPayload): Promise<{ success: boolean; order_id: number; total: number; items: OrderItem[] }> {
        return httpJson<{ success: boolean; order_id: number; total: number; items: OrderItem[] }>(`/orders/from-comments`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async deleteOrder(orderId: number): Promise<{ success: boolean } & Record<string, unknown>> {
        return httpJson<{ success: boolean } & Record<string, unknown>>(`/orders/${orderId}`, {
            method: 'DELETE'
        });
    },

    async deleteMultiple(orderIds: number[]): Promise<DeleteMultipleResponseItem[]> {
        return httpJson<DeleteMultipleResponseItem[]>(`/orders/bulk-delete`, {
            method: 'POST',
            body: JSON.stringify({ ids: orderIds })
        });
    }
};


