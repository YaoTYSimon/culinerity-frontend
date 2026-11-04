// The suppress list (Ruling D6): place ids a person reported as closed, moved or wrong, triaged by hand into scripts/suppress.json.
// Applied at regeneration. An id that is not in the data fails the build, so the list cannot go stale unnoticed.
// Exception: an id that de-duplication removed in this run only warns (the twin that stayed is the one to triage).

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

/** Pure: removes the listed places. Throws on a malformed list or an id that is in neither `places` nor `dedupedIds`. Returns { places, suppressed, warnings }. */
export function applySuppress(places, ids, dedupedIds = []) {
  const problems = validateSuppressList(ids);
  if (problems.length) throw new Error(`bad suppress list:\n${problems.join('\n')}`);
  const have = new Set(places.map((p) => p.id));
  const gone = new Set(dedupedIds);
  const absent = ids.filter((id) => !have.has(id));
  const warnings = absent.filter((id) => gone.has(id)).map((id) => `suppress list id ${id} was removed by de-duplication; check the twin that stayed, then drop it from the list`);
  const missing = absent.filter((id) => !gone.has(id));
  if (missing.length) throw new Error(`suppress list has ids not in the data: ${missing.join(', ')}`);
  const drop = new Set(ids);
  const kept = places.filter((p) => !drop.has(p.id));
  return { places: kept, suppressed: places.length - kept.length, warnings };
}
