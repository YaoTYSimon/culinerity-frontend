/** Pin the time zone for every test worker so daylight-saving cases are deterministic. */
export default function setup(): void {
  process.env.TZ = 'Australia/Melbourne';
}
