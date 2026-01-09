import { InteractableBody } from './InteractableBody.js';

/**
 * TriggerableBody - Interactable body that also triggers on damage.
 */
export class TriggerableBody extends InteractableBody {
    constructor({
        collisionShape = null,
        movable = false,
        mapKey = null,
        onInteract = null,
        onTrigger = null
    } = {}) {
        super({ collisionShape, movable, mapKey, onInteract });
        this.onTrigger = onTrigger;
        this.isTriggerable = true;
    }

    takeDamage(amount = 1, source = null) {
        if (typeof this.onTrigger === 'function') {
            this.onTrigger({ amount, source, body: this });
        }
    }
}
