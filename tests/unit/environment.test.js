import test from 'node:test';
import assert from 'node:assert/strict';
import { inferBrowser, inferEngine } from '../../public_html/library/js/environment.js';

const CHROME_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const FIREFOX_UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0';
const SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15';
// Servo ships a Firefox/ token inside its user agent.
const SERVO_UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:153.0) Servo/0.7.0 Firefox/153.0';

test('inferBrowser detects the four engine families', () => {
  assert.equal(inferBrowser([], CHROME_UA), 'Chrome');
  assert.equal(inferBrowser([], FIREFOX_UA), 'Firefox');
  assert.equal(inferBrowser([], SAFARI_UA), 'Safari');
  assert.equal(inferBrowser([], SERVO_UA), 'Servo');
});

test('inferBrowser prefers userAgentData brands for Chromium derivatives', () => {
  const brands = [{ brand: 'Microsoft Edge', version: '131' }];
  assert.equal(inferBrowser(brands, FIREFOX_UA), 'Edge');
});

test('inferEngine maps each detected browser to its engine', () => {
  assert.equal(inferEngine('Chrome', false, CHROME_UA), 'Blink');
  assert.equal(inferEngine('Firefox', false, FIREFOX_UA), 'Gecko');
  assert.equal(inferEngine('Servo', false, SERVO_UA), 'Servo');
  assert.equal(inferEngine('Safari', true, SAFARI_UA), 'WebKit');
});
