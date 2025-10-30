import { NextRequest, NextResponse } from 'next/server';

const API_URL = 'https://worktime-dux3.onrender.com/api';

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
        const response = await fetch(`${API_URL}/orders/create-from-printed`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Create orders from printed failed:', errorData);
            return NextResponse.json({
                success: false,
                message: errorData.message || 'Lỗi khi tạo đơn hàng từ printed history',
                conflictOrder: errorData.conflictOrder
            }, { status: response.status });
        }

        const result = await response.json();
        return NextResponse.json(result);

    } catch (error) {
        console.error('Create orders from printed error:', error);

        return NextResponse.json({
            success: false,
            message: 'Lỗi khi tạo đơn hàng từ printed history'
        }, { status: 500 });
    }
}

