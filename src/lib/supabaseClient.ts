'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (cachedClient) return cachedClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngjdcukquavgtegvfjbd.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5namRjdWtxdWF2Z3RlZ3ZmamJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjU3NjAsImV4cCI6MjA3NDc0MTc2MH0.FedzkHLD-zgl_xG1BSyfuTI2U-szNKmOlZRto0ikoDs';

    cachedClient = createClient(url, key);
    return cachedClient;
}


