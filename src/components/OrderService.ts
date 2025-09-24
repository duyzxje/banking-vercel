import { CreateFromCommentsPayload, DeleteMultipleResponseItem, ListOrdersResponse, Order, OrderItem, OrderStatus } from './OrderTypes';

const API_BASE = 'http://192.168.1.50:3001';

function buildQuery(params: Record<string, string | number | undefined>) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        qs.set(key, String(value));
    });
    return qs.toString();
}

export const OrderService = {
    async listOrders(options: { start?: string; end?: string; page?: number; limit?: number; search?: string; status?: string; }): Promise<ListOrdersResponse> {
        const query = buildQuery({
            start: options.start,
            end: options.end,
            page: 1,
            // large limit to effectively disable pagination on UI
            limit: options.limit ?? 100000,
            search: options.search ?? '',
            status: options.status ?? ''
        });
        const res = await fetch(`${API_BASE}/api/orders?${query}`);
        if (!res.ok) throw new Error('Failed to list orders');
        return res.json();
    },

    async getOrder(orderId: number): Promise<{ order: Order; items: OrderItem[] }> {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}`);
        if (!res.ok) throw new Error('Failed to get order detail');
        return res.json();
    },

    async getOrderItems(orderId: number): Promise<{ data: OrderItem[] }> {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}/items`);
        if (!res.ok) throw new Error('Failed to get items');
        return res.json();
    },

    async updateStatus(orderId: number, status: OrderStatus): Promise<{ success: boolean; orderId: number; status: OrderStatus } & Record<string, unknown>> {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error('Failed to update order status');
        return res.json();
    },

    async createFromComments(payload: CreateFromCommentsPayload): Promise<{ success: boolean; order_id: number; total: number; items: OrderItem[] }> {
        const res = await fetch(`${API_BASE}/api/orders/create-from-comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create order');
        return res.json();
    },

    async deleteOrder(orderId: number): Promise<{ success: boolean } & Record<string, unknown>> {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete order');
        return res.json();
    },

    async deleteMultiple(orderIds: number[]): Promise<DeleteMultipleResponseItem[]> {
        const res = await fetch(`${API_BASE}/api/orders/delete-multiple`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIds })
        });
        if (!res.ok) throw new Error('Failed to delete multiple orders');
        return res.json();
    }
};


