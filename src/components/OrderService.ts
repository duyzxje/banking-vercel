import { CreateFromCommentsPayload, DeleteMultipleResponseItem, ListOrdersResponse, Order, OrderItem, OrderStatus } from './OrderTypes';
import { getSupabase } from '@/lib/supabaseClient';

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

export const OrderService = {
    async listOrders(options: { start?: string; end?: string; page?: number; limit?: number; search?: string; status?: string; }): Promise<ListOrdersResponse> {
        const supabase = getSupabase();
        const limit = options.limit ?? 100000;
        let query = supabase.from('orders').select('*', { count: 'exact' });

        if (options.start) query = query.gte('created_at', options.start);
        if (options.end) query = query.lte('created_at', options.end);
        if (options.search && options.search.trim()) {
            const s = options.search.trim();
            query = query.ilike('customer_username', `%${s}%`);
        }
        if (options.status && options.status.trim()) {
            query = query.eq('status', options.status);
        }
        query = query.order('created_at', { ascending: false }).limit(limit);

        const { data, error } = await query;
        if (error) {
            console.error('Supabase listOrders error:', { message: error.message, details: error.details, hint: error.hint });
            throw new Error(`Failed to list orders: ${error.message}`);
        }
        const orders: Order[] = (data as OrderRow[]).map(mapOrder);

        // Build status counts
        const statuses: OrderStatus[] = ['gap', 'di_don', 'chua_rep', 'giu_don', 'hoan_thanh'];
        const statusCounts: { status: OrderStatus; count: number }[] = [];
        for (const st of statuses) {
            const { count, error: errCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('status', st);
            if (errCount) {
                console.error('Supabase status count error:', { status: st, message: errCount.message, details: errCount.details, hint: errCount.hint });
                throw new Error(`Failed to count status ${st}: ${errCount.message}`);
            }
            statusCounts.push({ status: st, count: count ?? 0 });
        }

        return { data: orders, statusCounts };
    },

    async getOrder(orderId: number): Promise<{ order: Order; items: OrderItem[] }> {
        const supabase = getSupabase();
        const { data: orderRow, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (error) {
            console.error('Supabase getOrder error:', { orderId, message: error.message, details: error.details, hint: error.hint });
            throw new Error(`Failed to get order: ${error.message}`);
        }
        const { data: itemsRows, error: itemsErr } = await supabase.from('order_items').select('*').eq('order_id', orderId).order('id');
        if (itemsErr) {
            console.error('Supabase getOrderItems error:', { orderId, message: itemsErr.message, details: itemsErr.details, hint: itemsErr.hint });
            throw new Error(`Failed to get order items: ${itemsErr.message}`);
        }
        return { order: mapOrder(orderRow as OrderRow), items: (itemsRows as OrderItemRow[]).map(mapItem) };
    },

    async getOrderItems(orderId: number): Promise<{ data: OrderItem[] }> {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId).order('id');
        if (error) throw error;
        return { data: (data as OrderItemRow[]).map(mapItem) };
    },

    async updateStatus(orderId: number, status: OrderStatus): Promise<{ success: boolean; orderId: number; status: OrderStatus } & Record<string, unknown>> {
        const supabase = getSupabase();
        const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
        if (error) {
            console.error('Supabase updateStatus error:', { orderId, status, message: error.message, details: error.details, hint: error.hint });
            throw new Error(`Failed to update status: ${error.message}`);
        }
        return { success: true, orderId, status };
    },

    async createFromComments(payload: CreateFromCommentsPayload): Promise<{ success: boolean; order_id: number; total: number; items: OrderItem[] }> {
        // Minimal example: create empty order with username and live_date
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('orders')
            .insert({ customer_username: payload.username, live_date: payload.liveDate, total_amount: 0, status: 'chua_rep' })
            .select('*')
            .single();
        if (error) {
            console.error('Supabase createFromComments error:', { payload, message: error.message, details: error.details, hint: error.hint });
            throw new Error(`Failed to create order: ${error.message}`);
        }
        return { success: true, order_id: (data as OrderRow).id, total: 0, items: [] };
    },

    async deleteOrder(orderId: number): Promise<{ success: boolean } & Record<string, unknown>> {
        const supabase = getSupabase();
        const { error } = await supabase.from('orders').delete().eq('id', orderId);
        if (error) {
            console.error('Supabase deleteOrder error:', { orderId, message: error.message, details: error.details, hint: error.hint });
            throw new Error(`Failed to delete order: ${error.message}`);
        }
        return { success: true };
    },

    async deleteMultiple(orderIds: number[]): Promise<DeleteMultipleResponseItem[]> {
        const supabase = getSupabase();
        const { error } = await supabase.from('orders').delete().in('id', orderIds);
        if (error) {
            console.error('Supabase deleteMultiple error:', { orderIds, message: error.message, details: error.details, hint: error.hint });
            throw new Error(`Failed to delete multiple: ${error.message}`);
        }
        return orderIds.map(id => ({ orderId: id, success: true }));
    }
};


