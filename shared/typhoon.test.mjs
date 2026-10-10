import test from 'node:test';
import assert from 'node:assert/strict';
import { TyphoonClient } from './typhoon.mjs';

test('TyphoonClient - Mock fallback mode when no key', async () => {
  const client = new TyphoonClient({ apiKey: '' });
  const result = await client.generateSpecification({
    projectName: 'Test Tower',
    elementType: 'mat_foundation',
    fcMpa: 35.0
  });

  assert.ok(result.thPart.includes('03 30 00'));
  assert.ok(result.enPart.includes('PART 1 - GENERAL'));
});

test('TyphoonClient - Streaming mock iterator', async () => {
  const client = new TyphoonClient({ apiKey: '' });
  let streamed = '';
  for await (const chunk of client.chatStream({ messages: [{ role: 'user', content: 'hello' }] })) {
    streamed += chunk;
  }
  assert.ok(streamed.length > 50);
});
