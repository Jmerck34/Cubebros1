import { Body } from './Body.js';

/**
 * BounceBody - Body that bounces the player upward on contact.
 */
export class BounceBody extends Body {
    constructor({
        collisionShape = null,
        movable = false,
        mapKey = null,
        visibilityLayer = 0,
        bounceVelocity = 8
    } = {}) {
        super({ collisionShape, movable: Boolean(movable), mapKey, visibilityLayer });
        this.isBounceBody = true;
        this.bounceVelocity = Number.isFinite(bounceVelocity) ? bounceVelocity : 8;
    }

    applyBounce(player) {
        if (!player || !player.velocity) {
            return false;
        }
        player.velocity.y = this.bounceVelocity;
        player.isGrounded = false;
        return true;
    }
}
