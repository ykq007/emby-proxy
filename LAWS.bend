import Base
import ./src/ui/console/contrast.bend as C
import ./src/ui/console/theme.bend as T

# LAW: the dark theme declares color-scheme: dark and every pair in C.audit meets WCAG AA.
law dark_theme_meets_aa:
  {C.audit(T.dark()) == Nil{} : List<String>}

# LAW: the light theme declares color-scheme: light and every pair in C.audit meets WCAG AA.
law light_theme_meets_aa:
  {C.audit(T.light()) == Nil{} : List<String>}

# LAW: a dark theme that forgets color-scheme fails the audit on exactly that check.
law missing_scheme_is_caught:
  {C.audit(C.with_scheme(T.dark(), C.Unset{})) == ["color-scheme fits --bg"] : List<String>}
