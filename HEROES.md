# Hero Classes

## Overview
This game features 4 unique hero classes, each with distinct playstyles and abilities.

## How to Switch Heroes
Edit `main_all_heroes.js` and uncomment the hero you want to play:

```javascript
// Option 1: Warrior (Sword & Shield)
const player = new Warrior(scene, 0, 0);

// Option 2: Assassin (Dual Daggers)
// const player = new Assassin(scene, 0, 0);

// Option 3: Cyborg (Tech Caster)
// const player = new Cyborg(scene, 0, 0);

// Option 4: Warlock (Dark Staff)
// const player = new Warlock(scene, 0, 0);
```

---

## ⚔️ Warrior - Sword & Shield Tank

**Theme:** Melee fighter with high survivability
**Color:** Blue
**Weapon:** Sword and Shield

### Abilities:
- **Q / Left Click - Sword Slash** (2s cooldown)
  - Wide crescent slash attack
  - Medium range
  - Deals damage in arc pattern

- **W - Shield Bash** (4s cooldown)
  - Bash forward with shield
  - Damages and knocks back enemies
  - Small forward dash

- **E - Dash** (5s cooldown)
  - Quick forward dash
  - Good for repositioning
  - Can escape danger

- **R - Whirlwind Ultimate** (Charge required)
  - Spin attack hitting all nearby enemies
  - Large damage radius
  - 2 full rotations

**Playstyle:** Tank/Bruiser - Get in close and deal sustained damage while surviving with mobility

---

## 🗡️ Assassin - Dual Daggers Stealth

**Theme:** High burst damage with stealth mechanics
**Color:** Dark Purple
**Weapon:** Dual Daggers

### Abilities:
- **Q / Left Click - Dagger Slash Combo** (3s cooldown)
  - 3 rapid slashes in succession
  - Extremely close range
  - High damage + applies BLEED effect
  - Bleed deals damage over time

- **W - Poison Bomb** (5s cooldown)
  - Throw bomb that creates poison cloud on impact
  - Cloud damages enemies over time
  - Lasts 3 seconds
  - Good area denial

- **E - Shadow Walk** (8s cooldown)
  - Become a flat black shadow on the ground
  - Move 5 seconds with slight speed increase
  - **IMMUNE TO ALL DAMAGE** while active
  - Perfect for escaping or repositioning

- **R - Assassinate Ultimate** (Charge required)
  - Teleport behind closest enemy (within 15 units)
  - Deal MASSIVE damage (triple hit)
  - Instant execution potential

**Playstyle:** Burst/Stealth - Sneak in with Shadow Walk, burst with combo + bleed, escape or finish with Assassinate

---

## 🤖 Cyborg - Tech Caster

**Theme:** Ranged tech caster with built-in emitters
**Color:** Steel Blue
**Weapon:** Arm Cannon

### Abilities:
- **Q / Left Click - Fireball** (2s cooldown)
  - Ranged projectile attack
  - Very strong damage (double hit)
  - Explodes on impact
  - Long range

- **W - Wind Push** (4s cooldown)
  - Cone-shaped wind blast
  - Damages enemies
  - Knocks enemies back significantly
  - Good crowd control

- **E - Bubble Shield** (6s cooldown)
  - Creates protective bubble around you
  - Medium radius (protects nearby allies if implemented)
  - **Blocks all damage** for 4 seconds
  - Visible as cyan wireframe sphere

- **R - Kame Hame Ha Ultimate** (Charge required)
  - **HOLD TO CHARGE** for 2 seconds
  - Fires massive energy beam
  - Damage increases with charge time
  - Hits all enemies in beam path
  - Can one-shot enemies when fully charged

**Playstyle:** Ranged Tech - Stay at distance, blast with fireballs, use Wind Push for space, shield when in danger, finish with Kame Hame Ha

---

## 💀 Warlock - Dark Magic Manipulator

**Theme:** Dark magic with crowd control and mobility
**Color:** Dark Purple/Black
**Weapon:** Staff with Purple Crystal

### Abilities:
- **Q / Left Click - Lightning Strike** (3s cooldown)
  - Medium range lightning bolt from sky
  - Strikes 3 units in front of you
  - Instant damage in vertical line
  - Good poke damage

- **W - Fear** (5s cooldown)
  - Area of effect fear wave
  - Turns enemies around (reverses direction)
  - Large radius
  - Disrupts enemy patterns

- **E - Hover** (6s cooldown)
  - Summon dark cloud beneath you
  - Hover above ground for 5 seconds
  - Slower movement but immune to gravity
  - Good for avoiding ground hazards

- **R - Mind Control Ultimate** (Charge required)
  - Large area of effect
  - Converts nearby enemies to your side
  - Controlled enemies turn **purple**
  - They attack other enemies for you
  - Lasts 10 seconds

**Playstyle:** Controller/Support - Manipulate the battlefield with Fear and Mind Control, use Hover for positioning, Lightning for poke

---

## General Controls

**Movement:**
- Arrow Keys or A/D - Move left/right
- Space - Jump (can double jump!)

**Abilities:**
- Q or Left Click - Ability 1
- W - Ability 2
- E - Ability 3
- R - Ultimate (requires charge from killing enemies)

---

## Hero Comparison

| Hero | Difficulty | Range | Damage | Survivability | Mobility |
|------|-----------|-------|---------|---------------|----------|
| Warrior | Easy | Melee | Medium | High | Medium |
| Assassin | Hard | Melee | Very High | Medium | High |
| Cyborg | Medium | Ranged | High | Medium | Low |
| Warlock | Medium | Medium | Medium | Low | High |

---

## Tips

### Warrior
- Use Shield Bash to create distance then Dash to engage
- Whirlwind is best when surrounded
- Very forgiving for beginners

### Assassin
- Shadow Walk makes you invincible - use it!
- Apply bleed with combo, let them suffer
- Assassinate only works within 15 units - get closer first
- Poison Bomb is great for area denial

### Cyborg
- Keep your distance - you're squishy
- Bubble Shield is your panic button
- Charge Kame Hame Ha fully for maximum damage
- Wind Push creates space when enemies get close

### Warlock
- Mind Control turns fights around instantly
- Fear + Lightning combo is very strong
- Hover over pits and hazards
- Control enemies, don't face-tank them

---

## Files

- `player/Warrior.js` - Warrior class implementation
- `player/Assassin.js` - Assassin class implementation
- `player/Cyborg.js` - Cyborg class implementation
- `player/Warlock.js` - Warlock class implementation
- `main_all_heroes.js` - Main game file with hero selection
- `index_all_heroes.html` - HTML page to test all heroes

---

## Testing

1. Open `index_all_heroes.html` in your browser
2. Edit `main_all_heroes.js` to uncomment the hero you want to test
3. Refresh the page
4. Kill enemies to charge your ultimate!

Enjoy! 🎮
