import { GRAVITY, JUMP_VELOCITY } from '../core/constants.js';

/**
 * Apply gravity to player (collision handled by Level)
 * @param {Player} player - The player instance
 * @param {number} deltaTime - Time since last frame in seconds
 */
export function applyGravity(player, deltaTime) {
    // Apply debug gravity multiplier if available
    const gravityMultiplier = player.debugPhysics ? player.debugPhysics.gravityMultiplier : 1.0;

    // Apply gravity to vertical velocity unless temporarily suppressed.
    const now = Date.now();
    if (!player.ignoreGravityUntil || now >= player.ignoreGravityUntil) {
        player.velocity.y += GRAVITY * gravityMultiplier * deltaTime;
    }

    // Apply velocity to position
    player.position.y += player.velocity.y * deltaTime;

    // Assume not grounded (Level will set to true if on platform)
    player.isGrounded = false;
}

/**
 * Handle jump input for player (with double jump)
 * @param {Player} player - The player instance
 * @param {InputManager} input - The input manager
 */
export function handleJump(player, input) {
    const jumpPressed = input.isJumpPressed();
    if (player.jumpDisabled) {
        player.jumpKeyWasPressed = jumpPressed;
        return;
    }

    // Reset jumps when grounded
    if (player.isGrounded) {
        const maxJumps = Number.isFinite(player.maxJumps) ? player.maxJumps : 2;
        player.jumpsRemaining = maxJumps;
    }

    // Apply debug jump force multiplier if available
    const jumpMultiplier = player.debugPhysics ? player.debugPhysics.jumpForceMultiplier : 1.0;

    // Handle jump with key press detection to prevent spam
    if (jumpPressed && !player.jumpKeyWasPressed && player.jumpsRemaining > 0) {
        if (typeof player.playJumpSound === 'function') {
            player.playJumpSound();
        }
        if ('landSoundReady' in player) {
            player.landSoundReady = true;
        }
        if (typeof player.setFallDamageGrace === 'function') {
            player.setFallDamageGrace(0.35);
        }
        player.velocity.y = JUMP_VELOCITY * jumpMultiplier;
        player.jumpsRemaining--;
        player.isGrounded = false;

        // Log which jump this is
        if (player.jumpsRemaining === 1) {
            console.log('First jump!');
        } else if (player.jumpsRemaining === 0) {
            console.log('Double jump!');
        }
    }

    // Track key state for next frame
    player.jumpKeyWasPressed = jumpPressed;
}
