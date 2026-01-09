# Map Keys

These keys tag `Body.mapKey` when a level builds platforms. They let us filter or serialize
objects per map later.

- `playtest`: Main test layout used by `main.js` and `main_all_heroes.js`.
- `ctf`: Capture the Flag mode (uses the test layout today).
- `arena`: Arena mode (uses the test layout today).
- `koth`: King of the Hill mode (uses the test layout today).
- `game-test`: Minimal playtest map (medium ground + 3 floating platforms).

Set in `threejs-platformer/docs/world/Level.js` via `createTestLevel(...)`,
`createArenaLevel(...)`, `createKothLevel(...)`, and `createGameTestLevel()`.
