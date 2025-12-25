# ThreeJS Platformer - Complete Game Context
**Last Updated:** December 24, 2024

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Game Architecture](#game-architecture)
3. [Hero Classes](#hero-classes)
4. [Control Scheme](#control-scheme)
5. [Recent Improvements](#recent-improvements)
6. [Technical Implementation Details](#technical-implementation-details)
7. [File Structure](#file-structure)
8. [Development Notes](#development-notes)

---

## 🎮 Project Overview

A 2D side-scrolling platformer built with Three.js, inspired by New Super Mario Bros. Wii. The game features multiple playable heroes with unique abilities, enemies, platforms, and combat mechanics.

**Platform:** Web-based (Three.js)
**Camera:** Orthographic (for 2D feel)
**Game Style:** MOBA-inspired combat controls with platformer movement

---

## 🏗️ Game Architecture

### Core Systems

#### 1. **Game Loop** (`core/gameLoop.js`)
- Delta time tracking for frame-rate independent physics
- Update/render separation
- ~60 FPS target

#### 2. **Physics System** (`player/playerPhysics.js`)
- Gravity: -20 units/s²
- Player speed: 5 units/s
- Jump velocity: 10 units/s
- AABB collision detection

#### 3. **Input System** (`utils/input.js`)
- Keyboard and mouse support
- Context menu prevention
- Multi-key support (WASD + Arrow keys)

#### 4. **Level System** (`world/Level.js`)
- Platform management
- Enemy spawning
- Power-up handling
- Collision detection

---

## ⚔️ Hero Classes

### 1. **Warrior** (`player/Warrior.js`)
**Color:** Blue (0x0066ff)
**Equipment:** Sword + Shield
**Playstyle:** Melee tank with mobility

**Abilities:**
- **Q - Sword Slash** (1s cooldown)
  - Crescent arc that traces sword tip path
  - Range: 2.5 horizontal, 1.5 vertical
  - Visual: Blue crescent following sword swing
  - Works in both directions (facing-aware)

- **Right Click - Shield Bash** (4s cooldown)
  - Knockback attack
  - Shield animation

- **E - Dash** (4s cooldown)
  - Fast forward dash in facing direction
  - Leaves blue trail effect
  - Distance: ~1.5 units

- **R - Whirlwind Ultimate** (charge-based)
  - 2.5 unit radius spin attack
  - 2 full rotations (16 hits)
  - Visual: 12 spiral wind trails with swirl effect
  - Follows character during spin

**Visual Effects:**
- Sword slash traces actual tip position using trigonometry
- Whirlwind creates cyclone with 1.5 spiral rotations
- Dash trail fades over 300ms
- All effects preserve facing direction

---

### 2. **Assassin** (`player/Assassin.js`)
**Color:** Purple (0x9400d3)
**Equipment:** Dual daggers (horizontal pointing)
**Playstyle:** High mobility, burst damage, stealth

**Abilities:**
- **Q / Left Click - Dagger Slash Combo**
  - Dual crescent moons on both sides simultaneously
  - Circular arc effect (removes top/bottom quarters)
  - Range: 2.0 horizontal, 2.4 vertical (±1.2)
  - Visual: Purple circular slash arc
  - 3-hit combo with bleed damage
  - Follows character position

- **Right Click - Poison Bomb**
  - Thrown projectile with arc trajectory
  - Detects platform collisions (grass, stone, ground)
  - Explodes on impact, creates poison cloud
  - DoT (damage over time) area effect

- **E - Shadow Walk** (5s duration)
  - Character becomes invisible
  - Thin black line shadow on ground (1 x 0.05 units)
  - Shadow follows player across platforms
  - Ground-level detection system
  - Invincibility during duration
  - Cancels when using offensive abilities

- **R - Assassinate** (charge-based)
  - Teleport-based instant kill
  - Purple teleport trail effect

**Visual Effects:**
- Dual daggers point horizontally (left and right)
- Crescent slash traces 270° circle (excludes 90° top + 90° bottom)
- Shadow line positioned at platform.bounds.top + 0.025
- All abilities cancel shadow walk

**Technical Details:**
- Dagger rotation: left at +90°, right at -90°
- Crescent segments: 16 total, skip 45°-135° and 225°-315°
- Shadow detection: iterates platforms, finds highest ground beneath player
- Effects attached to mesh for character-following

---

### 3. **Cyborg** (`player/Cyborg.js`)
**Color:** Purple (0x9932cc)
**Equipment:** Arm Cannon
**Playstyle:** Ranged caster with zone control

**Abilities:**
- **Q / Left Click - Fireball**
  - Ranged projectile (0.25 radius sphere)
  - Speed: 12 units/s
  - Orange/red color (0xff4500)
  - Book flip animation

- **Right Click - Wind Push**
  - Cone-shaped knockback wave
  - Cyan color (0xccffff)
  - Book scale animation
  - Pushes enemies backward

- **E - Bubble Shield**
  - Temporary immunity bubble
  - Light blue transparent sphere
  - Surrounds player

- **R - Kame Hame Ha** (charge-based ultimate)
  - Charged beam attack
  - Longer charge = more damage
  - Cyan beam (0x00ffff)
  - 10 unit range

**Visual Effects:**
- Book animations on all casts
- Fireball travels until collision or max distance
- Wind cone expands over time
- Bubble shield pulses
- All effects direction-aware (facing left/right)

**Technical Details:**
- Facing direction flips entire mesh (scale.x)
- Gear positioned relative to cyborg mesh
- Beam width: 1 unit, length: 10 units

---

### 4. **Warlock** (`player/Warlock.js`)
**Color:** Dark purple/black
**Equipment:** Staff
**Playstyle:** Crowd control specialist

**Abilities:**
- **Q - Lightning Strike**
  - AoE damage
  - Yellow lightning bolt

- **Right Click - Fear**
  - Turns enemies around
  - Purple fear wave

- **E - Hover**
  - Cloud-based flight
  - Temporary aerial mobility

- **R - Mind Control** (charge-based)
  - Convert enemies to allies
  - Purple mind control beam

---

## 🎮 Control Scheme

### Movement
| Action | Keys |
|--------|------|
| Move Left | A / Left Arrow |
| Move Right | D / Right Arrow |
| Jump (Double Jump) | W / Space |

### Abilities
| Ability | Keys | Notes |
|---------|------|-------|
| Ability 1 | Q / Left Click | Primary attack |
| Ability 2 | Right Click | Secondary ability |
| Ability 3 | E | Utility/mobility |
| Ultimate | R | Charge-based |

**Important Notes:**
- W key doubles as jump (WASD comfort)
- Left click triggers Ability 1 (MOBA-style)
- Right click for Ability 2 (moved from W)
- All inputs support simultaneous presses

---

## 🔄 Recent Improvements

### December 24, 2024

#### **Warrior Improvements:**
1. **Sword Slash Rework**
   - Fixed left-facing bug (dual slash appearance)
   - Now traces actual sword tip path using trigonometry
   - Sword swings from -0.87 to -2.2 radians (~76° arc)
   - 10 segments trace tip position
   - Preserves facing direction in scale transformations

2. **Visual Polish**
   - Reduced opacity from 0.8 → 0.5 (dimmer)
   - Faster fade rate: 0.2 per frame (was 0.12)
   - Animation interval: 30ms (was 40ms)

3. **Whirlwind Ultimate Enhancement**
   - Added swirling wind visual effect
   - 12 spiral trails (was 8)
   - 1.5 rotations from center to edge
   - Perpendicular segment orientation for swirl
   - Attached to mesh (follows character)
   - Clear 2.5 unit range indication

4. **Cooldown Reductions**
   - Sword Slash: 2s → **1s** (50% faster)
   - Dash: 5s → **4s** (20% faster)

#### **Assassin Improvements:**
1. **Dual Dagger Repositioning**
   - Daggers now point horizontally (outward from sides)
   - Left dagger: rotation.z = π/2 (90°)
   - Right dagger: rotation.z = -π/2 (-90°)
   - Both blades position at y = 0.375 (pointing out)

2. **Dagger Slash Rework**
   - Changed from dual side crescents to circular arc
   - 16 segments trace full circle
   - Removes top quarter (45°-135°) and bottom quarter (225°-315°)
   - Leaves left and right arcs (270° total coverage)
   - Radius: 1.2 units
   - Purple color (0x9400d3)
   - Attached to mesh at (0, 0, 0.1)

3. **Shadow Walk Ground Detection**
   - Changed from flattened mesh to thin black line
   - PlaneGeometry: 1 x 0.05 units
   - Positioned at ground level (platform.bounds.top + 0.025)
   - Follows player across platforms in update loop
   - Character invisible during shadow walk
   - Shadow detects highest platform beneath player

4. **Poison Bomb Platform Detection**
   - Now detects collisions with all platforms
   - Checks AABB collision with bomb bounds (0.15 radius)
   - Explodes on grass, stone, walls, ground
   - Requires player.level reference (set in main.js)

#### **General Improvements:**
- All heroes now have facing direction tracking
- Equipment and effects flip correctly when facing left/right
- Abilities cancel shadow walk (Assassin)
- Visual effects follow character movement
- Consistent opacity/fade patterns across heroes

---

## 🛠️ Technical Implementation Details

### Coordinate System
- **X-axis:** Horizontal (left/right)
- **Y-axis:** Vertical (up/down)
- **Z-axis:** Depth (0 = player plane, positive = toward camera)
- **Ground level:** Y = -3
- **Death threshold:** Y = -10

### Collision Detection
**AABB (Axis-Aligned Bounding Box):**
```javascript
{
  left: x - width/2,
  right: x + width/2,
  top: y + height/2,
  bottom: y - height/2
}
```

**Collision Check:**
```javascript
box1.left < box2.right &&
box1.right > box2.left &&
box1.top > box2.bottom &&
box1.bottom < box2.top
```

### Visual Effect Patterns

#### **1. Circular Arc Effects** (Assassin slash, Warrior whirlwind)
```javascript
for (let i = 0; i < segments; i++) {
  const angle = (i / segments) * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  // Create segment at (x, y)
}
```

#### **2. Spiral Effects** (Warrior whirlwind)
```javascript
const spiralAngle = startAngle + (t * Math.PI * rotations);
const x = Math.cos(spiralAngle) * (t * radius);
const y = Math.sin(spiralAngle) * (t * radius);
```

#### **3. Sword Tip Tracing** (Warrior slash)
```javascript
const angle = startAngle + (t * angleRange);
const tipX = swordBaseX + Math.sin(-angle) * swordLength;
const tipY = swordBaseY + Math.cos(-angle) * swordLength;
```

#### **4. Fade Animations**
```javascript
setInterval(() => {
  opacity -= fadeRate;
  material.opacity = opacity;
  if (opacity <= 0) {
    clearInterval();
    remove();
  }
}, intervalMs);
```

### Facing Direction System
All heroes track `facingDirection`:
- `1` = facing right
- `-1` = facing left

**Flipping methods:**
```javascript
// Method 1: Scale entire mesh
this.mesh.scale.x = this.facingDirection;

// Method 2: Scale effect group
effectGroup.scale.x = this.facingDirection;

// Method 3: Position offset
const offsetX = distance * this.facingDirection;
```

### Ground Detection Algorithm
```javascript
let groundLevel = -3; // Default
for (const platform of level.platforms) {
  if (playerX >= platform.bounds.left &&
      playerX <= platform.bounds.right &&
      platform.bounds.top <= playerY &&
      platform.bounds.top > groundLevel) {
    groundLevel = platform.bounds.top;
  }
}
```

---

## 📁 File Structure

```
/threejs-platformer
├── index.html                    # Entry point
├── main_hero_select.js          # Hero selection and game initialization
├── index_hero_select.html       # Hero selection UI
│
├── /core
│   ├── gameLoop.js              # Main game loop with delta time
│   └── constants.js             # Game physics constants
│
├── /player
│   ├── Hero.js                  # Base hero class
│   ├── Warrior.js               # Warrior implementation
│   ├── Assassin.js              # Assassin implementation
│   ├── Cyborg.js                # Cyborg implementation
│   ├── Warlock.js               # Warlock implementation
│   └── playerPhysics.js         # Shared physics functions
│
├── /world
│   ├── Level.js                 # Level management
│   └── Ground.js                # Ground platform
│
├── /camera
│   └── CameraFollow.js          # Camera controller
│
├── /entities
│   ├── EnemyBase.js             # Base enemy class
│   ├── Goomba.js                # Walking enemy
│   └── Mushroom.js              # Power-up
│
├── /utils
│   ├── input.js                 # Keyboard + mouse input
│   ├── collision.js             # AABB collision detection
│   └── audio.js                 # Sound manager
│
├── /skills
│   └── Ability.js               # Ability cooldown system
│
└── /docs
    ├── ASSASSIN_IMPROVEMENTS.md
    ├── CONTROLS_UPDATE.md
    └── GAME_CONTEXT_2024-12-24.md (this file)
```

---

## 🔧 Development Notes

### Common Patterns

#### **Creating Visual Effects:**
1. Create THREE.Group()
2. Add segments/meshes to group
3. Position relative to character
4. Attach to mesh (follows) or mesh.parent (world-space)
5. Animate with setInterval
6. Remove when complete

#### **Adding New Abilities:**
1. Create Ability instance with cooldown
2. Override `ability.use = (hero) => {...}`
3. Return true if successful
4. Call `hero.setAbilities()` to register

#### **Flipping Equipment:**
When facing left, avoid double-flipping:
```javascript
// BAD - equipment will flip twice
this.mesh.scale.x = -1;
this.equipment.scale.x = -1;

// GOOD - only flip parent
this.mesh.scale.x = this.facingDirection;
```

#### **Animation Timing:**
- Fast fade: 30-50ms interval, 0.1-0.2 opacity reduction
- Slow fade: 50-100ms interval, 0.05 opacity reduction
- Explosions: 20-30ms for snappy feel
- Trails: 40-60ms for smooth persistence

### Debug Tips

1. **Visual Effect Not Appearing:**
   - Check z-position (0.1-0.2 for visibility)
   - Verify added to scene/parent
   - Check material opacity > 0
   - Ensure camera can see bounds

2. **Facing Direction Issues:**
   - Trace `facingDirection` value
   - Check if effect uses `scale.x = facingDirection`
   - Verify position offset uses `* facingDirection`
   - Look for scale.set() overwriting previous flips

3. **Collision Not Working:**
   - Log both bounds objects
   - Verify bounds update with position
   - Check collision called after position update
   - Draw debug boxes (temporary meshes)

4. **Performance Issues:**
   - Limit active effects (remove old ones)
   - Use object pooling for frequent effects
   - Reduce segment count
   - Increase interval time

### Known Limitations

1. **Platform Detection:**
   - Only checks rectangular AABB bounds
   - Doesn't support slopes or curves
   - May have edge cases with moving platforms

2. **Visual Effects:**
   - No particle systems (manual segment creation)
   - Effects use basic geometries (boxes, planes)
   - Limited to MeshBasicMaterial (no lighting)

3. **Input System:**
   - No gamepad support
   - No rebindable keys
   - No input buffering

---

## 🎯 Future Enhancement Ideas

### Assassin
- [ ] Add slash trail particles (purple sparks)
- [ ] Poison cloud bubbling effect animation
- [ ] Shadow ripple when moving
- [ ] Combo counter UI display
- [ ] Critical hit on final dagger slash
- [ ] Poison bomb explosion particle burst

### Warrior
- [ ] Sword trail effect on all swings
- [ ] Shield block ability (parry mechanic)
- [ ] Charge attack (hold Q)
- [ ] Ground slam from air
- [ ] Shield reflection for projectiles

### Cyborg
- [ ] Fireball explosion on impact
- [ ] Multi-target fireball split
- [ ] Ice variant spells
- [ ] Teleport ability
- [ ] Spell combo system

### General
- [ ] Ultimate charge UI indicator
- [ ] Ability cooldown visual indicators
- [ ] Damage numbers popup
- [ ] Hit pause/screen shake
- [ ] Background parallax layers
- [ ] More enemy types
- [ ] Boss battles
- [ ] Multiplayer support

---

## 📊 Hero Balance Summary

| Hero | Mobility | Range | Burst | Sustain | Utility |
|------|----------|-------|-------|---------|---------|
| Warrior | Medium | Melee | Medium | High | Medium |
| Assassin | High | Melee | Very High | Low | High |
| Cyborg | Low | Long | Medium | Medium | Medium |
| Warlock | Medium | Medium | Low | High | Very High |

**Cooldown Comparison:**
- Warrior Q: 1s (fastest)
- Assassin Q: ~2s
- Cyborg Q: ~2s
- Warrior E: 4s
- All ultimates: Charge-based (no cooldown)

---

## 📝 Change Log

### 2024-12-24
- ✅ Warrior sword slash cooldown reduced to 1s
- ✅ Warrior dash cooldown reduced to 4s
- ✅ Warrior whirlwind visual improved with swirl effect
- ✅ Warrior sword slash traces actual tip path
- ✅ Assassin daggers repositioned to horizontal orientation
- ✅ Assassin slash changed to circular arc pattern
- ✅ Assassin shadow walk ground detection implemented
- ✅ Assassin shadow changed to thin black line
- ✅ Fixed all facing direction bugs across heroes
- ✅ Created comprehensive context documentation

### Previous Updates
- Assassin dagger slash hitbox increased
- Assassin poison bomb platform detection
- Control scheme updated (W for jump, right click for ability 2)
- All heroes implement facing direction system
- Camera follow improvements
- Level system with multiple platforms

---

**End of Context Document**
*For questions or improvements, see the main project plan or individual hero documentation files.*
