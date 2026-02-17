/**
 * API Route: Collect Diagnostic
 *
 * Receives diagnostic events from the injected SDK during scanning.
 */

import { NextRequest, NextResponse } from 'next/server';
import { TransactionCollector } from '@/security/collector';

// CORS headers for cross-origin requests from scanned apps
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scanId, diagnostic } = body;

    if (!scanId || !diagnostic) {
      return NextResponse.json(
        { error: 'Missing scanId or diagnostic' },
        { status: 400 }
      );
    }

    TransactionCollector.addDiagnostic(scanId, diagnostic);

    console.log(`[Diagnostic] ${scanId}: ${diagnostic.action}`, diagnostic.details);

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Diagnostic collection error:', error);
    return NextResponse.json(
      { error: 'Failed to collect diagnostic' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get('scanId');
  const action = searchParams.get('action');

  // If action is present, this is a beacon request - store the diagnostic
  if (scanId && action) {
    const diagnostic = {
      action,
      details: {},
      time: Date.now(),
      url: searchParams.get('url') || 'unknown',
    };
    TransactionCollector.addDiagnostic(scanId, diagnostic);
    console.log(`[Diagnostic Beacon] ${scanId}: ${action}`);

    // Return a 1x1 transparent GIF
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    return new NextResponse(gif, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store',
      },
    });
  }

  if (!scanId) {
    return NextResponse.json({ error: 'Missing scanId' }, { status: 400, headers: corsHeaders });
  }

  const diagnostics = TransactionCollector.getDiagnostics(scanId);
  return NextResponse.json({ diagnostics }, { headers: corsHeaders });
}
