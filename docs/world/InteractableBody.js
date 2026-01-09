import { Body } from './Body.js';

/**
 * InteractableBody - Body that can trigger an event on player interaction.
 */
export class InteractableBody extends Body {
    constructor({ collisionShape = null, movable = false, mapKey = null, onInteract = null } = {}) {
        super({ collisionShape, movable, mapKey });
        this.onInteract = onInteract;
        this.isInteractable = true;
    }

    interact(player) {
        if (typeof this.onInteract === 'function') {
            this.onInteract(player, this);
        }
    }
}
