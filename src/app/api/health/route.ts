import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Lightweight health check used by Railway (and other orchestrators).
 * Returns 200 OK if the app is running.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'shortforge',
  });
}
