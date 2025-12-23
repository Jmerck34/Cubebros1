# Backup Information

## Latest Backup: v7_enemies_working

**Date:** December 23, 2024
**Version:** Phase 7 - Enemies Complete

### Features Included:
- ✅ Player movement (left/right, jump, gravity)
- ✅ Platform system with collision detection
- ✅ Side collision (can bump into walls)
- ✅ Camera follow system (smooth tracking)
- ✅ Ground and floating platforms
- ✅ Enemy system (Goomba base class)
- ✅ 3 Goombas that patrol platforms
- ✅ Enemy collision (stomp to kill, side hit = death)
- ✅ Edge detection (enemies turn around)

### Files Backed Up:
- Complete project archive: `v7_enemies_working_YYYYMMDD_HHMMSS.tar.gz`
- Individual files: `index_v7_enemies.html`, `main_v7_enemies.js`

### How to Restore:
1. Extract archive: `tar -xzf v7_enemies_working_*.tar.gz -C restore_folder/`
2. Or copy individual files back to project root

### Project Structure:
```
/threejs-platformer
├── index.html
├── main.js
├── /core
│   ├── gameLoop.js
│   ├── constants.js
├── /player
│   ├── Player.js
│   ├── playerPhysics.js
├── /world
│   ├── Level.js
├── /camera
│   ├── CameraFollow.js
├── /entities
│   ├── EnemyBase.js
│   ├── Goomba.js
└── /utils
    ├── input.js
    ├── collision.js
```

### Next Features Planned:
- Power-ups (Mushroom)
- Sound effects
- Visual polish
- More levels
