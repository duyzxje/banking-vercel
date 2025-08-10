import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      }, { status: 400 });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: username },
        { email: username }
      ]
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không đúng'
      }, { status: 401 });
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      }, { status: 401 });
    }


    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'banking-secret-key-vercel-2025',
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name || user.username,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });

  } catch (error: unknown) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'Lỗi server (kiểm tra kết nối CSDL và cấu hình MONGODB_URI).'
        : `Lỗi server: ${message}`
    }, { status: 500 });
  }
}
