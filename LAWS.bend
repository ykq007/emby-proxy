import Base
import ./src/ui/console/contrast.bend as C
import ./src/ui/console/theme.bend as T
import ./src/ui/console/reflow.bend as R
import ./src/ui/console/layout.bend as L
import ./src/ui/console/cfip.bend as F
import ./src/viewers/sync.bend as W

# LAW: the dark theme declares color-scheme: dark and every pair in C.audit meets WCAG AA.
law dark_theme_meets_aa:
  {C.audit(T.dark()) == Nil{} : List<String>}

# LAW: the light theme declares color-scheme: light and every pair in C.audit meets WCAG AA.
law light_theme_meets_aa:
  {C.audit(T.light()) == Nil{} : List<String>}

# LAW: a dark theme that forgets color-scheme fails the audit on exactly that check.
law missing_scheme_is_caught:
  {C.audit(C.with_scheme(T.dark(), C.Unset{})) == ["color-scheme fits --bg"] : List<String>}

# LAW: one 观看账号 node cell plus the section padding fits a 320px phone and the narrowest
# desktop, and the cells wrap, so the page never scrolls sideways at any node count.
law viewer_grid_reflows:
  {R.audit(L.viewers()) == Nil{} : List<String>}

# LAW: a cell too wide for a 320px phone fails the audit on exactly that check.
law wide_cell_is_caught:
  {R.audit(R.with_cell(L.viewers(), 300)) == ["cell fits a 320px phone"] : List<String>}

# LAW: the IPs that served our hostname from KUL on 2026-10-10 are all Cloudflare's:
# 172.64.154.211, 162.159.6.209, 2a06:98c1:3102::ac40:98f1 and 2606:4700:4406::ac40:9047.
law served_ips_are_cloudflare:
  {F.verdict([F.V4{172, 64, 154, 211}, F.V4{162, 159, 6, 209}, F.V6{10758, 39105, 12546, 0, 0, 0, 44096, 39153}, F.V6{9734, 18176, 17414, 0, 0, 0, 44096, 36935}]) == F.OnCloudflare{} : F.Verdict}

# LAW: 2a14:67c1:b589::1, the IP that failed to serve our hostname, is not Cloudflare's.
law failed_ip_is_not_cloudflare:
  {F.verdict([F.V6{10772, 26561, 46473, 0, 0, 0, 0, 1}]) == F.OffCloudflare{} : F.Verdict}

# LAW: one foreign IP among Cloudflare ones fails the whole domain.
law one_foreign_ip_fails_the_domain:
  {F.verdict([F.V4{172, 64, 154, 211}, F.V4{8, 8, 8, 8}]) == F.OffCloudflare{} : F.Verdict}

# LAW: a domain with no A or AAAA answer is unresolved, not Cloudflare.
law no_answer_is_unresolved:
  {F.verdict(Nil{}) == F.Unresolved{} : F.Verdict}

# LAW: 172.64.0.0/13 ends at 172.71.255.255; the next address is outside.
law range_edges_hold:
  {(F.is_cf(F.V4{172, 71, 255, 255}), F.is_cf(F.V4{172, 72, 0, 0})) == (True{}, False{}) : Bool & Bool}

# LAW: an IPv6 address that starts with the bits of 172.64.0.0 (ac40::1) is not matched by the IPv4 range.
law v4_range_skips_v6:
  {F.is_cf(F.V6{44096, 0, 0, 0, 0, 0, 0, 1}) == False{} : Bool}

# LAW: whatever the upstream answers, a viewer's watch state holds a write exactly when the upstream
# account does. Local watch state is never ahead of or behind the account a main-account client uses.
law viewer_agrees_with_upstream:
  for +answers: List<&2, W.Answer>
  for relogged: Bool
  {W.agree(W.sync(answers, relogged)) == True{} : Bool}

# LAW: a write that meets an expired upstream token reaches the upstream and the viewer after re-login.
law expired_token_write_lands:
  {W.sync([W.Expired{}, W.Ok{}], True{}) == W.Outcome{True{}, True{}} : W.Outcome}

# LAW: the proxy sends a write at most twice; a second 401 drops it on both sides.
law write_is_resent_once:
  {W.sync([W.Expired{}, W.Expired{}, W.Ok{}], True{}) == W.Outcome{False{}, False{}} : W.Outcome}

# LAW: a write the upstream refused for another reason is not resent and is not stored.
law failed_write_is_not_resent:
  {W.sync([W.Failed{}, W.Ok{}], True{}) == W.Outcome{False{}, False{}} : W.Outcome}
