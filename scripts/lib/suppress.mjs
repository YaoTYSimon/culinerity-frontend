// The suppress list (Ruling D6): place ids a person reported as closed, moved or wrong, triaged by hand into scripts/suppress.json.
// Applied at regeneration. An id that is not in the data fails the build, so the list cannot go stale unnoticed.

/** Checks the shape of the list: an array of unique "ovt-..." id strings. Returns problems (empty when fine). */
export function validateSuppressList(ids) {
  if (!Array.isArray(ids)) return ['suppress list must be an array of place ids'];
  const problems = [];
  const seen = new Set();
  for (const id of ids) {
    if (typeof id !== 'string' || !/^ovt-[0-9a-f-]+$/i.test(id)) problems.push(`not a place id: ${JSON.stringify(id)}`);
    else if (seen.has(id)) problems.push(`duplicate id: ${id}`);
    else seen.add(id);
  }
  return problems;
}

/** Pure: removes the listed places. Throws on a malformed list or an id that is not in `places`. Returns { places, suppressed }. */
export function applySuppress(places, ids) {
  const problems = validateSuppressList(ids);
  if (problems.length) throw new Error(`bad suppress list:\n${problems.join('\n')}`);
  const have = new Set(places.map((p) => p.id));
  const missing = ids.filter((id) => !have.has(id));
  if (missing.length) throw new Error(`suppress list has ids not in the data: ${missing.join(', ')}`);
  const drop = new Set(ids);
  return { places: places.filter((p) => !drop.has(p.id)), suppressed: ids.length };
}
