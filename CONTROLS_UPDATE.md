# Control Scheme Update

## 🎮 New Controls

### Movement & Jump
- **Move Left:** A or Left Arrow
- **Move Right:** D or Right Arrow
- **Jump:** W or Space (double jump enabled!)

### Abilities
- **Ability 1 (Q):** Left Click OR Q key
- **Ability 2:** Right Click (previously W key)
- **Ability 3:** E key
- **Ultimate (R):** R key

---

## 📋 Changes Made

### Previous Controls:
- Jump: Space only
- Ability 2: W key

### Updated Controls:
- Jump: **W or Space** (W added as alternative)
- Ability 2: **Right Click** (moved from W to right mouse button)

---

## 🎯 Why This Change?

This control scheme is more intuitive for MOBA-style gameplay:

1. **W for Jump** - More comfortable for WASD users who want to keep their hand centered
2. **Right Click for Ability 2** - Common in MOBAs (like League of Legends), feels natural for secondary abilities
3. **Left Click for Ability 1** - Primary attack on primary mouse button
4. **Better ergonomics** - Less finger stretching, more natural hand positioning

---

## 🕹️ Complete Control Reference

### All Heroes:

| Action | Keys |
|--------|------|
| Move Left | A / Left Arrow |
| Move Right | D / Right Arrow |
| Jump (Double Jump) | W / Space |
| Ability 1 | Q / Left Click |
| Ability 2 | Right Click |
| Ability 3 | E |
| Ultimate | R |

---

## ⚔️ Hero-Specific Abilities

### Warrior
- **Q / Left Click:** Sword Slash (crescent arc damage)
- **Right Click:** Shield Bash (knockback)
- **E:** Dash Forward (mobility)
- **R:** Whirlwind (spin attack ultimate)

### Assassin
- **Q / Left Click:** Dagger Combo (3-hit bleed)
- **Right Click:** Poison Bomb (DoT cloud)
- **E:** Shadow Walk (invincible stealth)
- **R:** Assassinate (teleport kill)

### Cyborg
- **Q / Left Click:** Fireball (ranged projectile)
- **Right Click:** Freeze Blast (knockback wave)
- **E:** Bubble Shield (immunity)
- **R:** Kame Hame Ha (charged beam)

### Warlock
- **Q / Left Click:** Lightning Strike (AoE damage)
- **Right Click:** Fear (turn enemies around)
- **E:** Hover (cloud flight)
- **R:** Mind Control (convert enemies)

### Archer
- **Q / Left Click:** Shoot Arrow (charge for range)
- **Right Click:** Healing Potion (HoT + speed)
- **E:** Teleport Arrow (blink)
- **R:** Machine Bow (rapid fire)

---

## 🔧 Technical Implementation

### Files Modified:

1. **utils/input.js**
   - Added `isRightClickPressed()` method
   - Updated `isJumpPressed()` to include W key
   - Updated `isAbility2Pressed()` to use right click instead of W

2. **index_hero_select.html**
   - Updated hero card ability descriptions
   - Updated ability UI icons (mouse emoji for clicks)
   - Added control summary to header

3. **main_hero_select.js**
   - Updated console log messages with new controls

---

## ✅ Backwards Compatibility

- Q key still works for Ability 1 (alongside left click)
- Space still works for jump (alongside W)
- All other keys unchanged (E, R remain the same)

---

Enjoy the improved controls! 🎮✨
