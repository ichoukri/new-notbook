/**
 * Map the provenance fields returned by the document API into one stable,
 * canonical-first list for the UI.
 *
 * Newer backends return ``source_relative_paths``. During a rolling upgrade,
 * older records or endpoints can still expose only ``source_relative_path``,
 * so the singular value remains a defensive fallback when the list has no
 * usable entries.
 */
export function mapSourceRelativePaths(
  sourceRelativePaths: unknown,
  sourceRelativePath?: unknown,
): string[] {
  const candidates = Array.isArray(sourceRelativePaths)
    ? sourceRelativePaths
    : [];
  const paths: string[] = [];
  const seen = new Set<string>();

  for (const value of candidates) {
    if (typeof value !== "string") continue;
    const path = value.trim();
    if (!path || seen.has(path)) continue;
    paths.push(path);
    seen.add(path);
  }

  if (paths.length > 0) return paths;
  if (typeof sourceRelativePath !== "string") return [];

  const fallback = sourceRelativePath.trim();
  return fallback ? [fallback] : [];
}
