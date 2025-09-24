export type OrderStatus = 'chua_rep' | 'giu_don' | 'di_don' | 'gap' | 'hoan_thanh';

export interface OrderItem {
    id: number;
    order_id: number;
    product_name?: string; // Legacy field
    content?: string; // New field from API
    quantity: number;
    price?: number; // Legacy field
    unit_price?: number; // New field from API
    created_at?: string;
}

export interface Order {
    id: number;
    customer_username: string;
    total_amount: number;
    status: OrderStatus;
    live_date?: string | null;
    created_at?: string;
}

export interface StatusCountEntry {
    status: OrderStatus;
    count: number;
}

export interface ListOrdersResponse {
    data: Order[];
    page?: number;
    limit?: number;
    total?: number;
    statusCounts: StatusCountEntry[];
}

export interface CreateFromCommentsPayload {
    username: string;
    liveDate: string; // ISO string
    // other fields if needed
}

export interface DeleteMultipleResponseItem {
    orderId: number;
    success: boolean;
    message?: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    chua_rep: 'Chưa rep',
    giu_don: 'Giữ đơn',
    di_don: 'Đi đơn',
    gap: 'Gấp',
    hoan_thanh: 'Hoàn thành'
};

export const ORDER_STATUS_SORT_WEIGHT: Record<OrderStatus, number> = {
    gap: 1,
    di_don: 2,
    chua_rep: 3,
    giu_don: 4,
    hoan_thanh: 5
};


