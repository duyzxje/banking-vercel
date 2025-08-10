import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Token không được cung cấp'
      }, { status: 401 });
    }

    // Verify JWT token
    interface AuthPayload extends JwtPayload {
      userId: string;
      username?: string;
      role?: string;
    }
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'banking-secret-key-vercel-2025'
    ) as AuthPayload;

    await connectDB();

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return NextResponse.json({
        success: false,
        message: 'Token không hợp lệ'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name || user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({
      success: false,
      message: 'Token không hợp lệ'
    }, { status: 401 });
  }
}
