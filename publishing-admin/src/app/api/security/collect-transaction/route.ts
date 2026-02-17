/**
 * API Route: Collect Transaction
 *
 * Receives transactions captured by the injected mock SDK during security scans.
 * Called from the browser context during ZAP spidering.
 */

import { NextRequest, NextResponse } from 'next/server';
import { TransactionCollector } from '@/security/collector';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scanId, payload, url, triggeredBy } = body;

    if (!scanId || !payload) {
      return NextResponse.json(
        { error: 'Missing required fields: scanId, payload' },
        { status: 400 }
      );
    }

    TransactionCollector.addTransaction(scanId, {
      payload,
      timestamp: Date.now(),
      url: url || 'unknown',
      triggeredBy,
    });

    const count = TransactionCollector.getTransactionCount(scanId);

    return NextResponse.json({
      success: true,
      message: 'Transaction captured',
      totalCaptured: count,
    });
  } catch (error) {
    console.error('Error collecting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to collect transaction' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const scanId = request.nextUrl.searchParams.get('scanId');

  if (!scanId) {
    return NextResponse.json(
      { error: 'Missing scanId parameter' },
      { status: 400 }
    );
  }

  const transactions = TransactionCollector.getTransactions(scanId);

  return NextResponse.json({
    scanId,
    count: transactions.length,
    transactions,
  });
}
