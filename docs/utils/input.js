/**
 * Input Manager - Handles keyboard input state
 * @class InputManager
 */
export class InputManager {
    constructor(options = {}) {
        this.keys = {};
        this.mouseButtons = {};
        this.mousePosition = { x: 0, y: 0 };
        this.hasMousePosition = false;
        this.prevActionStates = {};
        this.justPressed = {};
        this.downTapQueued = false;
        const defaultBindings = {
            left: ['ArrowLeft', 'KeyA'],
            right: ['ArrowRight', 'KeyD'],
            jump: ['Space', 'KeyW'],
            down: ['ArrowDown', 'KeyS'],
            ability1: ['Mouse0', 'KeyQ'],
            ability2: ['Mouse2'],
            ability3: ['KeyE'],
            ultimate: ['KeyR'],
            flagDrop: ['KeyF']
        };
        this.bindings = {};
        Object.keys(defaultBindings).forEach((action) => {
            this.bindings[action] = [...defaultBindings[action]];
        });

        if (options.bindings) {
            Object.keys(options.bindings).forEach((action) => {
                this.bindings[action] = [...options.bindings[action]];
            });
        }
        this.rebuildGameKeySet();

        const defaultGamepadBindings = {
            left: ['Axis0-', 'DPadLeft'],
            right: ['Axis0+', 'DPadRight'],
            jump: ['Button0'],
            down: ['Axis1+', 'DPadDown'],
            ability1: ['Button7'],
            ability2: ['Button6'],
            ability3: ['Button5'],
            ultimate: ['Button4'],
            flagDrop: ['DPadDown']
        };
        this.gamepadBindings = {};
        Object.keys(defaultGamepadBindings).forEach((action) => {
            this.gamepadBindings[action] = [...defaultGamepadBindings[action]];
        });

        if (options.gamepadBindings) {
            Object.keys(options.gamepadBindings).forEach((action) => {
                this.gamepadBindings[action] = [...options.gamepadBindings[action]];
            });
        }

        this.gamepadAliases = {
            DPadUp: 'Button12',
            DPadDown: 'Button13',
            DPadLeft: 'Button14',
            DPadRight: 'Button15'
        };
        this.gamepadEnabled = options.gamepadEnabled !== false;
        this.gamepadDeadzone = typeof options.gamepadDeadzone === 'number' ? options.gamepadDeadzone : 0.25;
        this.gamepadIndex = Number.isInteger(options.gamepadIndex) ? options.gamepadIndex : null;
        this.gamepadIndexLocked = options.gamepadIndex !== undefined && options.gamepadIndex !== null;
        this.gamepad = null;

        // Setup keyboard event listeners
        window.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;

            // Prevent default browser behavior for game keys
            if (this.isGameKey(event.code)) {
                event.preventDefault();
            }
            if (!event.repeat && this.isBindingKey('down', event.code)) {
                this.downTapQueued = true;
            }
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });

        // Setup mouse event listeners
        window.addEventListener('mousedown', (event) => {
            this.mouseButtons[event.button] = true;
            this.mousePosition.x = event.clientX;
            this.mousePosition.y = event.clientY;
            this.hasMousePosition = true;
            event.preventDefault(); // Prevent context menu on right-click
        });

        window.addEventListener('mouseup', (event) => {
            this.mouseButtons[event.button] = false;
        });

        window.addEventListener('mousemove', (event) => {
            this.mousePosition.x = event.clientX;
            this.mousePosition.y = event.clientY;
            this.hasMousePosition = true;
        });

        // Prevent context menu
        window.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        // Setup gamepad connection listeners
        window.addEventListener('gamepadconnected', (event) => {
            if (!this.gamepadEnabled) {
                return;
            }
            if (this.gamepadIndex === null && !this.gamepadIndexLocked) {
                this.gamepadIndex = event.gamepad.index;
            }
            console.log(`Gamepad connected: ${event.gamepad.id}`);
        });

        window.addEventListener('gamepaddisconnected', (event) => {
            if (!this.gamepadEnabled) {
                return;
            }
            if (this.gamepadIndex === event.gamepad.index) {
                this.gamepad = null;
                if (!this.gamepadIndexLocked) {
                    this.gamepadIndex = null;
                }
            }
            console.log(`Gamepad disconnected: ${event.gamepad.id}`);
        });
    }

    /**
     * Rebuild cached set of keyboard codes used for default-prevent behavior.
     */
    rebuildGameKeySet() {
        this.gameKeySet = new Set();
        Object.values(this.bindings).forEach((codes) => {
            codes.forEach((code) => {
                if (!code.startsWith('Mouse')) {
                    this.gameKeySet.add(code);
                }
            });
        });
    }

    /**
     * Poll gamepad state (call once per frame)
     */
    update() {
        if (!this.gamepadEnabled) {
            this.gamepad = null;
            this.updateActionStates();
            return;
        }

        if (!navigator.getGamepads) {
            this.gamepad = null;
            this.gamepadIndex = null;
            this.updateActionStates();
            return;
        }

        const pads = navigator.getGamepads();
        if (this.gamepadIndex !== null) {
            const pad = pads[this.gamepadIndex];
            if (pad && pad.connected) {
                this.gamepad = pad;
                this.updateActionStates();
                return;
            }

            this.gamepad = null;
            if (this.gamepadIndexLocked) {
                this.updateActionStates();
                return;
            }
            this.gamepadIndex = null;
        }

        this.gamepad = null;
        for (const pad of pads) {
            if (pad && pad.connected) {
                this.gamepad = pad;
                this.gamepadIndex = pad.index;
                break;
            }
        }
        this.updateActionStates();
    }

    /**
     * Update per-frame action state transitions.
     */
    updateActionStates() {
        const actions = new Set([
            ...Object.keys(this.bindings),
            ...Object.keys(this.gamepadBindings)
        ]);
        actions.forEach((action) => {
            const isPressed = this.isActionPressed(action);
            const wasPressed = this.prevActionStates[action] || false;
            this.justPressed[action] = isPressed && !wasPressed;
            this.prevActionStates[action] = isPressed;
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
     * Check if down key is pressed
     * @returns {boolean}
     */
    isDownPressed() {
        return this.isActionPressed('down');
    }

    /**
     * Check if down key was just pressed this frame
     * @returns {boolean}
     */
    isDownJustPressed() {
        if (this.downTapQueued) {
            this.downTapQueued = false;
            return true;
        }
        return Boolean(this.justPressed && this.justPressed.down);
    }

    /**
     * Check if a keyboard code belongs to a bound action.
     * @param {string} action
     * @param {string} code
     * @returns {boolean}
     */
    isBindingKey(action, code) {
        const codes = this.bindings[action] || [];
        return codes.includes(code);
    }

    /**
     * Check if flag drop key is pressed
     * @returns {boolean}
     */
    isFlagDropPressed() {
        return this.isActionPressed('flagDrop');
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
     * Get latest mouse position in client coordinates.
     * @returns {{x:number,y:number}|null}
     */
    getMousePosition() {
        if (!this.hasMousePosition) return null;
        return { x: this.mousePosition.x, y: this.mousePosition.y };
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
        return this.gameKeySet ? this.gameKeySet.has(keyCode) : false;
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

        const gamepadCodes = this.gamepadBindings[action] || [];
        for (const code of gamepadCodes) {
            if (this.isGamepadPressed(code)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a gamepad input is active
     * @param {string} code
     * @returns {boolean}
     */
    isGamepadPressed(code) {
        const pad = this.gamepad;
        if (!pad || !pad.connected) return false;

        const resolved = this.gamepadAliases[code] || code;
        if (resolved.startsWith('Button')) {
            const index = parseInt(resolved.replace('Button', ''), 10);
            const button = pad.buttons && pad.buttons[index];
            if (!button) return false;
            return button.pressed || button.value > 0.5;
        }

        if (resolved.startsWith('Axis')) {
            const match = resolved.match(/^Axis(\d+)([+-])?$/);
            if (!match) return false;
            const axisIndex = parseInt(match[1], 10);
            const axisValue = pad.axes && pad.axes[axisIndex] ? pad.axes[axisIndex] : 0;
            const direction = match[2];
            if (direction === '+') return axisValue > this.gamepadDeadzone;
            if (direction === '-') return axisValue < -this.gamepadDeadzone;
            return Math.abs(axisValue) > this.gamepadDeadzone;
        }

        return false;
    }

    /**
     * Get right stick axes for aim input.
     * @returns {{x:number,y:number}|null}
     */
    getAimStick() {
        const pad = this.gamepad;
        if (!pad || !pad.connected || !pad.axes) return null;
        const rightX = pad.axes[2] || 0;
        const rightY = pad.axes[3] || 0;
        const rightMagnitude = Math.hypot(rightX, rightY);
        if (rightMagnitude >= this.gamepadDeadzone) {
            return { x: rightX, y: rightY };
        }
        const leftX = pad.axes[0] || 0;
        const leftY = pad.axes[1] || 0;
        const leftMagnitude = Math.hypot(leftX, leftY);
        if (leftMagnitude < this.gamepadDeadzone) return null;
        return { x: leftX, y: leftY };
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
     * Get gamepad bindings for an action
     * @param {string} action
     * @returns {string[]}
     */
    getGamepadBindings(action) {
        return [...(this.gamepadBindings[action] || [])];
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
        this.rebuildGameKeySet();
    }

    /**
     * Set a gamepad binding for an action
     * @param {string} action
     * @param {string} code
     * @param {number} slot
     */
    setGamepadBinding(action, code, slot = 0) {
        Object.keys(this.gamepadBindings).forEach((key) => {
            this.gamepadBindings[key] = this.gamepadBindings[key].filter((existing) => existing !== code);
        });

        if (!this.gamepadBindings[action]) {
            this.gamepadBindings[action] = [];
        }

        if (this.gamepadBindings[action].length < slot + 1) {
            this.gamepadBindings[action].length = slot + 1;
        }

        this.gamepadBindings[action][slot] = code;
        this.gamepadBindings[action] = this.gamepadBindings[action].filter(Boolean);
    }

    /**
     * Clear a binding slot
     * @param {string} action
     * @param {number} slot
     */
    clearBinding(action, slot = 0) {
        if (!this.bindings[action]) return;
        this.bindings[action].splice(slot, 1);
        this.rebuildGameKeySet();
    }

    /**
     * Clear a gamepad binding slot
     * @param {string} action
     * @param {number} slot
     */
    clearGamepadBinding(action, slot = 0) {
        if (!this.gamepadBindings[action]) return;
        this.gamepadBindings[action].splice(slot, 1);
    }
}
