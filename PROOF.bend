import Base
import ./LAWS.bend as Laws
import ./src/viewers/sync.bend as W

# PROOF: the audit computes to an empty list.
def Laws.dark_theme_meets_aa():
  {==}

def Laws.light_theme_meets_aa():
  {==}

# PROOF: the audit computes to the single scheme failure.
def Laws.missing_scheme_is_caught():
  {==}

# PROOF: the layout audit computes to an empty list.
def Laws.viewer_grid_reflows():
  {==}

# PROOF: the layout audit computes to the single phone failure.
def Laws.wide_cell_is_caught():
  {==}

# PROOF: each verdict computes to the stated constructor.
def Laws.served_ips_are_cloudflare():
  {==}

def Laws.failed_ip_is_not_cloudflare():
  {==}

def Laws.one_foreign_ip_fails_the_domain():
  {==}

def Laws.no_answer_is_unresolved():
  {==}

def Laws.range_edges_hold():
  {==}

def Laws.v4_range_skips_v6():
  {==}

# PROOF: case analysis on the first answer, then on the resend and the re-login.
def Laws.viewer_agrees_with_upstream(answers, relogged):
  match answers:
    case Nil{}:
      {==}
    case Con{a, rest}:
      match a:
        case W.Ok{}:
          {==}
        case W.Failed{}:
          {==}
        case W.Expired{}:
          match rest:
            case Nil{}:
              {==}
            case Con{b, _}:
              match b:
                case W.Ok{}:
                  match relogged:
                    case True{}:
                      {==}
                    case False{}:
                      {==}
                case W.Expired{}:
                  match relogged:
                    case True{}:
                      {==}
                    case False{}:
                      {==}
                case W.Failed{}:
                  match relogged:
                    case True{}:
                      {==}
                    case False{}:
                      {==}

# PROOF: each outcome computes to the stated constructor.
def Laws.expired_token_write_lands():
  {==}

def Laws.write_is_resent_once():
  {==}

def Laws.failed_write_is_not_resent():
  {==}
