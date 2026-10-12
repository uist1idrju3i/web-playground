// Minimal W3C WebDriver client over fetch — covers exactly the subset
// servoshell implements: session lifecycle, navigate, title, sync
// execute script, screenshot, and timeouts. One session per servoshell
// process; execute/async is not supported by Servo.
export class WebDriver {
  constructor({ hostname = '127.0.0.1', port }) {
    this.base = `http://${hostname}:${port}`;
    this.sessionId = null;
  }

  async request(method, path, body) {
    const response = await fetch(`${this.base}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    const value = payload.value;
    if (!response.ok || (value && typeof value === 'object' && value.error)) {
      const detail = value && typeof value === 'object' ? value : {};
      throw new Error(
        `WebDriver ${method} ${path} failed (${response.status}): ${detail.error ?? 'unknown'} ${detail.message ?? ''}`.trim(),
      );
    }
    return value;
  }

  async waitForStatus(timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      try {
        const status = await this.request('GET', '/status');
        if (status && status.ready) return status;
      } catch {
        // servoshell is still starting.
      }
      if (Date.now() > deadline) throw new Error('servoshell WebDriver did not become ready');
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  async newSession() {
    const value = await this.request('POST', '/session', { capabilities: {} });
    this.sessionId = value.sessionId;
    return value;
  }

  sessionPath(suffix) {
    if (!this.sessionId) throw new Error('No active WebDriver session');
    return `/session/${this.sessionId}${suffix}`;
  }

  async setTimeouts(timeouts) {
    return this.request('POST', this.sessionPath('/timeouts'), timeouts);
  }

  async navigateTo(url) {
    return this.request('POST', this.sessionPath('/url'), { url });
  }

  async getTitle() {
    return this.request('GET', this.sessionPath('/title'));
  }

  async executeSync(script, args = []) {
    return this.request('POST', this.sessionPath('/execute/sync'), { script, args });
  }

  async screenshot() {
    const base64 = await this.request('GET', this.sessionPath('/screenshot'));
    return Buffer.from(base64, 'base64');
  }

  async deleteSession() {
    if (!this.sessionId) return;
    await this.request('DELETE', this.sessionPath(''));
    this.sessionId = null;
  }
}
