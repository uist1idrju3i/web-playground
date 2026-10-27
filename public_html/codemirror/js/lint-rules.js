function jsonDiagnostic(source) {
  try {
    JSON.parse(source);
    return [];
  } catch (error) {
    const position = Number(error.message.match(/position (\d+)/u)?.[1] ?? 0);
    return [
      {
        from: position,
        to: Math.min(source.length, position + 1),
        severity: 'error',
        message: error.message,
      },
    ];
  }
}

function javascriptDiagnostics(source) {
  return [...source.matchAll(/\bvar\b/gu)].map((match) => ({
    from: match.index,
    to: match.index + match[0].length,
    severity: 'warning',
    message: 'Prefer const or let over var.',
  }));
}

export function diagnosticsFor(language, source) {
  if (language === 'json') return jsonDiagnostic(source);
  if (language === 'javascript') return javascriptDiagnostics(source);
  return [];
}
