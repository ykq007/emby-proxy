# Does a viewer's watch write reach the upstream account, like a main-account client's would?
# `npm run bend:mjs` compiles this to sync.mjs for gate.js.
import Base

# How the upstream answered one send: 2xx, 401 (its token for this device expired), or anything else.
type Answer is Data:
  Ok{}
  Expired{}
  Failed{}

# Where one write ended up: on the upstream account, and in the viewer's own watch state.
type Outcome is Data:
  Outcome{upstream: Bool, viewer: Bool}

# A 401 means the upstream did not take the write, so the proxy logs the device in again and sends it once more.
def retry(a: Answer) -> Bool:
  match a:
    case Expired{}:
      True{}
    case _:
      False{}

# gate.js writes local watch state only for a write the upstream took.
def landed(a: Answer) -> Outcome:
  match a:
    case Ok{}:
      Outcome{True{}, True{}}
    case _:
      Outcome{False{}, False{}}

def resend(+a: Answer, rest: List<&2, Answer>, relogged: Bool) -> Outcome:
  match rest relogged:
    case Con{b, _} True{}:
      landed(b)
    case _ _:
      landed(a)

def step(again: Bool, +a: Answer, rest: List<&2, Answer>, relogged: Bool) -> Outcome:
  match again:
    case True{}:
      resend(a, rest, relogged)
    case False{}:
      landed(a)

# answers: what the upstream says to each send, in order. relogged: the second login worked.
def sync(+answers: List<&2, Answer>, relogged: Bool) -> Outcome:
  match answers:
    case Nil{}:
      Outcome{False{}, False{}}
    case Con{a, rest}:
      step(retry(a), a, rest, relogged)

# The upstream account and the viewer's watch state agree on this write.
def agree(o: Outcome) -> Bool:
  match o:
    case Outcome{True{}, True{}}:
      True{}
    case Outcome{False{}, False{}}:
      True{}
    case _:
      False{}
