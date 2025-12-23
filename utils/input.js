/**
 * Input Manager - Handles keyboard input state
 * @class InputManager
 */
export class InputManager {
    constructor() {
        this.keys = {};

        // Setup event listeners
        window.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;

            // Prevent default browser behavior for game keys
            if (this.isGameKey(event.code)) {
                event.preventDefault();
            }
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
    }

    /**
     * Check if a specific key is currently pressed
     * @param {string} keyCode - The key code to check (e.g., 'Space', 'ArrowLeft')
     * @returns {boolean}
     */
    isKeyDown(keyCode) {
        return this.keys[keyCode] || false;
    }

    /**
     * Check if left movement key is pressed
     * @returns {boolean}
     */
    isLeftPressed() {
        return this.isKeyDown('ArrowLeft') || this.isKeyDown('KeyA');
    }

    /**
     * Check if right movement key is pressed
     * @returns {boolean}
     */
    isRightPressed() {
        return this.isKeyDown('ArrowRight') || this.isKeyDown('KeyD');
    }

    /**
     * Check if jump key is pressed
     * @returns {boolean}
     */
    isJumpPressed() {
        return this.isKeyDown('Space');
    }

    /**
     * Check if ability 1 key is pressed (Q)
     * @returns {boolean}
     */
    isAbility1Pressed() {
        return this.isKeyDown('KeyQ');
    }

    /**
     * Check if ability 2 key is pressed (W)
     * @returns {boolean}
     */
    isAbility2Pressed() {
        return this.isKeyDown('KeyW');
    }

    /**
     * Check if ability 3 key is pressed (E)
     * @returns {boolean}
     */
    isAbility3Pressed() {
        return this.isKeyDown('KeyE');
    }

    /**
     * Check if ultimate key is pressed (R)
     * @returns {boolean}
     */
    isUltimatePressed() {
        return this.isKeyDown('KeyR');
    }

    /**
     * Check if a key code should prevent default browser behavior
     * @param {string} keyCode
     * @returns {boolean}
     */
    isGameKey(keyCode) {
        const gameKeys = [
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS',
            'KeyQ', 'KeyE', 'KeyR' // Ability keys
        ];
        return gameKeys.includes(keyCode);
    }
}
