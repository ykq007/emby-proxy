# Does a 优选 domain resolve only to Cloudflare IPs? `npm run bend:mjs` compiles this to cfip.mjs
# for the 优选 CDN page.
import Base

# IPv4 as four octets, IPv6 as eight 16-bit groups.
type Addr is Data:
  V4{a: U32, b: U32, c: U32, d: U32}
  V6{a: U32, b: U32, c: U32, d: U32, e: U32, f: U32, g: U32, h: U32}

type Range is Data:
  Range{base: Addr, len: Nat}

type Verdict is Data:
  Unresolved{}
  OffCloudflare{}
  OnCloudflare{}

# The low w bits of x, most significant first.
def bits(+w: Nat, +x: U32) -> List<&2, Bool>:
  match w:
    case 0n:
      Nil{}
    case 1n+p:
      U32.is_eq(((x >> p : U32) .&. 1 : U32), 1) <> bits(p, x)

# A family bit (False for IPv4) and then the address bits, so no IPv4 range matches an IPv6 address.
def addr_bits(ip: Addr) -> List<&2, Bool>:
  match ip:
    case V4{a, b, c, d}:
      List.concat(&2, Bool, [[False{}], bits(8n, a), bits(8n, b), bits(8n, c), bits(8n, d)])
    case V6{a, b, c, d, e, f, g, h}:
      List.concat(&2, Bool, [[True{}], bits(16n, a), bits(16n, b), bits(16n, c), bits(16n, d), bits(16n, e), bits(16n, f), bits(16n, g), bits(16n, h)])

def same(a: Bool, b: Bool) -> Bool:
  match a b:
    case True{} True{}:
      True{}
    case False{} False{}:
      True{}
    case _ _:
      False{}

# The first n bits of xs and ys agree.
def prefix_eq(n: Nat, xs: List<&2, Bool>, ys: List<&2, Bool>) -> Bool:
  match n:
    case 0n:
      True{}
    case 1n+p:
      match xs ys:
        case Con{x, xt} Con{y, yt}:
          Bool.and(same(x, y), prefix_eq(p, xt, yt))
        case _ _:
          False{}

def in_range(r: Range, ip: Addr) -> Bool:
  match r:
    case Range{base, len}:
      prefix_eq(1n+len, addr_bits(base), addr_bits(ip))

# https://www.cloudflare.com/ips-v4 and /ips-v6, checked 2026-10-10.
def ranges() -> +List<Range>:
  [
    Range{V4{173, 245, 48, 0}, 20n},  # 173.245.48.0/20
    Range{V4{103, 21, 244, 0}, 22n},  # 103.21.244.0/22
    Range{V4{103, 22, 200, 0}, 22n},  # 103.22.200.0/22
    Range{V4{103, 31, 4, 0}, 22n},  # 103.31.4.0/22
    Range{V4{141, 101, 64, 0}, 18n},  # 141.101.64.0/18
    Range{V4{108, 162, 192, 0}, 18n},  # 108.162.192.0/18
    Range{V4{190, 93, 240, 0}, 20n},  # 190.93.240.0/20
    Range{V4{188, 114, 96, 0}, 20n},  # 188.114.96.0/20
    Range{V4{197, 234, 240, 0}, 22n},  # 197.234.240.0/22
    Range{V4{198, 41, 128, 0}, 17n},  # 198.41.128.0/17
    Range{V4{162, 158, 0, 0}, 15n},  # 162.158.0.0/15
    Range{V4{104, 16, 0, 0}, 13n},  # 104.16.0.0/13
    Range{V4{104, 24, 0, 0}, 14n},  # 104.24.0.0/14
    Range{V4{172, 64, 0, 0}, 13n},  # 172.64.0.0/13
    Range{V4{131, 0, 72, 0}, 22n},  # 131.0.72.0/22
    Range{V6{9216, 51968, 0, 0, 0, 0, 0, 0}, 32n},  # 2400:cb00::/32
    Range{V6{9734, 18176, 0, 0, 0, 0, 0, 0}, 32n},  # 2606:4700::/32
    Range{V6{10243, 63488, 0, 0, 0, 0, 0, 0}, 32n},  # 2803:f800::/32
    Range{V6{9221, 46336, 0, 0, 0, 0, 0, 0}, 32n},  # 2405:b500::/32
    Range{V6{9221, 33024, 0, 0, 0, 0, 0, 0}, 32n},  # 2405:8100::/32
    Range{V6{10758, 39104, 0, 0, 0, 0, 0, 0}, 29n},  # 2a06:98c0::/29
    Range{V6{11279, 62024, 0, 0, 0, 0, 0, 0}, 32n},  # 2c0f:f248::/32
  ]

def in_any(rs: List<&2, Range>, +ip: Addr) -> Bool:
  match rs:
    case Nil{}:
      False{}
    case Con{r, rt}:
      Bool.or(in_range(r, ip), in_any(rt, ip))

def is_cf(ip: Addr) -> Bool:
  in_any(ranges(), ip)

def all_cf(ips: List<&2, Addr>) -> Bool:
  match ips:
    case Nil{}:
      True{}
    case Con{h, t}:
      Bool.and(is_cf(h), all_cf(t))

def pick(on: Bool) -> Verdict:
  match on:
    case True{}:
      OnCloudflare{}
    case False{}:
      OffCloudflare{}

# Every A and AAAA answer must be Cloudflare's. One foreign IP means some viewers land off Cloudflare.
def verdict(+ips: List<&2, Addr>) -> Verdict:
  match ips:
    case Nil{}:
      Unresolved{}
    case Con{_, _}:
      pick(all_cf(ips))
