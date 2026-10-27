export const SAVE_VERSION = 1;

export const LANGUAGES = Object.freeze({
  javascript: { label: 'JavaScript', mode: 'javascript' },
  html: { label: 'HTML', mode: 'html' },
  css: { label: 'CSS', mode: 'css' },
  json: { label: 'JSON', mode: 'json' },
  markdown: { label: 'Markdown', mode: 'markdown' },
  ruby: { label: 'Ruby', mode: 'ruby' },
  python: { label: 'Python', mode: 'python' },
});

export const DEFAULT_OPTIONS = Object.freeze({
  theme: 'chrome',
  keybinding: 'default',
  readOnly: false,
  wrap: false,
  tabSize: 2,
  fontSize: 15,
  showInvisibles: false,
  indentGuides: true,
  foldWidgets: true,
  autoComplete: true,
  closeBrackets: true,
  multipleCursors: true,
});

export const DEFAULT_DOCUMENTS = Object.freeze({
  javascript: `const workshop = {
  title: 'A small editor experiment',
  tags: ['browser', 'code', 'ideas'],
};

function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet(workshop.title));`,
  html: `<article class="field-notes">
  <h1>Field notes</h1>
  <p>Small experiments make good examples.</p>
  <button type="button">Add a note</button>
</article>`,
  css: `.field-notes {
  max-width: 34rem;
  margin: 2rem auto;
  padding: 1.5rem;
  border: 1px solid #b5c7d8;
  border-radius: 1rem;
}`,
  json: `{
  "title": "Editor sample",
  "saved": true,
  "items": ["cursor", "selection", "change"]
}`,
  markdown: `# Field notes

Write a short observation, then make one careful edit.

- Keep examples original
- Save the useful parts`,
  ruby: `class FieldNote
  attr_reader :title

  def initialize(title)
    @title = title
  end

  def summary
    "Note: #{@title}"
  end
end`,
  python: `from dataclasses import dataclass


@dataclass
class FieldNote:
    title: str

    def summary(self) -> str:
        return f"Note: {self.title}"


print(FieldNote("small experiments").summary())`,
});

export function createDefaultSave() {
  return {
    schemaVersion: SAVE_VERSION,
    activeLanguage: 'javascript',
    documents: { ...DEFAULT_DOCUMENTS },
    options: { ...DEFAULT_OPTIONS },
  };
}

export function migrateAceSave(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return createDefaultSave();

  let migrated = value;
  if (value.schemaVersion === 0) {
    migrated = {
      schemaVersion: SAVE_VERSION,
      activeLanguage: value.language,
      documents: value.docs,
      options: value.settings,
    };
  }
  if (migrated.schemaVersion !== SAVE_VERSION) return createDefaultSave();

  const defaults = createDefaultSave();
  const language = Object.hasOwn(LANGUAGES, migrated.activeLanguage)
    ? migrated.activeLanguage
    : defaults.activeLanguage;
  const documents = { ...defaults.documents };
  if (migrated.documents && typeof migrated.documents === 'object') {
    for (const key of Object.keys(LANGUAGES)) {
      if (typeof migrated.documents[key] === 'string') documents[key] = migrated.documents[key];
    }
  }
  const options = { ...defaults.options };
  if (migrated.options && typeof migrated.options === 'object') {
    for (const key of Object.keys(DEFAULT_OPTIONS)) {
      if (typeof migrated.options[key] === typeof options[key]) {
        options[key] = migrated.options[key];
      }
    }
    options.tabSize = Math.min(8, Math.max(1, Number(options.tabSize) || 2));
    options.fontSize = Math.min(28, Math.max(12, Number(options.fontSize) || 15));
    if (!['chrome', 'tomorrow_night'].includes(options.theme)) options.theme = 'chrome';
    if (!['default', 'vim', 'emacs', 'vscode', 'sublime'].includes(options.keybinding)) {
      options.keybinding = 'default';
    }
  }
  return { schemaVersion: SAVE_VERSION, activeLanguage: language, documents, options };
}

export function formatSaveStatus(status) {
  const messages = {
    empty: 'No saved editor state yet.',
    corrupt: 'The saved editor state could not be read. Start with a fresh workspace.',
    tampered: 'The saved editor state failed its integrity check. Start with a fresh workspace.',
    rollback: 'An older saved state was detected. Start with a fresh workspace.',
    'key-missing': 'The signing key is missing. Start with a fresh workspace.',
    'version-mismatch': 'This save uses another version. Start with a fresh workspace.',
    unavailable: 'Signed saves are unavailable here. Your edits stay in this tab.',
    ok: 'Signed workspace restored.',
  };
  return messages[status] ?? 'The saved editor state could not be restored.';
}
