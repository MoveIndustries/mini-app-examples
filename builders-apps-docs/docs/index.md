# Movement Mini Apps

Build decentralized apps that run natively in Movement wallet. Ship fast, reach millions.

<div class="hero-badges">
  <span class="badge"><svg class="badge-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h7l-1 6 10-12h-7l1-6z"/></svg> Zero Install</span>
  <span class="badge"><svg class="badge-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="9" width="14" height="9" rx="2"/><path d="M7 9V6a3 3 0 0 1 6 0v3"/></svg> Built-in Wallet</span>
  <span class="badge"><svg class="badge-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="10" height="16" rx="2"/><line x1="10" y1="15" x2="10" y2="15.01" stroke-linecap="round"/></svg> Native APIs</span>
  <span class="badge"><svg class="badge-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2L4 8l6 6"/><path d="M10 2l6 6-6 6"/><line x1="10" y1="14" x2="10" y2="18"/></svg> Instant Deploy</span>
</div>

---

## What are Movement Mini Apps?

Lightweight web applications that run inside the Move Everything super app. Build with **HTML, CSS, and JavaScript**—deploy in seconds, reach users instantly.

**No app stores. No installation. No friction.**

### Why Build Mini Apps?

<div class="feature-grid">

<div class="feature-card">
  <div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
  <h3>Ship Fast</h3>
  <p>Build with web tech. Deploy instantly. No app store reviews, no waiting.</p>
</div>

<div class="feature-card">
  <div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M2 10h20"/><path d="M6 14h.01"/><path d="M10 14h4"/></svg></div>
  <h3>Built-in Wallet</h3>
  <p>Users are already connected. Accept payments and sign transactions seamlessly.</p>
</div>

<div class="feature-card">
  <div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg></div>
  <h3>Native Features</h3>
  <p>Access camera, biometrics, NFC, haptics, location, and more through simple APIs.</p>
</div>

<div class="feature-card">
  <div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
  <h3>Global Reach</h3>
  <p>Instant distribution to millions of Movement wallet users worldwide.</p>
</div>

</div>

---

## Mini app SDK

<div class="sdk-features">

**Blockchain**
Send transactions, sign messages, read balances, multi-agent signing

**Device Features**
Camera, biometrics, NFC, haptics, location, QR scanner

**Platform APIs**
Notifications, storage, share, clipboard, deep linking

**Security**
Rate limiting, transaction validation, replay protection, CSP

</div>

---

## Get Started

<div class="get-started-steps">

<div class="step">
  <div class="step-number">1</div>
  <div class="step-content">
    <h3>Create Your App</h3>
    <p>Use our starter template or build from scratch</p>
    <code>npx create-movement-app@latest my-app</code>
  </div>
</div>

<div class="step">
  <div class="step-number">2</div>
  <div class="step-content">
    <h3>Build Your UI</h3>
    <p>Use React, vanilla JS, or Unity WebGL</p>
    <code>npm run dev</code>
  </div>
</div>

<div class="step">
  <div class="step-number">3</div>
  <div class="step-content">
    <h3>Test & Deploy</h3>
    <p>Test in Movement wallet, then deploy instantly</p>
    <code>npm run build</code>
  </div>
</div>

</div>

::: code-group

```typescript [React]
import { useMovementSDK } from '@moveindustries/mini-app-sdk';

export default function App() {
  const { sdk } = useMovementSDK();

  async function sendTokens() {
    const result = await sdk.sendTransaction({
      function: '0x1::aptos_account::transfer',
      arguments: [recipient, amount]
    });
    console.log('Sent!', result.hash);
  }

  return (
    <button onClick={sendTokens}>
      Send MOVE
    </button>
  );
}
```

```javascript [Vanilla JS]
const sdk = window.movementSDK;

async function sendTokens() {
  const result = await sdk.sendTransaction({
    function: '0x1::aptos_account::transfer',
    arguments: [recipient, amount]
  });
  console.log('Sent!', result.hash);
}
```

:::

---

## Build with AI

Using **Cursor**, **Claude Code**, **GitHub Copilot**, or other AI coding assistants? Feed these docs directly to your AI for better mini app code generation:

<div class="ai-docs-grid">

<a href="/llms.txt" class="ai-doc-card">
  <div class="ai-doc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
  <div class="ai-doc-content">
    <h3>llms.txt</h3>
    <p>Quick context - documentation index with table of contents</p>
  </div>
</a>

<a href="/llms-full.txt" class="ai-doc-card">
  <div class="ai-doc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/></svg></div>
  <div class="ai-doc-content">
    <h3>llms-full.txt</h3>
    <p>Complete docs - all pages concatenated in one file</p>
  </div>
</a>

</div>

