/**
 * Input Manager - Handles keyboard input state
 * @class InputManager
 */
export class InputManager {
    constructor() {
        this.keys = {};
        this.mouseButtons = {};

        // Setup keyboard event listeners
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

        // Setup mouse event listeners
        window.addEventListener('mousedown', (event) => {
            this.mouseButtons[event.button] = true;
            event.preventDefault(); // Prevent context menu on right-click
        });

        window.addEventListener('mouseup', (event) => {
            this.mouseButtons[event.button] = false;
        });

        // Prevent context menu
        window.addEventListener('contextmenu', (event) => {
            event.preventDefault();
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
        return this.isKeyDown('Space') || this.isKeyDown('KeyW');
    }

    /**
     * Check if left mouse button is pressed
     * @returns {boolean}
     */
    isLeftClickPressed() {
        return this.mouseButtons[0] || false; // 0 = left mouse button
    }

    /**
     * Check if right mouse button is pressed
     * @returns {boolean}
     */
    isRightClickPressed() {
        return this.mouseButtons[2] || false; // 2 = right mouse button
    }

    /**
     * Check if ability 1 key is pressed (Left Click or Q)
     * @returns {boolean}
     */
    isAbility1Pressed() {
        return this.isLeftClickPressed() || this.isKeyDown('KeyQ');
    }

    /**
     * Check if ability 2 key is pressed (Right Click)
     * @returns {boolean}
     */
    isAbility2Pressed() {
        return this.isRightClickPressed();
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
