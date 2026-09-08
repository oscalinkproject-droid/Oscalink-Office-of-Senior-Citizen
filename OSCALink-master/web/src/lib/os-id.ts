// Fail-safe display helper: an ACTIVE senior must never render the pending
// "#REF-" / "REF-" reference prefix. If the database row has not been migrated
// yet, the ID is normalized to "OSC-" on the fly.
export function normalizeOscaId(status?: string | null, id?: string | null): string {
  if (!id) return id ?? '';
  if (status === 'Active' && (id.startsWith('#REF-') || id.startsWith('REF-'))) {
    return id.replace(/^#?REF-/, 'OSC-');
  }
  return id;
}