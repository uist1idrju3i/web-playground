export const languages = [
  { id: 'javascript', label: 'JavaScript', mode: 'language' },
  { id: 'html', label: 'HTML', mode: 'language' },
  { id: 'css', label: 'CSS', mode: 'language' },
  { id: 'json', label: 'JSON', mode: 'language' },
  { id: 'markdown', label: 'Markdown', mode: 'language' },
  { id: 'ruby', label: 'Ruby', mode: 'legacy' },
];

export const samples = {
  javascript: `const palette = ['coral', 'indigo', 'mint'];\n\nexport function chooseColor(index = 0) {\n  return palette[index % palette.length];\n}\n`,
  html: `<article class="note">\n  <h1>Small observations</h1>\n  <p>Markup can be a calm place to start.</p>\n</article>\n`,
  css: `.note {\n  color: #18324a;\n  display: grid;\n  gap: 0.75rem;\n}\n`,
  json: `{\n  "title": "A small collection",\n  "items": ["tea", "paper", "light"],\n  "published": true\n}\n`,
  markdown: `# Field notes\n\nA short list of things worth noticing:\n\n- edges catch the light\n- words need room\n`,
  ruby: `def greeting(name)\n  "Hello, #{name}."\nend\n\nputs greeting("editor")\n`,
};
