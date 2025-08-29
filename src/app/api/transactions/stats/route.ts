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

    // Forward the request to worktime API
    const response = await fetch(`${API_URL}/transactions/stats`, {
      headers: {
        'Authorization': authHeader
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Fetch transaction stats failed:', errorData);
      return NextResponse.json({
        success: false,
        message: errorData.message || 'Lỗi khi tải thống kê giao dịch'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Get transaction stats error:', error);

    return NextResponse.json({
      success: false,
      message: 'Lỗi khi tải thống kê giao dịch'
    }, { status: 500 });
  }
}