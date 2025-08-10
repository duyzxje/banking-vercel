import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Transaction from '@/lib/models/Transaction';

// Middleware to verify JWT token
async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Token không được cung cấp');
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'banking-secret-key-vercel-2025'
    ) as JwtPayload;
    return decoded;
  } catch (error) {
    throw new Error('Token không hợp lệ');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    await verifyToken(request);

    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total transactions
    const totalTransactions = await Transaction.countDocuments();

    // Total incoming amount (số tiền dương)
    const incomingStats = await Transaction.aggregate([
      { $match: { soTienNumber: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$soTienNumber' } } }
    ]);
    const totalIncoming = incomingStats[0]?.total || 0;

    // Today's transactions
    const todayTransactions = await Transaction.countDocuments({
      ngayGioGiaoDich: { $gte: today, $lt: tomorrow }
    });

    // Today's amount
    const todayStats = await Transaction.aggregate([
      {
        $match: {
          ngayGioGiaoDich: { $gte: today, $lt: tomorrow },
          soTienNumber: { $gt: 0 }
        }
      },
      { $group: { _id: null, total: { $sum: '$soTienNumber' } } }
    ]);
    const todayAmount = todayStats[0]?.total || 0;

    // Recent transactions by bank
    const bankStats = await Transaction.aggregate([
      { $match: { soTienNumber: { $gt: 0 } } },
      { $group: { _id: '$nganHangChuyen', count: { $sum: 1 }, total: { $sum: '$soTienNumber' } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalTransactions,
        totalIncoming,
        todayTransactions,
        todayAmount,
        bankStats
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);

    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json({
        success: false,
        message: error.message
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      message: 'Lỗi khi tải thống kê'
    }, { status: 500 });
  }
}
