# WCAG 2 contrast for the console theme, in U32 integers so a proof can compute it.
import Base

type Scheme is Data:
  Dark{}
  Light{}
  Unset{}

type Theme is Data:
  Theme{scheme: Scheme, bg: U32, panel: U32, raise: U32, tx: U32, tx2: U32, tx3: U32, ok: U32, warn: U32, err: U32, acc: U32, on_acc: U32, data: U32}

# sRGB channel value to linear light, times 100000. Regenerate with:
# node -e 'for(let i=0;i<256;i++){const v=i/255;console.log(Math.round(1e5*(v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4)))}'
def lin_table() -> +List<U32>:
  [
    0, 30, 61, 91, 121, 152, 182, 212, 243, 273, 304, 335, 368, 402, 439, 478,
    518, 561, 605, 651, 700, 750, 802, 857, 913, 972, 1033, 1096, 1161, 1229, 1298, 1370,
    1444, 1521, 1600, 1681, 1764, 1850, 1938, 2029, 2122, 2217, 2315, 2416, 2519, 2624, 2732, 2843,
    2956, 3071, 3190, 3310, 3434, 3560, 3689, 3820, 3955, 4092, 4231, 4374, 4519, 4667, 4817, 4971,
    5127, 5286, 5448, 5613, 5781, 5951, 6125, 6301, 6480, 6663, 6848, 7036, 7227, 7421, 7619, 7819,
    8022, 8228, 8438, 8650, 8866, 9084, 9306, 9531, 9759, 9990, 10224, 10462, 10702, 10946, 11193, 11444,
    11697, 11954, 12214, 12477, 12744, 13014, 13287, 13563, 13843, 14126, 14413, 14703, 14996, 15293, 15593, 15896,
    16203, 16513, 16827, 17144, 17465, 17789, 18116, 18447, 18782, 19120, 19462, 19807, 20156, 20508, 20864, 21223,
    21586, 21953, 22323, 22697, 23074, 23455, 23840, 24228, 24620, 25016, 25415, 25818, 26225, 26636, 27050, 27468,
    27889, 28315, 28744, 29177, 29614, 30054, 30499, 30947, 31399, 31855, 32314, 32778, 33245, 33716, 34191, 34670,
    35153, 35640, 36131, 36625, 37124, 37626, 38133, 38643, 39157, 39676, 40198, 40724, 41254, 41789, 42327, 42869,
    43415, 43966, 44520, 45079, 45641, 46208, 46778, 47353, 47932, 48515, 49102, 49693, 50289, 50888, 51492, 52100,
    52712, 53328, 53948, 54572, 55201, 55834, 56471, 57112, 57758, 58408, 59062, 59720, 60383, 61050, 61721, 62396,
    63076, 63760, 64448, 65141, 65837, 66539, 67244, 67954, 68669, 69387, 70110, 70838, 71569, 72306, 73046, 73791,
    74540, 75294, 76052, 76815, 77582, 78354, 79130, 79910, 80695, 81485, 82279, 83077, 83880, 84687, 85499, 86316,
    87137, 87962, 88792, 89627, 90466, 91310, 92158, 93011, 93869, 94731, 95597, 96469, 97345, 98225, 99110, 100000
  ]

def lin.or_zero(m: Maybe<&2, U32>) -> U32:
  match m:
    case Some{v}:
      v
    case None{}:
      0

def lin(+c: U32, s: Nat) -> U32:
  lin.or_zero(List.get(&2, U32, lin_table(), U32.to_nat(((c >> s : U32) .&. 255 : U32))))

# Relative luminance of 0xRRGGBB, times 10^7.
def lum(+c: U32) -> U32:
  r g b = lin(c, 16n) lin(c, 8n) lin(c, 0n)
  ((((2126 * r : U32) + (7152 * g : U32) : U32) + (722 * b : U32) : U32) / 100 : U32)

# True when the contrast ratio of a and b, (L1 + 0.05) / (L2 + 0.05), is at least k10 / 10.
def meets(+a: U32, +b: U32, +k10: U32) -> Bool:
  +x = (lum(a) + 500000 : U32)
  +y = (lum(b) + 500000 : U32)
  ((10 * x : U32) >= (k10 * y : U32) : U32) || ((10 * y : U32) >= (k10 * x : U32) : U32)

# A dark surface (luminance under 0.179, where black and white text contrast equally) needs color-scheme: dark.
def scheme_fits(s: Scheme, +bg: U32) -> Bool:
  match s:
    case Dark{}:
      (lum(bg) < 1790000 : U32)
    case Light{}:
      (lum(bg) >= 1790000 : U32)
    case Unset{}:
      False{}

def failures.keep(ok: Bool, name: String, rest: List<String>) -> List<String>:
  match ok:
    case True{}:
      rest
    case False{}:
      name <> rest

def failures(xs: List<(String & Bool)>) -> List<String>:
  match xs:
    case Nil{}:
      Nil{}
    case Con{(name, ok), t}:
      failures.keep(ok, name, failures(t))

def with_scheme(t: Theme, s: Scheme) -> Theme:
  match t:
    case Theme{_, bg, panel, raise, tx, tx2, tx3, ok, warn, err, acc, on_acc, data}:
      Theme{s, bg, panel, raise, tx, tx2, tx3, ok, warn, err, acc, on_acc, data}

# The pairs DESIGN.md promises: text 4.5:1 on every surface, status text 4.5:1 on rows,
# toast status borders and chart marks 3:1, and color-scheme matching the page.
def audit(t: Theme) -> List<String>:
  match t:
    case Theme{scheme, +bg, +panel, +raise, +tx, +tx2, +tx3, +ok, +warn, +err, acc, on_acc, +data}:
      failures([
        ("color-scheme fits --bg", scheme_fits(scheme, bg)),
        ("--tx on --bg", meets(tx, bg, 45)),
        ("--tx on --panel", meets(tx, panel, 45)),
        ("--tx on --raise", meets(tx, raise, 45)),
        ("--tx2 on --bg", meets(tx2, bg, 45)),
        ("--tx2 on --panel", meets(tx2, panel, 45)),
        ("--tx2 on --raise", meets(tx2, raise, 45)),
        ("--tx3 on --bg", meets(tx3, bg, 45)),
        ("--tx3 on --panel", meets(tx3, panel, 45)),
        ("--tx3 on --raise", meets(tx3, raise, 45)),
        ("--ok on --bg", meets(ok, bg, 45)),
        ("--ok on --panel", meets(ok, panel, 45)),
        ("--warn on --bg", meets(warn, bg, 45)),
        ("--warn on --panel", meets(warn, panel, 45)),
        ("--err on --bg", meets(err, bg, 45)),
        ("--err on --panel", meets(err, panel, 45)),
        ("--ok border on --raise", meets(ok, raise, 30)),
        ("--err border on --raise", meets(err, raise, 30)),
        ("--on-acc on --acc", meets(on_acc, acc, 45)),
        ("--data on --bg", meets(data, bg, 30)),
        ("--data on --panel", meets(data, panel, 30))
      ])
