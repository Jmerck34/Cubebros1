# Map Keys

These keys tag `Body.mapKey` when a level builds platforms. They let us filter or serialize
objects per map later.

- `playtest`: Main test layout used by `main.js` and `main_all_heroes.js`.
- `ogmap`: Capture the Flag mode (uses the original test layout today).
- `arena`: Arena mode (uses the test layout today).
- `koth`: King of the Hill mode (uses the test layout today).
- `game-test`: Minimal playtest map (medium ground + 3 floating platforms).
- `hilltower`: Game Test mask map built from the Hilltower PNG.

# Map Camera Config

Maps can define a `camera` block to tune camera behavior per map. These values
are applied to `CameraFollow` and the camera instance when the map is built.

```
camera: {
  smoothing: 0.1,
  verticalFollowStart: 2.5,
  verticalFollowMaxOffset: 10,
  offset: { x: 0, y: 0, z: 10 },
  bounds: { left: -20, right: 20, bottom: -10, top: 12 },
  zoom: 1
}
```

Fields:
- `smoothing`: follow lerp factor (0 = instant).
- `verticalFollowStart`: Y threshold before vertical follow starts.
- `verticalFollowMaxOffset`: max upward camera offset.
- `offset`: base camera offset from the target.
- `bounds`: clamp region for camera center.
- `zoom`: camera zoom scale (OrthographicCamera).

Set in `threejs-platformer/docs/world/Level.js` via `createTestLevel(...)`,
`createArenaLevel(...)`, `createKothLevel(...)`, and `createGameTestLevel()`.

# Hilltower Mask Colors

Color codes used by the Hilltower PNG mask:

- `#00FF01` Solid Body (structures)
- `#99FF00` Solid Platform
- `#FFEF00` One Way Platform
- `#F8A900` Moving Platform (solid, moves along Traveller)
- `#CC00FF` Ladder
- `#FF0008` Traveller path
- `#FF8B00` Kill floor line
- `#FF00EA` Player size reference
- `#8E00FF` Blue team spawn
- `#FF006C` Red team spawn

See `threejs-platformer/docs/MAP_MOVING_PLATFORMS.md` for moving platform + traveller rules.
