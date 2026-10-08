// Derived numbers for the viewer matrix. viewers and nodes come from GET /api/viewers.

export function usedByNode(viewers) {
    const used = {};
    for (const v of viewers) for (const a of v.access) used[a.prefix] = (used[a.prefix] || 0) + a.quota;
    return used;
}

// Nodes with viewer login on, plus nodes turned off that still hold grants, so those grants stay visible.
export function matrixColumns(nodes, viewers) {
    const granted = new Set(viewers.flatMap(v => v.access.map(a => a.prefix)));
    return nodes.filter(n => n.viewers_enabled || granted.has(n.prefix));
}

// The most this grant may take: the node cap minus what the other grants hold. 0 means the node has no cap.
export const quotaRoom = (node, used, current = 0) =>
    node.max_concurrent ? node.max_concurrent - ((used[node.prefix] || 0) - current) : 0;

export const isFull = (node, used) => node.max_concurrent > 0 && (used[node.prefix] || 0) >= node.max_concurrent;
