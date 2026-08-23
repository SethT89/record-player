# Future Features

Ideas captured for later consideration — not designed or scoped yet.
When one of these is ready to build, it goes through the normal
spec → plan → implementation process (see `docs/superpowers/`).

## Cast to Sonos / other local-network speakers

Play through a Sonos system (or similar local-network speakers) instead
of the device's own output, by discovering and controlling them over the
local network.

**Blocked on:** this isn't buildable in the current app as-is. Sonos
(and local-network speaker discovery generally) works over UPnP/SSDP —
UDP multicast broadcasts on the local network — and browsers don't expose
raw UDP sockets or multicast/mDNS discovery to web pages at all; it's a
deliberate security restriction, not a missing library. A plain web app,
however it's hosted, structurally cannot scan the local network for
devices or speak Sonos's local control protocol directly.

**Prerequisite:** wrapping the app in a native shell —

- **Electron** (desktop): full Node.js access, so UDP sockets / mDNS
  discovery / UPnP libraries are available directly, same as any native
  desktop app.
- **Capacitor** (mobile native): native plugin access can do the same on
  iOS/Android — though note iOS additionally gates local-network access
  behind its own explicit user permission prompt ("Local Network"),
  independent of app-store distribution, so that permission flow would
  need to be part of the design too.

Not scoped further than that — real design work (which protocol(s) to
support, UI for selecting an output device, how it interacts with the
existing `<audio>`-based playback path) happens if/when this gets picked
up.

## Plex integration

A fourth music source alongside Deezer, local files, and Subsonic:
connect to a Plex Media Server and browse/play a personal library, same
shape as the Subsonic integration.

**Backend needed?** Worth double-checking against a real server before
assuming so, rather than taking it as given — we made the same assumption
about Subsonic and it turned out not to hold. Plex's own official web
client is itself a browser-based app that talks to a Plex Media Server
directly, which means the server generally does support direct
browser-to-server calls (same CORS caveat already documented for
Subsonic: it depends on the specific server's configuration, not
guaranteed universally). A backend/proxy may still end up useful for
other reasons (see User accounts below), but "Plex requires a backend"
isn't confirmed — check it directly against a real server when this gets
scoped.

## Jellyfin integration

Same idea as Plex, for Jellyfin servers. Jellyfin's API is, in spirit,
close to Subsonic's (open, well-documented, built for third-party
clients, plain username/password auth — no external account needed,
unlike Plex). This is likely the lowest-effort of the three
music-service integrations to build, since the pattern from Subsonic
(API client behind one URL-building chokepoint, connection persisted in
`localStorage`, browse + search modals) should transfer directly.

**Verified (2026-08-23):** checked `access-control-allow-origin` against
the public Jellyfin demo server (`demo.jellyfin.org`) — it returns `*`,
and `/System/Info/Public` responds correctly. Confirms the same
direct-browser-call approach used for Subsonic is viable, at least for
that server's configuration; still worth a similar check against
whatever server this actually gets built/tested with, since CORS is a
per-server setting, not a Jellyfin-wide guarantee.

## User accounts / user management

Not needed yet, and shouldn't be built speculatively — this app has
deliberately stayed backend-less and account-less so far (Subsonic
credentials, for example, live in `localStorage`, isolated per
browser/device with no server involved). Add real accounts when one of
these actually becomes true, not before:

- **A shared backend/proxy gets built** (e.g., to work around a
  music-server's CORS restrictions, for Sonos-style local-network
  features, or any other reason). The moment a backend exists and serves
  more than one person, it needs some way to know *whose* request it's
  handling — that's the point accounts stop being optional.
- **Cross-device sync becomes a real ask** — e.g. someone wants their
  saved Subsonic/Plex/Jellyfin connection to follow them from their phone
  to their laptop. `localStorage` fundamentally can't do this (it's tied
  to one browser on one device); syncing requires both a backend to sync
  through and accounts to know which device's data belongs to whom.

Note this is a different problem from Plex/Jellyfin/Subsonic's own
built-in multi-user support (all three already let multiple people have
separate logins on the *same media server*) — that's already handled on
their end and doesn't require anything from us. This section is
specifically about whether *our app itself* ever needs its own accounts
system, which is a much bigger addition (auth, sessions, a database,
hosting for a real backend) than anything else on this list.
