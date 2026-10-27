(function installFakeLanguageModel() {
  const calls = {
    availability: [],
    create: [],
    progress: [],
    prompts: [],
  };
  globalThis.__fakeLanguageModelCalls = calls;

  function apiError(name, message) {
    return new DOMException(message, name);
  }

  function availabilityStatus(options) {
    switch (options?.samplingMode) {
      case 'most-predictable':
        return 'unavailable';
      case 'predictable':
        return 'downloadable';
      case 'creative':
        return 'downloading';
      case 'most-creative':
        return 'available';
      default:
        return options?.tools ? 'downloadable' : 'available';
    }
  }

  function monitorFor(options) {
    const listeners = new Map();
    const monitor = {
      addEventListener(type, listener) {
        const list = listeners.get(type) ?? [];
        list.push(listener);
        listeners.set(type, list);
      },
      dispatch(type, event) {
        for (const listener of listeners.get(type) ?? []) listener(event);
      },
    };
    options?.monitor?.(monitor);
    return monitor;
  }

  class FakeLanguageModelToolCall {
    constructor({ callId, name, arguments: input }) {
      this.callId = callId;
      this.name = name;
      this.arguments = input;
    }
  }

  class FakeLanguageModelToolSuccess {
    constructor(value) {
      this.kind = 'success';
      Object.assign(this, value);
    }
  }

  class FakeLanguageModelToolError {
    constructor(value) {
      this.kind = 'error';
      Object.assign(this, value);
    }
  }

  class FakeSession extends EventTarget {
    constructor(options) {
      super();
      this.options = options;
      this._destroyed = false;
      this._contextUsage = 12;
      this.contextWindow = 128;
      this.samplingMode = options.samplingMode ?? 'balanced';
    }

    get contextUsage() {
      return this._contextUsage;
    }

    async measureContextUsage() {
      return this._contextUsage + 8;
    }

    append() {
      this.ensureActive();
      this._contextUsage += 8;
    }

    async clone() {
      this.ensureActive();
      return new FakeSession({ ...this.options });
    }

    async destroy() {
      this._destroyed = true;
    }

    ensureActive() {
      if (this._destroyed) throw apiError('AbortError', 'The session has been destroyed.');
    }

    validateMessages(prompt) {
      if (!Array.isArray(prompt)) return;
      const systemIndex = prompt.findIndex((item) => item.role === 'system');
      if (systemIndex > 0) throw new TypeError('The system message must be first.');
      if (prompt.filter((item) => item.role === 'system').length > 1) {
        throw new TypeError('Only one system message is allowed.');
      }
      prompt.forEach((item, index) => {
        if (item.prefix && index !== prompt.length - 1) {
          throw new SyntaxError('An assistant prefix must be final.');
        }
        for (const content of Array.isArray(item.content) ? item.content : []) {
          if (content.type === 'image' && typeof content.value === 'string') {
            throw new TypeError('Image content must contain image data.');
          }
          if (
            content.type === 'image' &&
            !this.options.expectedInputs?.some((input) => input.type === 'image')
          ) {
            throw apiError('NotSupportedError', 'Image input was not declared.');
          }
        }
      });
    }

    responseFor(prompt) {
      if (this.options.tools && !Array.isArray(prompt)) {
        return [
          new FakeLanguageModelToolCall({
            callId: 'fake-call-1',
            name: 'calculator',
            arguments: { expression: '(18 + 6) / 3' },
          }),
        ];
      }
      if (
        Array.isArray(prompt) &&
        prompt.some(
          (item) =>
            Array.isArray(item.content) &&
            item.content.some((content) => content.type === 'tool-response'),
        )
      ) {
        const rejected = prompt.some(
          (item) =>
            Array.isArray(item.content) &&
            item.content.some((content) => content.value?.kind === 'error'),
        );
        return rejected
          ? 'The rejected tool call was reported.'
          : 'The approved tool result was received.';
      }
      if (this.options.responseConstraint instanceof RegExp) return '2026-01-23';
      if (this.options.responseConstraint) {
        return JSON.stringify({ sentiment: 'positive', hashtags: ['#clear'], rating: 4 });
      }
      if (
        Array.isArray(prompt) &&
        prompt.some(
          (item) =>
            Array.isArray(item.content) &&
            item.content.some((content) => ['image', 'audio'].includes(content.type)),
        )
      ) {
        return 'The multimodal input was received.';
      }
      return 'Fake model reply.';
    }

    async prompt(prompt) {
      this.ensureActive();
      this.validateMessages(prompt);
      calls.prompts.push({ method: 'prompt', prompt });
      this._contextUsage += 8;
      this.dispatchEvent(new Event('contextoverflow'));
      return this.responseFor(prompt);
    }

    async *promptStreaming(prompt, options = {}) {
      this.ensureActive();
      this.validateMessages(prompt);
      calls.prompts.push({ method: 'promptStreaming', prompt });
      const signal = options.signal;
      const throwIfAborted = () => {
        if (signal?.aborted) throw apiError('AbortError', 'The prompt was aborted.');
      };
      throwIfAborted();
      const response = String(this.responseFor(prompt));
      yield response.slice(0, Math.max(1, Math.floor(response.length / 2)));
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 1000);
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(apiError('AbortError', 'The prompt was aborted.'));
          },
          { once: true },
        );
      });
      throwIfAborted();
      yield response.slice(Math.max(1, Math.floor(response.length / 2)));
      this._contextUsage += 8;
      this.dispatchEvent(new Event('contextoverflow'));
    }
  }

  class FakeLanguageModel {
    static async availability(options = {}) {
      calls.availability.push(options);
      return availabilityStatus(options);
    }

    static async create(options = {}) {
      calls.create.push(options);
      if (options.omitResponseConstraintInput && !options.responseConstraint) {
        throw new TypeError('responseConstraint is required when input is omitted.');
      }
      const monitor = monitorFor(options);
      return new Promise((resolve) => {
        setTimeout(() => {
          calls.progress.push(0);
          monitor.dispatch('downloadprogress', { loaded: 0 });
          setTimeout(() => {
            calls.progress.push(1);
            monitor.dispatch('downloadprogress', { loaded: 1 });
            resolve(new FakeSession(options));
          }, 5);
        }, 0);
      });
    }
  }

  FakeLanguageModel.prototype.samplingMode = 'balanced';
  FakeLanguageModel.prototype.tools = [];
  FakeLanguageModel.prototype.thinkingEffort = 'medium';
  FakeLanguageModel.prototype.oncontextoverflow = null;
  FakeLanguageModel.prototype.inputUsage = 0;
  FakeLanguageModel.prototype.inputQuota = 0;
  FakeLanguageModel.prototype.measureInputUsage = () => 0;
  FakeLanguageModel.prototype.params = () => ({});
  FakeLanguageModel.prototype.prompt = () => {};
  FakeLanguageModel.prototype.promptStreaming = () => {};
  FakeLanguageModel.prototype.append = () => {};
  FakeLanguageModel.prototype.clone = () => {};
  FakeLanguageModel.prototype.destroy = () => {};
  FakeLanguageModel.prototype.measureContextUsage = () => {};
  FakeLanguageModel.prototype.contextUsage = 0;
  FakeLanguageModel.prototype.contextWindow = 128;

  globalThis.LanguageModel = FakeLanguageModel;
  globalThis.LanguageModelToolCall = FakeLanguageModelToolCall;
  globalThis.LanguageModelToolSuccess = FakeLanguageModelToolSuccess;
  globalThis.LanguageModelToolError = FakeLanguageModelToolError;
})();
