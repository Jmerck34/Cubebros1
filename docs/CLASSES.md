# Classes

Brief descriptions of every exported class in `threejs-platformer/docs`.

## Core
- `GameLoop` - Main update/render loop driver.

## Player
- `Player` - Base controllable character with physics, health, and collisions.
- `Hero` - Player subclass that adds abilities and hero-specific state.
- `Ability` - Cooldown + usage wrapper for hero abilities.
- `Warrior` - Samurai (melee-focused hero).
- `Assassin` - Fast, burst-damage hero.
- `Archer` - Ranged, projectile hero.
- `Warlock` - Magic/control hero.
- `Cyborg` - Tech-themed hero with beam/projectile abilities.
- `Paladin` - Tank/support hero with mace and utility.
- `Gunner` - Ranged hero with firearms and explosives.
- `Acolyte` - Light caster with beam and support tools.
- `Alchemist` - Purple-robed rogue with blade and flask.
- `SlimeBase` - Base class for slime-style heroes.

## Enemies
- `EnemyBase` - Base enemy behavior (movement, health, damage).
- `Goomba` - Simple walking enemy.

## UI
- `UIManager` - Ability cooldowns and HUD updates.
- `HealthBar` - Player health bar UI.
- `EnemyHealthBar` - Enemy health bar UI.
- `PauseMenu` - In-game pause and settings menu.
- `DebugMenu` - Dev menu for tuning and toggles.
- `PlayerStateOverlay` - F1 debug HUD showing player state.
- `MiniMap` - Per-player minimap overlay for players, flags, and objectives.
- `MiniMapMarker` - Small marker definition for minimap icons.
- `Graphic2D` - Base class for 2D visual elements or textures.

## Camera
- `CameraFollow` - Follows target(s) with smoothing and bounds.
- `FreeCameraController` - Manual camera pan controller.

## World / Map / Physics
- `Level` - Level container with platforms, enemies, collisions.
- `Ground` - Ground segment helper.
- `Environment` - Background/foreground layers and ambiance.
- `ParallaxLayer` - Single parallax layer definition.
- `ParallaxManager` - Parallax layer controller.
- `Body` - Base class for physical map objects.
- `CollisionShape` - Collision shape container.
- `SolidBody` - Immovable solid body.
- `SolidPlatform` - Solid platform body.
- `OneWayPlatform` - One-way platform body.
- `DamageBody` - Body that applies damage on contact.
- `BounceBody` - Body that bounces players upward.
- `Ladder` - Climbable volume.
- `Traveller` - Line-based mover path.
- `MapBuilder` - Builds a `Level` from map data objects.
- `MaskMapBuilder` - Builds map data from color-coded PNG masks.
- `DestructibleBody` - Body with health + respawn.
- `PhysicsBody` - Destructible body affected by physics.
- `DestructibleLadder` - Ladder that can be destroyed temporarily.
- `InteractableBody` - Body that triggers events on interaction.
- `TriggerableBody` - Interactable body triggered by damage.
- `Lever` - Triggerable toggle switch.
- `Bridge` - Destructible one-way platform.
- `ExplodingBarrel` - Physics body that explodes after damage.
- `FlagPlate` - Team flag spawn/capture plate for CTF.
- `SpawnPoint` - Player spawn location selector.

## Game Modes
- `CaptureTheFlagMode` - CTF rules and scoring.
- `ArenaMode` - Arena rules and scoring.
- `KingOfTheHillMode` - KOTH control point rules.
- `GameTestMode` - Sandbox/testing mode.
