/**
 * Input Manager - Handles keyboard input state
 * @class InputManager
 */
export class InputManager {
    constructor() {
        this.keys = {};
        this.mouseButtons = {};
        this.bindings = {
            left: ['ArrowLeft', 'KeyA'],
            right: ['ArrowRight', 'KeyD'],
            jump: ['Space', 'KeyW'],
            ability1: ['Mouse0', 'KeyQ'],
            ability2: ['Mouse2'],
            ability3: ['KeyE'],
            ultimate: ['KeyR']
        };

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
        return this.isActionPressed('left');
    }

    /**
     * Check if right movement key is pressed
     * @returns {boolean}
     */
    isRightPressed() {
        return this.isActionPressed('right');
    }

    /**
     * Check if jump key is pressed
     * @returns {boolean}
     */
    isJumpPressed() {
        return this.isActionPressed('jump');
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
        return this.isActionPressed('ability1');
    }

    /**
     * Check if ability 2 key is pressed (Right Click)
     * @returns {boolean}
     */
    isAbility2Pressed() {
        return this.isActionPressed('ability2');
    }

    /**
     * Check if ability 3 key is pressed (E)
     * @returns {boolean}
     */
    isAbility3Pressed() {
        return this.isActionPressed('ability3');
    }

    /**
     * Check if ultimate key is pressed (R)
     * @returns {boolean}
     */
    isUltimatePressed() {
        return this.isActionPressed('ultimate');
    }

    /**
     * Check if a key code should prevent default browser behavior
     * @param {string} keyCode
     * @returns {boolean}
     */
    isGameKey(keyCode) {
        const boundKeys = new Set();
        Object.values(this.bindings).forEach((codes) => {
            codes.forEach((code) => {
                if (!code.startsWith('Mouse')) {
                    boundKeys.add(code);
                }
            });
        });
        return boundKeys.has(keyCode);
    }

    /**
     * Check if a bound action is pressed
     * @param {string} action
     * @returns {boolean}
     */
    isActionPressed(action) {
        const codes = this.bindings[action] || [];
        for (const code of codes) {
            if (code.startsWith('Mouse')) {
                const button = parseInt(code.replace('Mouse', ''), 10);
                if (this.mouseButtons[button]) {
                    return true;
                }
            } else if (this.isKeyDown(code)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get bindings for an action
     * @param {string} action
     * @returns {string[]}
     */
    getBindings(action) {
        return [...(this.bindings[action] || [])];
    }

    /**
     * Set a binding for an action
     * @param {string} action
     * @param {string} code
     * @param {number} slot
     */
    setBinding(action, code, slot = 0) {
        // Remove this code from all actions first
        Object.keys(this.bindings).forEach((key) => {
            this.bindings[key] = this.bindings[key].filter((existing) => existing !== code);
        });

        if (!this.bindings[action]) {
            this.bindings[action] = [];
        }

        if (this.bindings[action].length < slot + 1) {
            this.bindings[action].length = slot + 1;
        }

        this.bindings[action][slot] = code;
        this.bindings[action] = this.bindings[action].filter(Boolean);
    }

    /**
     * Clear a binding slot
     * @param {string} action
     * @param {number} slot
     */
    clearBinding(action, slot = 0) {
        if (!this.bindings[action]) return;
        this.bindings[action].splice(slot, 1);
    }
}
