import { GRAVITY, JUMP_VELOCITY } from '../core/constants.js';

/**
 * Apply gravity to player (collision handled by Level)
 * @param {Player} player - The player instance
 * @param {number} deltaTime - Time since last frame in seconds
 */
export function applyGravity(player, deltaTime) {
    // Apply gravity to vertical velocity
    player.velocity.y += GRAVITY * deltaTime;

    // Apply velocity to position
    player.position.y += player.velocity.y * deltaTime;

    // Assume not grounded (Level will set to true if on platform)
    player.isGrounded = false;
}

/**
 * Handle jump input for player
 * @param {Player} player - The player instance
 * @param {InputManager} input - The input manager
 */
export function handleJump(player, input) {
    if (input.isJumpPressed() && player.isGrounded) {
        player.velocity.y = JUMP_VELOCITY;
        player.isGrounded = false;
    }
}
