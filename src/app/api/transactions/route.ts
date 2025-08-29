import { NextRequest, NextResponse } from 'next/server';

const API_URL = 'https://worktime-dux3.onrender.com/api';

export async function GET(request: NextRequest) {
  try {
    console.log('Transactions API route hit');
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({
        success: false,
        message: 'Token không được cung cấp'
      }, { status: 401 });
    }

    // Get the query params to forward
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');

    // Build the URL to the worktime backend
    let url = `${API_URL}/transactions`;
    const queryParams = [];
    if (limit) queryParams.push(`limit=${limit}`);

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    console.log(`Forwarding request to: ${url}`);

    // Forward the request to worktime API
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader
      },
      cache: 'no-store' // Ensure we don't cache the response
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Fetch transactions failed with status ${response.status}:`, errorText);

      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json({
          success: false,
          message: errorData.message || 'Lỗi khi tải danh sách giao dịch'
        }, { status: response.status });
      } catch (e) {
        return NextResponse.json({
          success: false,
          message: 'Lỗi khi tải danh sách giao dịch'
        }, { status: response.status });
      }
    }

    const result = await response.json();
    console.log(`Successfully retrieved ${result.transactions?.length || 0} transactions`);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Get transactions error:', error);

    return NextResponse.json({
      success: false,
      message: 'Lỗi khi tải danh sách giao dịch'
    }, { status: 500 });
  }
}