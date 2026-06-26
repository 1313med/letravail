/**
 * Discover Workday site name by probing common CXS endpoints.
 */
export async function discoverWorkdaySite(
  host: string,
  tenant: string,
): Promise<string | null> {
  const candidates = [
    'External', 'Careers', 'FR', 'fr-FR', 'Morocco', 'MAR', 'Global',
    tenant, tenant.replace(/-/g, '_'), tenant.replace(/-/g, ''),
  ];

  for (const site of [...new Set(candidates)]) {
    try {
      const res = await fetch(`https://${host}/wday/cxs/${tenant}/${site}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: '' }),
      });
      if (res.ok) {
        const data = (await res.json()) as { total?: number };
        if ((data.total ?? 0) >= 0) return site;
      }
    } catch {
      continue;
    }
  }
  return null;
}
