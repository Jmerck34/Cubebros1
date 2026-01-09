# Moving Platform Mask Rules

This doc describes how `#F8A900` moving platforms and `#FF0008` traveller lines are interpreted
when building a mask map (ex: Hilltower).

## Colors

- `#F8A900` Moving Platform (one-way)
- `#FF0008` Traveller line (defines travel distance + axis)

## Behavior

- Each `#F8A900` rectangle creates **one one-way platform**.
- Each platform is paired to the **nearest** `#FF0008` line.
- The red line **does not create a platform**; it only provides travel distance.
- The **dominant axis** of the red line determines movement direction:
  - Horizontal line → moves on X only.
  - Vertical line → moves on Y only.
- The platform **starts at its PNG position** using a phase offset.
- Travel distance comes from the red line length, reduced by half the platform size so it stays on the line.

## Map Config (example)

```
export const hilltowerMaskConfig = {
  key: 'hilltower',
  url: './assets/maps/hilltower-map.png',
  movingPlatformType: 'grass',
  disableMovingPlatforms: false,
  disableTravellers: false,
  travelSpeed: 1.0
};
```

## Notes

- If a `#F8A900` platform is far from any red line, it will not move.
- If a red line is shorter than the platform’s size, movement range becomes 0.
