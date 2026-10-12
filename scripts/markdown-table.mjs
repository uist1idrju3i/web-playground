export function escapeMarkdownTableCell(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('|', '\\|');
}
