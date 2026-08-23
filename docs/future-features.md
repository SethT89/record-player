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
