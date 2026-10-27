import assert from 'node:assert/strict';
import test from 'node:test';
import { runToolLoop } from '../../public_html/prompt-api/js/tool-loop.js';

class ToolSuccess {
  constructor(value) {
    Object.assign(this, value);
  }
}

class ToolError {
  constructor(value) {
    Object.assign(this, value);
  }
}

function toolCall(name, callId = name, argumentsValue = {}) {
  return { type: 'tool-call', value: { callId, name, arguments: argumentsValue } };
}

function fakeSession(responses) {
  const prompts = [];
  return {
    prompts,
    async prompt(value) {
      prompts.push(value);
      const response = responses.shift();
      return typeof response === 'function' ? response() : response;
    },
  };
}

const declaredTools = [{ name: 'calculate' }];

test('tool loop executes an approved call and returns the final text', async () => {
  const session = fakeSession([[toolCall('calculate', 'call-1', { expression: '2+2' })], '4']);
  const result = await runToolLoop({
    session,
    prompt: 'What is 2 + 2?',
    tools: declaredTools,
    approver: async () => true,
    ToolSuccess,
    ToolError,
    executeTool: async (_name, args) => args.expression,
  });

  assert.equal(result, '4');
  assert.equal(session.prompts.length, 2);
  const reply = session.prompts[1][0].content[0].value;
  assert.ok(reply instanceof ToolSuccess);
  assert.equal(reply.callId, 'call-1');
  assert.equal(reply.name, 'calculate');
  assert.deepEqual(reply.result, [{ type: 'object', value: '2+2' }]);
});

test('tool loop processes concurrent calls in one tool-response prompt', async () => {
  const session = fakeSession([
    [toolCall('calculate', 'a', { id: 'first' }), toolCall('calculate', 'b', { id: 'second' })],
    'done',
  ]);
  const executed = [];
  const result = await runToolLoop({
    session,
    prompt: 'Run both calculations.',
    tools: declaredTools,
    approver: async () => true,
    ToolSuccess,
    ToolError,
    executeTool: async (_name, args) => {
      executed.push(args.id);
      return args.id;
    },
  });

  assert.equal(result, 'done');
  assert.deepEqual(executed, ['first', 'second']);
  assert.equal(session.prompts[1][0].content.length, 2);
  assert.deepEqual(
    session.prompts[1][0].content.map(({ value }) => value.callId),
    ['a', 'b'],
  );
});

test('tool rejection sends a ToolError and does not execute the tool', async () => {
  const session = fakeSession([[toolCall('calculate', 'rejected')], 'The request was rejected.']);
  let executed = false;
  const result = await runToolLoop({
    session,
    prompt: 'Calculate.',
    tools: declaredTools,
    approver: async () => false,
    ToolSuccess,
    ToolError,
    executeTool: async () => {
      executed = true;
    },
  });

  const reply = session.prompts[1][0].content[0].value;
  assert.equal(result, 'The request was rejected.');
  assert.equal(executed, false);
  assert.ok(reply instanceof ToolError);
  assert.equal(reply.callId, 'rejected');
  assert.match(reply.errorMessage, /rejected/u);
});

test('tool loop stops at the iteration cap', async () => {
  const session = fakeSession([
    () => [toolCall('calculate')],
    () => [toolCall('calculate')],
    'never reached',
  ]);
  await assert.rejects(
    runToolLoop({
      session,
      prompt: 'Keep calculating.',
      tools: declaredTools,
      approver: async () => true,
      ToolSuccess,
      ToolError,
      iterationLimit: 2,
      executeTool: async () => 1,
    }),
    /stopped after 2 iterations/u,
  );
  assert.equal(session.prompts.length, 3);
});

test('tool loop returns immediately when the session response is text only', async () => {
  const session = fakeSession(['Already answered.']);
  const result = await runToolLoop({
    session,
    prompt: 'Say hello.',
    tools: declaredTools,
    approver: async () => true,
    ToolSuccess,
    ToolError,
    executeTool: async () => {
      throw new Error('No tool call expected.');
    },
  });

  assert.equal(result, 'Already answered.');
  assert.equal(session.prompts.length, 1);
});
