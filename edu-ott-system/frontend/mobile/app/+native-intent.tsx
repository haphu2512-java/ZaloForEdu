/**
 * Rewrite legacy/unstructured deep links into Expo Router paths.
 * Supports:
 * - zaloedu://join/<code>
 * - mobileapp://join/<code>
 * - /join/<code>
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (!path) return '/(tabs)';

    const normalized = String(path).trim();
    const joinMatch = normalized.match(/(?:^|:\/\/|\/)join\/([^/?#]+)/i);
    if (joinMatch?.[1]) {
      return `/join-group?code=${encodeURIComponent(joinMatch[1])}`;
    }

    return normalized;
  } catch {
    return '/(tabs)';
  }
}

