/**
 * Fuzzy node matching for /node command.
 * Priority order (highest first):
 *   1. exact prefix match (case-insensitive)
 *   2. prefix startsWith query
 *   3. public_alias or remark startsWith query
 *   4. prefix includes query
 *   5. public_alias or remark includes query
 *
 * Returns at most 8 candidates from the original routes array.
 * Returns [] when query is empty.
 */

/**
 * @param {string} query
 * @param {Array<{prefix: string, remark?: string, public_alias?: string}>} routes
 * @returns {Array}
 */
export function fuzzyMatchNodes(query, routes) {
    if (!query || query.trim() === '') {
        return [];
    }

    const q = query.toLowerCase().trim();

    // Buckets indexed by priority (0=highest)
    const buckets = [[], [], [], [], []];

    for (const route of routes) {
        const prefix = (route.prefix || '').toLowerCase();
        const alias = (route.public_alias || '').toLowerCase();
        const remark = (route.remark || '').toLowerCase();

        if (prefix === q) {
            buckets[0].push(route);
        } else if (prefix.startsWith(q)) {
            buckets[1].push(route);
        } else if ((alias && alias.startsWith(q)) || (remark && remark.startsWith(q))) {
            buckets[2].push(route);
        } else if (prefix.includes(q)) {
            buckets[3].push(route);
        } else if ((alias && alias.includes(q)) || (remark && remark.includes(q))) {
            buckets[4].push(route);
        }
    }

    const results = [];
    for (const bucket of buckets) {
        for (const route of bucket) {
            if (results.length >= 8) break;
            results.push(route);
        }
        if (results.length >= 8) break;
    }

    return results;
}
