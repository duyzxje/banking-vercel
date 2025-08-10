import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'banking-secret-key-vercel-2025');
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

    const { searchParams } = new URL(request.url);

    // Get query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const transactionType = searchParams.get('transactionType');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const senderBank = searchParams.get('senderBank');
    const status = searchParams.get('status');

    // Build filter object
    const filter: any = {};

    // Search across multiple fields
    if (search) {
      filter.$or = [
        { tenNguoiChuyen: { $regex: search, $options: 'i' } },
        { noiDungGiaoDich: { $regex: search, $options: 'i' } },
        { maGiaoDich: { $regex: search, $options: 'i' } },
        { taiKhoanChuyen: { $regex: search, $options: 'i' } },
        { taiKhoanNhan: { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.ngayGioGiaoDich = {};
      if (dateFrom) {
        filter.ngayGioGiaoDich.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.ngayGioGiaoDich.$lte = endDate;
      }
    }

    // Transaction type filter
    if (transactionType) {
      filter.loaiGiaoDich = { $regex: transactionType, $options: 'i' };
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      filter.soTienNumber = {};
      if (minAmount) {
        filter.soTienNumber.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        filter.soTienNumber.$lte = parseFloat(maxAmount);
      }
    }

    // Sender bank filter
    if (senderBank) {
      filter.nganHangChuyen = { $regex: senderBank, $options: 'i' };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);

    // Get transactions
    const transactions = await Transaction.find(filter)
      .sort({ ngayGioGiaoDich: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error: any) {
    console.error('Get transactions error:', error);

    if (error.message.includes('Token')) {
      return NextResponse.json({
        success: false,
        message: error.message
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      message: 'Lỗi khi tải danh sách giao dịch'
    }, { status: 500 });
  }
}
