import Base
import ./src/ui/console/contrast.bend as C
import ./src/ui/console/theme.bend as T
import ./src/ui/console/reflow.bend as R
import ./src/ui/console/layout.bend as L

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
