# Widths in CSS px for the 观看账号 grid, so a proof can check it never scrolls sideways.
import Base
import ./contrast.bend as C

type Layout is Data:
  Layout{mobile_max: U32, side: U32, pad: U32, pad_m: U32, cell: U32}

def with_cell(l: Layout, cell: U32) -> Layout:
  match l:
    case Layout{mobile_max, side, pad, pad_m, _}:
      Layout{mobile_max, side, pad, pad_m, cell}

# Cells wrap, so the grid's widest need is one cell inside the section padding, whatever the
# node count. Room only grows with the viewport inside each breakpoint, so checking the
# narrowest phone (320, the WCAG reflow width) and the narrowest desktop covers every width.
def audit(l: Layout) -> List<String>:
  match l:
    case Layout{+mobile_max, +side, +pad, +pad_m, +cell}:
      C.failures([
        ("cell fits a 320px phone", ((cell + (2 * pad_m : U32) : U32) <= 320 : U32)),
        ("cell fits the narrowest desktop", ((side + ((cell + (2 * pad : U32) : U32)) : U32) <= (mobile_max + 1 : U32) : U32))
      ])
