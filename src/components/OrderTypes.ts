export type OrderStatus = 'chua_rep' | 'giu_don' | 'di_don' | 'gap' | 'hoan_thanh' | 'warning';

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
    totalRevenue?: number;
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

export interface CreateFromPrintedHistoryPayload {
    startTime: string; // ISO datetime string
    endTime: string; // ISO datetime string
}

export interface CreateOrderPayload {
    username: string;
    liveDate: string; // Format: "2023-10-21" (YYYY-MM-DD)
    items: Array<{
        content: string;
        unit_price: number;
        quantity: number;
    }>;
    note?: string;
}

export interface CreateOrderResponse {
    success: boolean;
    message?: string;
    data?: {
        order_id: number;
        username: string;
        live_date: string;
        total_amount: number;
        items_count: number;
    };
}

export interface CreatedOrderResult {
    orderId: number;
    username: string;
    itemsAdded: number;
    total: number;
    liveDate: string;
}

export interface UpdatedOrderResult {
    orderId: number;
    username: string;
    itemsAdded: number;
    oldTotal: number;
    newTotal: number;
}

export interface OrderCreationSummary {
    totalOrders: number;
    totalItems: number;
    totalAmount: number;
}

export interface OrderCreationResponse {
    success: boolean;
    data?: {
        created: CreatedOrderResult[];
        updated: UpdatedOrderResult[];
        summary: OrderCreationSummary;
    };
    message?: string;
    conflictOrder?: {
        orderId: number;
        username: string;
        usernameConflict: boolean;
    };
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    chua_rep: 'Chưa rep',
    giu_don: 'Giữ đơn',
    di_don: 'Đi đơn',
    gap: 'Gấp',
    hoan_thanh: 'Hoàn thành',
    warning: 'Cảnh báo'
};

export const ORDER_STATUS_SORT_WEIGHT: Record<OrderStatus, number> = {
    gap: 1,
    di_don: 2,
    chua_rep: 3,
    giu_don: 4,
    warning: 5,
    hoan_thanh: 6
};

export interface PreviewOrderItem {
    content?: string;
    unit_price: number;
    quantity: number;
    line_total: number;
}
export interface PreviewOrder {
    username: string;
    liveDate: string;
    items: PreviewOrderItem[];
    total: number;
}
export interface PreviewOrdersResponseSummary {
    totalOrders: number;
    totalItems: number;
    totalAmount: number;
}
export interface PreviewOrdersResponse {
    success: boolean;
    data?: {
        orders: PreviewOrder[];
        summary: PreviewOrdersResponseSummary;
    };
    message?: string;
    conflictOrder?: {
        orderId: number;
        username: string;
        usernameConflict: boolean;
    };
}