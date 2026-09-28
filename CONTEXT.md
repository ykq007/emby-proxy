# Emby Proxy

An Emby proxy operations context for managing routed Emby nodes, monitoring health, and presenting operator-facing status through a web console, Telegram, and public share surfaces.

## Language

**Emby node**:
An upstream Emby server instance managed by the proxy and monitored for availability, latency, and media count signals.
_Avoid_: Server, backend

**Route alias**:
A short operator-defined route name that identifies how proxy traffic maps to an Emby node.
_Avoid_: Slug, path alias

**Request gate**:
A proxy policy decision that allows or blocks an incoming request before it is sent to an Emby node.
_Avoid_: Filter, guard

**Manual redirect domain allowlist**:
The set of domains that operators may use for manual redirect behavior.
_Avoid_: Redirect whitelist, domain list

**Node probe**:
A health check against an Emby node that records availability and latency for monitoring and alerting.
_Avoid_: Ping, health ping

**Status card**:
The per-node record of health, media count, and trend data served to the operator console (`cards[]` from `loadStatusData`).
_Avoid_: Status snapshot (retired tripartite shape), card model

**Media count**:
The count signal read from an Emby node and displayed in status surfaces. The nine count fields are owned by `src/emby/media-counts.js`.
_Avoid_: Library count, item count

**Share card**:
A public JSON or SVG representation of status data suitable for sharing outside the operator console.
_Avoid_: Status image, public card

**Cloudflare traffic**:
Route-level and aggregate traffic data queried from Cloudflare for bandwidth and operator statistics.
_Avoid_: CF stats, bandwidth stats

**Telegram notification**:
An operator-facing Telegram message for alerts, reminders, or daily statistics.
_Avoid_: Bot message, alert text

**Viewer**:
A person the proxy authenticates itself, who plays through an Emby node's upstream account while keeping their own watch state.
_Avoid_: User, member, account

**Upstream account**:
The Emby user on an Emby node that the proxy signs in as on behalf of viewers; one per Emby node, shared by all its viewers.
_Avoid_: Shared account, Emby user, backend account

**Viewer access**:
The set of Emby nodes a viewer may reach, granted per route alias.
_Avoid_: Permissions, ACL, subscription

**Watch state**:
One viewer's played mark, resume position and favorite for one item on one Emby node.
_Avoid_: Watch history, user data, progress
