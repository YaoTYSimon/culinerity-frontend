// Deterministic JSON: object keys sorted at every depth, trailing newline.
const sortKeys = (v) => {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  return v;
};
export function stableJson(value, indent) {
  return JSON.stringify(sortKeys(value), null, indent) + '\n';
}
