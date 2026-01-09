import { TriggerableBody } from './TriggerableBody.js';

/**
 * Lever - Toggleable trigger body with on/off state.
 */
export class Lever extends TriggerableBody {
    constructor({
        collisionShape = null,
        movable = false,
        mapKey = null,
        onInteract = null,
        onTrigger = null,
        onToggle = null,
        isOn = false
    } = {}) {
        super({ collisionShape, movable, mapKey, onInteract, onTrigger });
        this.isLever = true;
        this.isOn = Boolean(isOn);
        this.onToggle = onToggle;
    }

    toggle(source = null) {
        this.isOn = !this.isOn;
        if (typeof this.onToggle === 'function') {
            this.onToggle(this.isOn, source, this);
        }
    }

    interact(player) {
        super.interact(player);
        this.toggle(player);
    }

    takeDamage(amount = 1, source = null) {
        super.takeDamage(amount, source);
        this.toggle(source);
    }
}
