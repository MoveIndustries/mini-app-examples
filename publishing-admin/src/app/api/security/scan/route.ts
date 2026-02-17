/**
 * API Route: Security Scan
 *
 * Runs a complete security scan on a mini app URL.
 * Combines ZAP spidering + transaction capture + Movement SDK simulation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { MiniAppScanner, type MiniAppScanResult } from '@/security/scanner';

// Environment configuration
const ZAP_BASE_URL = process.env.ZAP_BASE_URL || 'http://localhost:8080';
const ZAP_API_KEY = process.env.ZAP_API_KEY;
const COLLECTOR_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const MOVEMENT_RPC_URL =
  process.env.MOVEMENT_RPC_URL || 'https://testnet.bardock.movementnetwork.xyz/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, maxDuration } = body;

    if (!url) {
      return NextResponse.json({ error: 'Missing required field: url' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Initialize scanner
    const scanner = new MiniAppScanner({
      zapBaseUrl: ZAP_BASE_URL,
      zapApiKey: ZAP_API_KEY,
      collectorBaseUrl: COLLECTOR_BASE_URL,
      movementRpcUrl: MOVEMENT_RPC_URL,
      maxSpiderDuration: maxDuration || 10,
    });

    // Run scan
    const result = await scanner.scan(url);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Security scan error:', error);
    return NextResponse.json(
      {
        error: 'Scan failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return scanner configuration info
  return NextResponse.json({
    status: 'ready',
    config: {
      zapConfigured: !!ZAP_BASE_URL,
      movementRpc: MOVEMENT_RPC_URL,
    },
  });
}
