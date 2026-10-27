export const ERROR_CASES = Object.freeze([
  {
    id: 'system-order',
    title: 'System message is not first',
    expected: 'TypeError',
    citation: 'Explainer · N-shot prompting, error cases',
  },
  {
    id: 'prefix-order',
    title: 'Prefix on a non-final message',
    expected: 'SyntaxError',
    citation: 'IDL · LanguageModelPromptOptions / message validation',
  },
  {
    id: 'omit-constraint',
    title: 'Omit constraint input without a constraint',
    expected: 'TypeError',
    citation: 'IDL · response constraint validation',
  },
  {
    id: 'destroyed-prompt',
    title: 'Prompt after destroy()',
    expected: 'AbortError',
    citation: 'README · Session destruction',
  },
  {
    id: 'invalid-content',
    title: 'Text value for image content',
    expected: 'TypeError',
    citation: 'IDL · LanguageModelMessageContent',
  },
  {
    id: 'abort-prompt',
    title: 'Abort an in-flight prompt',
    expected: 'AbortError',
    citation: 'README · Aborting a specific prompt',
  },
  {
    id: 'undeclared-image',
    title: 'Image in a session without image expectedInputs',
    expected: 'NotSupportedError',
    citation: 'README · Multimodal prompting / expected inputs',
  },
]);
