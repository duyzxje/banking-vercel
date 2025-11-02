import { NextRequest, NextResponse } from 'next/server';

const API_URL = 'https://worktime-dux3.onrender.com/api';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader) {
            return NextResponse.json({
                success: false,
                message: 'Token không được cung cấp'
            }, { status: 401 });
        }

        // Get query params to forward
        const { searchParams } = new URL(request.url);
        const queryString = searchParams.toString();

        // Forward the request to worktime API
        const url = queryString ? `${API_URL}/orders?${queryString}` : `${API_URL}/orders`;
        const response = await fetch(url, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: errorText || 'Lỗi khi tải danh sách đơn hàng' };
            }
            console.error('List orders failed:', errorData);
            return NextResponse.json({
                success: false,
                message: errorData.message || 'Lỗi khi tải danh sách đơn hàng'
            }, { status: response.status });
        }

        const result = await response.json();
        return NextResponse.json(result);

    } catch (error) {
        console.error('List orders error:', error);

        return NextResponse.json({
            success: false,
            message: 'Lỗi khi tải danh sách đơn hàng'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader) {
            return NextResponse.json({
                success: false,
                message: 'Token không được cung cấp'
            }, { status: 401 });
        }

        // Get the request body
        const body = await request.json();

        // Forward the request to worktime API
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: errorText || 'Lỗi khi tạo đơn hàng' };
            }
            console.error('Create order failed:', errorData);
            return NextResponse.json({
                success: false,
                message: errorData.message || 'Lỗi khi tạo đơn hàng'
            }, { status: response.status });
        }

        const result = await response.json();
        return NextResponse.json(result);

    } catch (error) {
        console.error('Create order error:', error);

        return NextResponse.json({
            success: false,
            message: 'Lỗi khi tạo đơn hàng'
        }, { status: 500 });
    }
}

