export const TOOL_ITERATION_LIMIT = 6;

function isToolCall(item, ToolCall) {
  if (ToolCall && item instanceof ToolCall) return true;
  return item?.type === 'tool-call';
}

export async function runToolLoop({
  session,
  prompt,
  tools,
  approver,
  ToolCall,
  ToolSuccess,
  ToolError,
  iterationLimit = TOOL_ITERATION_LIMIT,
  executeTool,
}) {
  const declaredTools = new Set((tools ?? []).map((tool) => tool.name));
  let response = await session.prompt(prompt);
  for (let iteration = 0; iteration < iterationLimit; iteration += 1) {
    const items = Array.isArray(response) ? response : [{ type: 'text', value: String(response) }];
    const calls = items
      .filter((item) => isToolCall(item, ToolCall))
      .map((item) => (item?.type === 'tool-call' ? item.value : item));
    if (!calls.length)
      return items
        .filter((item) => item?.type === 'text')
        .map((item) => item.value ?? '')
        .join('');
    const replies = await Promise.all(
      calls.map(async (call) => {
        const approved = await approver(call);
        if (!approved)
          return new ToolError({
            callId: call.callId,
            name: call.name,
            errorMessage: 'The user rejected this tool call.',
          });
        try {
          if (!declaredTools.has(call.name)) throw new TypeError(`Undeclared tool: ${call.name}`);
          const result = await executeTool(call.name, call.arguments ?? call.input ?? {});
          return new ToolSuccess({
            callId: call.callId,
            name: call.name,
            result: [{ type: 'object', value: result }],
          });
        } catch (error) {
          return new ToolError({
            callId: call.callId,
            name: call.name,
            errorMessage: error.message,
          });
        }
      }),
    );
    response = await session.prompt([
      { role: 'user', content: replies.map((reply) => ({ type: 'tool-response', value: reply })) },
    ]);
  }
  throw new Error(`Tool loop stopped after ${iterationLimit} iterations.`);
}
