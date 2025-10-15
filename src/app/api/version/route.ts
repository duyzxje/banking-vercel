import { NextResponse } from 'next/server';

function getBuildId(): string {
    // Prefer Vercel commit SHA when available
    const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
    if (vercelSha) return vercelSha.slice(0, 12);

    // Fallback to Next.js build id if provided at runtime
    const nextBuildId = process.env.NEXT_BUILD_ID;
    if (nextBuildId) return nextBuildId;

    // Fallback to timestamp
    return new Date().toISOString();
}

export async function GET() {
    const version = getBuildId();
    return NextResponse.json({ version });
}