```bash
# Example: Add to Cursor rules or Claude Code context
curl -o llms-full.txt https://mini-app-docs.vercel.app/llms-full.txt
```

---

## Resources

<div class="resource-grid">

<a href="/quick-start/" class="resource-card">
  <div class="resource-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
  <h3>Documentation</h3>
  <p>Complete guides and API reference</p>
</a>

<a href="/commands/" class="resource-card">
  <div class="resource-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg></div>
  <h3>Commands</h3>
  <p>All available SDK methods</p>
</a>

<a href="/guidelines/design" class="resource-card">
  <div class="resource-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg></div>
  <h3>Design Guidelines</h3>
  <p>Build beautiful, native-feeling UIs</p>
</a>

</div>

---

## Community

<div class="community-links">

**[Discord](https://discord.gg/moveindustries)** · Get help and share ideas

**[GitHub](https://github.com/moveindustries)** · Explore examples and contribute

**[Twitter](https://twitter.com/moveindustries)** · Stay updated on new features

</div>

<style>
/* Hero Badges */
.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1.5rem 0 2rem;
}

.hero-badges .badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: var(--vp-c-brand-soft);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--vp-c-brand-1);
}

/* Feature Grid */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.feature-card {
  padding: 1.5rem;
  background: var(--color-neutrals-white-alpha-50, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--color-neutrals-white-alpha-100, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  transition: all 0.2s;
}

.feature-card:hover {
  background: var(--color-neutrals-white-alpha-100, rgba(255, 255, 255, 0.05));
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.badge-icon {
  width: 16px;
  height: 16px;
  vertical-align: -2px;
  display: inline-block;
}

.feature-icon {
  margin-bottom: 0.75rem;
}

.feature-icon svg {
  width: 32px;
  height: 32px;
  color: var(--vp-c-brand-1);
}

.feature-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  color: var(--vp-c-text-1);
}

.feature-card p {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

/* SDK Features */
.sdk-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.sdk-features > p {
  margin: 0;
  padding: 1.25rem;
  background: var(--color-neutrals-white-alpha-50, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--color-neutrals-white-alpha-100, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  font-size: 0.9375rem;
  line-height: 1.6;
}

.sdk-features strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  color: var(--vp-c-brand-1);
}

/* Get Started Steps */
.get-started-steps {
  display: grid;
  gap: 1.5rem;
  margin: 2rem 0;
}

.step {
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem;
  background: var(--color-neutrals-white-alpha-50, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--color-neutrals-white-alpha-100, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  align-items: start;
}

.step-number {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-brand-1);
  color: #000;
  border-radius: 50%;
  font-weight: 700;
  font-size: 1.125rem;
}

.step-content {
  flex: 1;
}

.step-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
}

.step-content p {
  margin: 0 0 0.75rem 0;
  color: var(--vp-c-text-2);
  font-size: 0.9375rem;
}

.step-content code {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: var(--color-neutrals-black-alpha-300, rgba(0, 0, 0, 0.3));
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--vp-c-brand-1);
}

/* Resource Grid */
.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  margin: 2rem 0;
}

.resource-card {
  display: block;
  padding: 1.5rem;
  background: var(--color-neutrals-white-alpha-50, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--color-neutrals-white-alpha-100, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s;
}

.resource-card:hover {
  background: var(--color-neutrals-white-alpha-100, rgba(255, 255, 255, 0.05));
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.resource-icon {
  margin-bottom: 0.75rem;
}

.resource-icon svg {
  width: 28px;
  height: 28px;
  color: var(--vp-c-brand-1);
}

.resource-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  color: var(--vp-c-text-1);
}

.resource-card p {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--vp-c-text-2);
}

/* Community Links */
.community-links {
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--color-neutrals-white-alpha-50, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--color-neutrals-white-alpha-100, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  font-size: 1rem;
  line-height: 2;
}

.community-links strong a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 600;
}

.community-links strong a:hover {
  text-decoration: underline;
}

/* AI Docs Grid */
.ai-docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}

.ai-doc-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, var(--vp-c-brand-soft), transparent);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s;
}

.ai-doc-card:hover {
  background: linear-gradient(135deg, var(--vp-c-brand-soft), transparent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--vp-c-brand-soft);
}

.ai-doc-icon {
  flex-shrink: 0;
}

.ai-doc-icon svg {
  width: 32px;
  height: 32px;
  color: var(--vp-c-brand-1);
}

.ai-doc-content h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-family: monospace;
  color: var(--vp-c-brand-1);
}

.ai-doc-content p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

@media (max-width: 640px) {
  .hero-badges {
    justify-content: center;
  }

  .feature-grid,
  .sdk-features,
  .resource-grid {
    grid-template-columns: 1fr;
  }
}
</style>
