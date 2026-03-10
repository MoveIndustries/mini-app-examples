/**
 * Debug endpoint to check ZAP injection status
 */

import { NextResponse } from 'next/server';

const ZAP_BASE_URL = process.env.ZAP_BASE_URL || 'http://localhost:8080';

export async function GET() {
  try {
    // Enable CSP removal rule
    await fetch(`${ZAP_BASE_URL}/JSON/replacer/action/setEnabled/?description=Remove%20CSP&bool=true`);

    // Add ngrok bypass header rule
    await fetch(
      `${ZAP_BASE_URL}/JSON/replacer/action/addRule/?description=ngrok-bypass-header&enabled=true&matchType=REQ_HEADER&matchRegex=false&matchString=ngrok-skip-browser-warning&replacement=1`
    );

    // Test if ZAP can access ngrok
    const collectorUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const testUrl = `${collectorUrl}/api/security/collect-diagnostic?scanId=test&action=zap_connectivity_test`;

    let zapConnectivityTest = null;
    try {
      const accessRes = await fetch(
        `${ZAP_BASE_URL}/JSON/core/action/accessUrl/?url=${encodeURIComponent(testUrl)}&followRedirects=true`
      );
      zapConnectivityTest = await accessRes.json();
    } catch (e) {
      zapConnectivityTest = { error: String(e) };
    }

    // Get replacer rules
    const rulesRes = await fetch(`${ZAP_BASE_URL}/JSON/replacer/view/rules/`);
    const rulesData = await rulesRes.json();

    // Get recent messages from ZAP
    const messagesRes = await fetch(
      `${ZAP_BASE_URL}/JSON/core/view/messages/?baseurl=&start=0&count=10`
    );
    const messagesData = await messagesRes.json();
    const messages = messagesData.messages || [];

    // Check for our test injection and SDK
    const testInjectionFound = messages.some(
      (m: { responseBody?: string }) => m.responseBody?.includes('ZAP TEST')
    );
    const sdkFound = messages.some(
      (m: { responseBody?: string }) => m.responseBody?.includes('movementSDK')
    );

    // Check for HTML responses that should have been modified
    const htmlResponses = messages.filter(
      (m: { responseBody?: string }) => m.responseBody?.includes('</head>')
    );

    // Find the injected script section
    const sdkResponse = messages.find(
      (m: { responseBody?: string }) => m.responseBody?.includes('movementSDK')
    );

    let injectedScriptPreview = null;
    if (sdkResponse?.responseBody) {
      // Find the script tag containing movementSDK
      const match = sdkResponse.responseBody.match(/<script>[^<]*movementSDK[^<]*<\/script>/);
      if (match) {
        injectedScriptPreview = match[0].substring(0, 2000);
      } else {
        // Try to find movementSDK with surrounding context
        const idx = sdkResponse.responseBody.indexOf('movementSDK');
        if (idx !== -1) {
          injectedScriptPreview = sdkResponse.responseBody.substring(Math.max(0, idx - 200), idx + 500);
        }
      }
    }

    // Look for SDK diagnostics in ZAP message history (requests to /___zap_diag___/...)
    const diagPattern = /\/___zap_diag___\/([^/]+)\/([^?]+)/;
    const zapDiagnostics = messages
      .filter((m: { requestHeader?: string }) => diagPattern.test(m.requestHeader || ''))
      .map((m: { requestHeader?: string; timestamp?: string }) => {
        const match = (m.requestHeader || '').match(diagPattern);
        return {
          scanId: match?.[1],
          action: match?.[2],
          timestamp: m.timestamp,
        };
      });

    return NextResponse.json({
      collectorUrl,
      zapConnectivityTest,
      replacerRules: rulesData.rules || [],
      testRuleExists: (rulesData.rules || []).some(
        (r: { description?: string }) => r.description === 'test-sdk-injection'
      ),
      recentMessagesCount: messages.length,
      htmlResponsesWithHead: htmlResponses.length,
      testInjectionFound,
      sdkFound,
      injectedScriptPreview,
      zapDiagnostics,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
