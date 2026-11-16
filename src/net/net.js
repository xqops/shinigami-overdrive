// Network seam. The game only ever talks to a "session":
//   session.submit(cmd)   -> send this tick's input command
//   session.tick(dt)      -> advance and return the events produced
//   session.world         -> state to render
// Today the only implementation is LocalSession (single player, world runs in the page).
// A future OnlineSession keeps the exact same surface but sends commands over a WebSocket
// to an authoritative server running src/sim/* in Node. See docs/MULTIPLAYER.md.
(function (SO) {
  'use strict';

  // Message shapes shared by client and (future) server. Plain JSON, versioned.
  const PROTOCOL = {
    VERSION: 1,
    // client -> server
    hello: (name) => ({ t: 'hello', v: 1, name }),
    cmd: (cmd) => ({ t: 'cmd', c: cmd }),
    // server -> client
    welcome: (pid, seed) => ({ t: 'welcome', pid, seed }),
    snap: (snapshot, events) => ({ t: 'snap', s: snapshot, e: events }),
  };

  class LocalSession {
    constructor(opts) {
      opts = opts || {};
      this.world = new SO.World.World({ seed: opts.seed || (Date.now() & 0xffff) });
      this.pid = 1;
      this.world.addPlayer(this.pid, opts.name, { school: opts.school });
      this.isHost = true;
      this.online = false;
    }
    get player() { return this.world.players[this.pid]; }
    submit(cmd) { this.world.setCommand(this.pid, cmd); }
    tick(dt) { this.world.step(dt); return this.world.drainEvents(); }
    close() {}
  }

  SO.Net = { PROTOCOL, LocalSession };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
