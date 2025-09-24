import { NextResponse } from 'next/server';

export function GET() {
    return NextResponse.redirect(new URL('/icon.png', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}


