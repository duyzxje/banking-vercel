'use client';

export interface Customer {
    id: number;
    username: string;
    name: string;
    phone?: string;
    address?: string;
    notes?: string;
    marked_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ListCustomersResponse {
    success: boolean;
    data: Customer[];
    total: number;
    page: number;
    limit: number;
}

export interface GetCustomerResponse {
    success: boolean;
    data: Customer | null;
}

export interface UpsertCustomerBody {
    username: string;
    name?: string;
    phone?: string;
    address?: string;
    notes?: string;
}

export interface UpsertCustomerResponse {
    success: boolean;
    data: Customer;
    upserted: boolean;
    action: 'created' | 'updated';
}


