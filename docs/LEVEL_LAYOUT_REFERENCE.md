# Level Layout Reference

## 📍 Current Platform & Enemy Positions

Use this reference to avoid conflicts when adding new platforms or enemies.

---

## 🗺️ Map Layout (X-axis positions)

```
    FAR LEFT        LEFT          CENTER         RIGHT        FAR RIGHT
      -17            -12             0             15             25
       |              |              |              |              |
    ===|==============|==============|==============|==============|===
       |              |              |              |              |
```

---

## 🏗️ Platform Positions

### Ground Level (Y = -3)
| X Position | Width | Type | Notes |
|------------|-------|------|-------|
| 0 | 100 units | ground | Main ground platform (extends -50 to +50) |

### Floating Platforms
| X Position | Y Position | Width | Height | Type | Notes |
|------------|------------|-------|--------|------|-------|
| 5 | 0 | 3 | 0.5 | grass | Right side, low |
| 10 | 2 | 3 | 0.5 | grass | Right side, mid-height |
| -5 | 1 | 4 | 0.5 | grass | Left side, low-mid |
| -17 | 2 | 5 | 0.5 | grass | Far left |
| 0 | 4 | 4 | 0.5 | grass | High center |
| 25 | 1 | 3 | 0.5 | stone | Far right |

### Walls & Obstacles
| X Position | Y Base | Y Top | Width | Type | Special Features |
|------------|--------|-------|-------|------|------------------|
| **-12** | **-3** | **3.4** | **1.5** | **wall** | **LADDER on right side - climb with W/S** (visual: 8 blocks × 0.8) |
| 15 | -3.5 | 1.5 | 2 | stone | Tall wall, right side |
| 20 | -3 | -1 | 1.5 | stone | Medium platform |

---

## 👾 Enemy Positions

| Enemy | X Position | Y Position | Platform/Area | Notes |
|-------|------------|------------|---------------|-------|
| Goomba 1 | 8 | 0 | Ground | Between spawn and right platforms |
| Goomba 2 | -7 | 0 | Ground | Left side, clear area |
| Goomba 3 | 12 | 3 | Floating (10, 2) | On right floating platform |
| ~~Goomba 4~~ | ~~-12~~ | ~~0~~ | **REMOVED** | **Conflicted with ladder wall** |
| Goomba 5 | -17 | 3 | Floating (-17, 2) | Far left platform |
| Goomba 6 | 18 | 0 | Ground | Far right ground |

---

## 🚫 Occupied Zones (Do Not Place Objects Here)

### Critical Areas:
- **X: -13 to -11** (Wall with ladder) - No enemies, no overlapping platforms
- **X: -18 to -16** (Far left platform area) - Goomba already present
- **X: 9 to 11** (Right floating platforms) - Platform cluster
- **X: 14 to 16** (Right wall) - Tall stone wall

---

## ✅ Safe Zones for New Content

### Ground Level (Y = 0 to -3):
- **X: -25 to -18** - Far left ground (empty)
- **X: -10 to -8** - Between wall and goomba2 (small space)
- **X: -2 to 2** - Near spawn (currently empty)
- **X: 20 to 25** - Far right ground (mostly empty)
- **X: 25+** - Beyond current map (expand right)

### Mid-Air (Y = 1 to 3):
- **X: -10 to -6** - Between left structures
- **X: 14 to 19** - Right side mid-air
- **X: 6 to 9** - Between center and right platforms

### High Air (Y = 4+):
- **X: 5 to 15** - Right side high area
- **X: -8 to -2** - Left-center high area

---

## 📐 Coordinate System Reference

### Y-Axis (Vertical):
- **Ground:** Y = -3
- **Low platforms:** Y = 0 to 1
- **Mid platforms:** Y = 2 to 3
- **High platforms:** Y = 4 to 5
- **Very high:** Y = 6+

### X-Axis (Horizontal):
- **Far Left:** X < -15
- **Left:** X = -15 to -5
- **Center:** X = -5 to 5
- **Right:** X = 5 to 15
- **Far Right:** X > 15

---

## 🔧 Adding New Content - Best Practices

### Before Adding a Platform:
1. ✅ Check this reference for occupied X positions
2. ✅ Ensure Y position doesn't overlap existing platforms
3. ✅ Leave 2+ units spacing between platforms for navigation
4. ✅ Consider if enemies can walk on it (needs width ≥ 2 units)
5. ✅ Update this document with new platform position

### Before Adding an Enemy:
1. ✅ Check platform positions - enemies spawn ON platforms
2. ✅ Ensure Y position matches platform top + 0.5 units
3. ✅ Avoid X positions with walls or dense platforms
4. ✅ Test that enemy has room to walk (2+ units clear space)
5. ✅ Update this document with new enemy position

### Before Adding a Wall/Structure:
1. ✅ Check for enemy conflicts at X position
2. ✅ Ensure base Y position matches ground or platform
3. ✅ Consider if wall blocks player navigation
4. ✅ Add landing platform at wall top if climbable
5. ✅ Update this document with structure bounds

---

## 🎯 Example: Adding a New Platform

**Goal:** Add a stone platform on the right side

1. **Check reference:** Right side platforms at X = 5, 10, 15, 25
2. **Choose position:** X = 18 (between 15 and 25 - safe zone)
3. **Choose height:** Y = 3 (above ground, below high platforms)
4. **Choose size:** Width = 2.5, Height = 0.5
5. **Add to code:**
   ```javascript
   this.addPlatform(18, 3, 2.5, 0.5, 'stone');
   ```
6. **Update this document** with new platform position

---

## 🎯 Example: Adding a New Enemy

**Goal:** Add a Goomba on the high center platform

1. **Check reference:** Center platform at (0, 4, width=4)
2. **Platform top:** Y = 4 + 0.25 (half of 0.5 height) = 4.25
3. **Enemy spawn:** Y = 4.25 + 0.5 (enemy half-height) = 4.75
4. **Simplified:** Use Y = 5 for spawning on Y=4 platforms
5. **Add to code:**
   ```javascript
   const goomba7 = new Goomba(scene, 0, 5);
   level.addEnemy(goomba7);
   ```
6. **Update this document** with new enemy position

---

## 🛠️ Code Locations

- **Platform creation:** `world/Level.js` → `createTestLevel()`
- **Enemy spawning:** `main_hero_select.js` → `startGame()` function (lines 78-94)
- **Wall with ladder:** `world/Level.js` → `addWallWithLadder(x, baseY, height)`

---

## 📝 Change Log

### 2024-12-24
- ✅ Added ladder wall at X = -12 (7 units tall parameter)
- ✅ Fixed wall base to Y = -3 (ground level)
- ✅ Ladder shortened to stop 0.5 units below wall top
- ✅ Removed landing platform above wall
- ✅ Fixed wall collision to match actual visual height (6.4 units visual, collision top Y = 3.4)
- ✅ Two-pass collision system (wall priority, then ladder)
- ✅ Ladder only activates when climbing (not falling)
- ✅ Removed Goomba 4 (conflicted with wall)
- ✅ Moved far-left platform from X = -15 to X = -17 (clearance)
- ✅ Added Goomba 6 at X = 18 (far right)
- ✅ Repositioned Goomba 5 to X = -17 (on far-left platform)
- ✅ Created this reference document
- ✅ Fixed hero floating above wall (collision now matches block positions)

---

**Last Updated:** December 24, 2024
**Use this reference before adding any new platforms or enemies!**
