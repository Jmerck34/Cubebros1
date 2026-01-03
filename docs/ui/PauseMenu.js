/**
 * PauseMenu - In-game menu accessible via button in top right
 * @class PauseMenu
 */
export class PauseMenu {
    constructor(onBackToMenu, onResume, input, options = {}) {
        this.onBackToMenu = onBackToMenu;
        this.onResume = onResume;
        this.input = input;
        this.playerIndex = Number.isInteger(options.playerIndex) ? options.playerIndex : null;
        this.showMenuButton = options.showMenuButton !== false;
        this.getViewport = typeof options.getViewport === 'function' ? options.getViewport : null;
        this.isOpen = false;
        this.bindingButtons = new Map();
        this.gamepadBindingButtons = new Map();
        this.pendingGamepadBind = null;
        this.gamepadBindFrame = null;
        this.pendingKeybind = null;
        this.keybindRows = [];
        this.gamepadBindRows = [];
        this.bindFocus = null;
        this.menuButtons = [];
        this.menuFocusIndex = 0;
        this.lastNavTime = 0;
        this.lastPadState = {
            up: false,
            down: false,
            left: false,
            right: false,
            confirm: false,
            back: false,
            start: false
        };

        if (this.showMenuButton) {
            // Create menu button (top right)
            this.createMenuButton();
        }

        // Create pause menu overlay
        this.createPauseMenuOverlay();

        this.resizeHandler = () => this.updateViewportLayout();
        window.addEventListener('resize', this.resizeHandler);
    }

    /**
     * Create the menu button in top right corner
     */
    createMenuButton() {
        this.menuButton = document.createElement('button');
        this.menuButton.textContent = '⚙️';
        this.menuButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: rgba(0, 0, 0, 0.7);
            border: 3px solid #ffffff;
            border-radius: 10px;
            color: white;
            font-size: 32px;
            cursor: pointer;
            z-index: 1000;
            transition: all 0.2s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        `;

        // Hover effects
        this.menuButton.addEventListener('mouseenter', () => {
            this.menuButton.style.background = 'rgba(50, 50, 50, 0.9)';
            this.menuButton.style.transform = 'scale(1.1)';
        });

        this.menuButton.addEventListener('mouseleave', () => {
            this.menuButton.style.background = 'rgba(0, 0, 0, 0.7)';
            this.menuButton.style.transform = 'scale(1)';
        });

        // Click to toggle menu
        this.menuButton.addEventListener('click', () => {
            this.toggle();
        });

        document.body.appendChild(this.menuButton);
    }

    /**
     * Create the pause menu overlay
     */
    createPauseMenuOverlay() {
        // Overlay background
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;

        // Menu container
        this.menuContainer = document.createElement('div');
        this.menuContainer.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 4px solid #ffffff;
            border-radius: 20px;
            padding: 40px;
            min-width: 400px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            text-align: center;
        `;

        // Menu title
        const title = document.createElement('h1');
        title.textContent = this.playerIndex === null ? 'PAUSED' : `P${this.playerIndex + 1} PAUSED`;
        title.style.cssText = `
            color: #ffffff;
            font-size: 48px;
            margin: 0 0 30px 0;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
            font-family: Arial, sans-serif;
        `;

        // Resume button
        this.resumeButton = this.createButton('▶️ Resume', () => {
            this.close();
            if (this.onResume) this.onResume();
        });

        // Back to Menu button
        this.backToMenuButton = this.createButton('🏠 Back to Menu', () => {
            this.close();
            if (this.onBackToMenu) this.onBackToMenu();
        });
        this.backToMenuButton.style.marginTop = '15px';

        // Quit button
        this.quitButton = this.createButton('❌ Quit Game', () => {
            if (confirm('Are you sure you want to quit?')) {
                window.close();
                // If window.close() doesn't work, redirect to blank page
                setTimeout(() => {
                    window.location.href = 'about:blank';
                }, 100);
            }
        });
        this.quitButton.style.marginTop = '15px';
        this.quitButton.style.background = 'linear-gradient(135deg, #8B0000 0%, #DC143C 100%)';

        // Assemble menu
        this.menuContainer.appendChild(title);
        this.menuContainer.appendChild(this.resumeButton);
        this.menuContainer.appendChild(this.backToMenuButton);
        this.menuContainer.appendChild(this.createKeybindToggle());
        this.menuContainer.appendChild(this.createKeybindSection());
        this.menuContainer.appendChild(this.createGamepadBindToggle());
        this.menuContainer.appendChild(this.createGamepadBindSection());
        this.menuContainer.appendChild(this.quitButton);
        this.overlay.appendChild(this.menuContainer);
        document.body.appendChild(this.overlay);
        this.menuButtons = [
            this.resumeButton,
            this.backToMenuButton,
            this.keybindToggle,
            this.gamepadBindToggle,
            this.quitButton
        ];
        this.updateMenuFocus();

        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
                if (this.onResume) this.onResume();
            }
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
                if (this.onResume) this.onResume();
            }
        });
    }

    /**
     * Create a styled button
     * @param {string} text - Button text
     * @param {Function} onClick - Click handler
     * @returns {HTMLButtonElement}
     */
    createButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            width: 100%;
            padding: 15px 30px;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            border: 2px solid #ffffff;
            border-radius: 10px;
            color: white;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            font-family: Arial, sans-serif;
        `;

        // Hover effects
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.4)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
        });

        button.addEventListener('click', onClick);

        return button;
    }

    /**
     * Open the pause menu
     */
    open() {
        this.isOpen = true;
        this.overlay.style.display = 'flex';
        if (this.menuButton) {
            this.menuButton.style.display = 'none';
        }
        this.updateViewportLayout();
        this.refreshKeybindLabels();
        this.refreshGamepadBindLabels();
        this.menuFocusIndex = 0;
        this.updateMenuFocus();
    }

    /**
     * Close the pause menu
     */
    close() {
        this.isOpen = false;
        this.overlay.style.display = 'none';
        if (this.menuButton) {
            this.menuButton.style.display = 'block';
        }
        this.cancelGamepadBinding();
        this.cancelKeybind();
        this.bindFocus = null;
        this.updateBindFocus();
    }

    /**
     * Toggle the pause menu
     */
    toggle() {
        if (this.isOpen) {
            this.close();
            if (this.onResume) this.onResume();
        } else {
            this.open();
        }
    }

    /**
     * Handle controller navigation for the pause menu
     * @param {InputManager|InputManager[]} inputSource
     */
    handleGamepad() {
        if (!this.isOpen) return;
        const activeInput = this.input;
        if (!activeInput || typeof activeInput.isGamepadPressed !== 'function') return;

        const now = performance.now();
        const up = activeInput.isGamepadPressed('DPadUp') || activeInput.isGamepadPressed('Axis1-');
        const down = activeInput.isGamepadPressed('DPadDown') || activeInput.isGamepadPressed('Axis1+');
        const left = activeInput.isGamepadPressed('DPadLeft') || activeInput.isGamepadPressed('Axis0-');
        const right = activeInput.isGamepadPressed('DPadRight') || activeInput.isGamepadPressed('Axis0+');
        const confirm = activeInput.isGamepadPressed('Button0');
        const back = activeInput.isGamepadPressed('Button1');
        const start = activeInput.isGamepadPressed('Button9');

        const activeBindSection = this.isBindSectionOpen();
        if (activeBindSection) {
            if (this.pendingGamepadBind || this.pendingKeybind) {
                if (back && !this.lastPadState.back) {
                    this.cancelGamepadBinding();
                    this.cancelKeybind();
                }
            } else {
                if ((up && !this.lastPadState.up) || (down && !this.lastPadState.down)) {
                    if (now - this.lastNavTime > 150) {
                        this.moveBindFocus(up ? -1 : 1, 0);
                        this.lastNavTime = now;
                    }
                }
                if ((left && !this.lastPadState.left) || (right && !this.lastPadState.right)) {
                    if (now - this.lastNavTime > 150) {
                        this.moveBindFocus(0, left ? -1 : 1);
                        this.lastNavTime = now;
                    }
                }
                if (confirm && !this.lastPadState.confirm && this.bindFocus) {
                    const rows = this.getBindRows(this.bindFocus.section);
                    const button = rows?.[this.bindFocus.row]?.[this.bindFocus.col];
                    if (button) button.click();
                }
                if (back && !this.lastPadState.back) {
                    if (activeBindSection === 'key' && this.keybindSection) {
                        this.keybindSection.style.display = 'none';
                    }
                    if (activeBindSection === 'gamepad' && this.gamepadBindSection) {
                        this.gamepadBindSection.style.display = 'none';
                    }
                    this.bindFocus = null;
                    this.updateBindFocus();
                }
            }
        } else {
        if ((up && !this.lastPadState.up) || (down && !this.lastPadState.down)) {
            if (now - this.lastNavTime > 180) {
                const delta = up ? -1 : 1;
                const count = this.menuButtons.length;
                this.menuFocusIndex = (this.menuFocusIndex + delta + count) % count;
                this.updateMenuFocus();
                this.lastNavTime = now;
            }
        }

        if (confirm && !this.lastPadState.confirm) {
            const target = this.menuButtons[this.menuFocusIndex];
            if (target) target.click();
        }

        if (back && !this.lastPadState.back) {
            this.close();
            if (this.onResume) this.onResume();
        }
        }

        this.lastPadState.up = up;
        this.lastPadState.down = down;
        this.lastPadState.left = left;
        this.lastPadState.right = right;
        this.lastPadState.confirm = confirm;
        this.lastPadState.back = back;
        this.lastPadState.start = start;
    }

    /**
     * Check if menu is open
     * @returns {boolean}
     */
    isPaused() {
        return this.isOpen;
    }

    /**
     * Destroy the menu (cleanup)
     */
    destroy() {
        this.cancelGamepadBinding();
        this.cancelKeybind();
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        if (this.menuButton && this.menuButton.parentNode) {
            this.menuButton.parentNode.removeChild(this.menuButton);
        }
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
    }

    updateMenuFocus() {
        this.menuButtons.forEach((button, index) => {
            if (!button) return;
            if (index === this.menuFocusIndex) {
                button.style.outline = '3px solid #ffd166';
                button.style.outlineOffset = '2px';
            } else {
                button.style.outline = 'none';
                button.style.outlineOffset = '0';
            }
        });
    }

    /**
     * Create keybinds section
     * @returns {HTMLDivElement}
     */
    createKeybindSection() {
        const container = document.createElement('div');
        container.style.cssText = `
            margin-top: 25px;
            padding-top: 20px;
            border-top: 2px solid rgba(255, 255, 255, 0.2);
            text-align: left;
            display: none;
        `;
        this.keybindSection = container;

        const title = document.createElement('h2');
        title.textContent = 'Keybinds';
        title.style.cssText = `
            color: #ffffff;
            font-size: 22px;
            margin: 0 0 15px 0;
            font-family: Arial, sans-serif;
        `;
        container.appendChild(title);

        const actions = [
            { key: 'left', label: 'Move Left' },
            { key: 'right', label: 'Move Right' },
            { key: 'jump', label: 'Jump' },
            { key: 'ability1', label: 'Ability 1' },
            { key: 'ability2', label: 'Ability 2' },
            { key: 'ability3', label: 'Ability 3' },
            { key: 'ultimate', label: 'Ultimate' }
        ];

        this.keybindRows = [];
        this.gamepadBindRows = [];
        actions.forEach((action) => {
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin: 8px 0;
            `;

            const label = document.createElement('div');
            label.textContent = action.label;
            label.style.cssText = `
                color: #ccc;
                font-size: 16px;
                min-width: 120px;
                font-family: Arial, sans-serif;
            `;

            const bindButton = this.createBindButton(action.key, 0);
            const altButton = this.createBindButton(action.key, 1);
            const clearButton = this.createSmallButton('Clear', () => {
                if (!this.input) return;
                this.input.clearBinding(action.key, 0);
                this.input.clearBinding(action.key, 1);
                this.refreshKeybindLabels();
            });

            row.appendChild(label);
            row.appendChild(bindButton);
            row.appendChild(altButton);
            row.appendChild(clearButton);
            container.appendChild(row);
            this.keybindRows.push([bindButton, altButton, clearButton]);
        });

        return container;
    }

    /**
     * Create a toggle button for keybinds
     */
    createKeybindToggle() {
        this.keybindToggle = this.createButton('⌨️ Keybinds', () => {
            if (!this.keybindSection) return;
            const isOpen = this.keybindSection.style.display !== 'none';
            this.keybindSection.style.display = isOpen ? 'none' : 'block';
            if (!isOpen && this.gamepadBindSection) {
                this.gamepadBindSection.style.display = 'none';
            }
            if (!isOpen) {
                this.refreshKeybindLabels();
                this.setBindFocus('key', 0, 0);
            } else {
                this.bindFocus = null;
                this.updateBindFocus();
            }
        });
        this.keybindToggle.style.marginTop = '15px';
        this.keybindToggle.style.background = 'linear-gradient(135deg, #3a6ea5 0%, #2b5a88 100%)';
        return this.keybindToggle;
    }

    /**
     * Create controller bind toggle
     */
    createGamepadBindToggle() {
        this.gamepadBindToggle = this.createButton('🎮 Controller Binds', () => {
            if (!this.gamepadBindSection) return;
            const isOpen = this.gamepadBindSection.style.display !== 'none';
            this.gamepadBindSection.style.display = isOpen ? 'none' : 'block';
            if (!isOpen && this.keybindSection) {
                this.keybindSection.style.display = 'none';
            }
            if (!isOpen) {
                this.refreshGamepadBindLabels();
                this.setBindFocus('gamepad', 0, 0);
            } else {
                this.bindFocus = null;
                this.updateBindFocus();
            }
        });
        this.gamepadBindToggle.style.marginTop = '15px';
        this.gamepadBindToggle.style.background = 'linear-gradient(135deg, #3a6ea5 0%, #2b5a88 100%)';
        return this.gamepadBindToggle;
    }

    /**
     * Create controller bind section
     * @returns {HTMLDivElement}
     */
    createGamepadBindSection() {
        const container = document.createElement('div');
        container.style.cssText = `
            margin-top: 15px;
            padding-top: 20px;
            border-top: 2px solid rgba(255, 255, 255, 0.2);
            text-align: left;
            display: none;
        `;
        this.gamepadBindSection = container;

        const title = document.createElement('h2');
        title.textContent = 'Controller Binds';
        title.style.cssText = `
            color: #ffffff;
            font-size: 22px;
            margin: 0 0 15px 0;
            font-family: Arial, sans-serif;
        `;
        container.appendChild(title);

        const actions = [
            { key: 'left', label: 'Move Left' },
            { key: 'right', label: 'Move Right' },
            { key: 'jump', label: 'Jump' },
            { key: 'ability1', label: 'Ability 1' },
            { key: 'ability2', label: 'Ability 2' },
            { key: 'ability3', label: 'Ability 3' },
            { key: 'ultimate', label: 'Ultimate' },
            { key: 'flagDrop', label: 'Drop Flag' }
        ];

        actions.forEach((action) => {
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin: 8px 0;
            `;

            const label = document.createElement('div');
            label.textContent = action.label;
            label.style.cssText = `
                color: #ccc;
                font-size: 16px;
                min-width: 120px;
                font-family: Arial, sans-serif;
            `;

            const bindButton = this.createGamepadBindButton(action.key, 0);
            const altButton = this.createGamepadBindButton(action.key, 1);
            const clearButton = this.createSmallButton('Clear', () => {
                if (!this.input) return;
                this.input.clearGamepadBinding(action.key, 0);
                this.input.clearGamepadBinding(action.key, 1);
                this.refreshGamepadBindLabels();
            });

            row.appendChild(label);
            row.appendChild(bindButton);
            row.appendChild(altButton);
            row.appendChild(clearButton);
            container.appendChild(row);
            this.gamepadBindRows.push([bindButton, altButton, clearButton]);
        });

        return container;
    }

    /**
     * Create a keybind button
     */
    createBindButton(action, slot) {
        const button = this.createSmallButton('Unbound', () => {
            this.beginBinding(action, slot, button);
        });
        this.bindingButtons.set(`${action}:${slot}`, button);
        return button;
    }

    /**
     * Create a controller bind button
     */
    createGamepadBindButton(action, slot) {
        const button = this.createSmallButton('Unbound', () => {
            this.beginGamepadBinding(action, slot, button);
        });
        this.gamepadBindingButtons.set(`${action}:${slot}`, button);
        return button;
    }

    /**
     * Create a small UI button
     */
    createSmallButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            padding: 6px 10px;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.4);
            border-radius: 8px;
            color: white;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            font-family: Arial, sans-serif;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });

        button.addEventListener('click', onClick);
        return button;
    }

    /**
     * Begin listening for a new binding
     */
    beginBinding(action, slot, button) {
        if (!this.input) return;

        this.cancelKeybind();
        button.textContent = 'Press key...';

        const onKey = (event) => {
            event.preventDefault();
            if (event.code === 'Escape') {
                this.refreshKeybindLabels();
                this.cancelKeybind();
                return;
            }
            this.input.setBinding(action, event.code, slot);
            this.refreshKeybindLabels();
            this.cancelKeybind();
        };

        const onMouse = (event) => {
            event.preventDefault();
            const code = `Mouse${event.button}`;
            this.input.setBinding(action, code, slot);
            this.refreshKeybindLabels();
            this.cancelKeybind();
        };

        window.addEventListener('keydown', onKey, true);
        window.addEventListener('mousedown', onMouse, true);
        this.pendingKeybind = { onKey, onMouse };
    }

    cancelKeybind() {
        if (!this.pendingKeybind) return;
        window.removeEventListener('keydown', this.pendingKeybind.onKey, true);
        window.removeEventListener('mousedown', this.pendingKeybind.onMouse, true);
        this.pendingKeybind = null;
        this.refreshKeybindLabels();
    }

    /**
     * Begin listening for a new controller binding
     */
    beginGamepadBinding(action, slot, button) {
        if (!this.input) return;

        this.cancelGamepadBinding();
        this.pendingGamepadBind = { action, slot, button };
        button.textContent = 'Press button...';
        const snapshot = this.captureGamepadSnapshot();

        const poll = () => {
            if (!this.pendingGamepadBind) return;
            const next = this.captureGamepadSnapshot();
            const pressed = this.findNewGamepadPress(snapshot, next);
            if (pressed) {
                this.input.setGamepadBinding(action, pressed, slot);
                this.refreshGamepadBindLabels();
                this.cancelGamepadBinding();
                return;
            }
            this.gamepadBindFrame = requestAnimationFrame(poll);
        };

        this.gamepadBindFrame = requestAnimationFrame(poll);
    }

    captureGamepadSnapshot() {
        const pad = this.input && this.input.gamepad;
        if (!pad || !pad.connected) return null;
        return {
            buttons: pad.buttons.map((btn) => btn.pressed || btn.value > 0.5),
            axes: pad.axes.slice()
        };
    }

    findNewGamepadPress(prev, next) {
        if (!next) return null;
        const deadzone = this.input?.gamepadDeadzone ?? 0.25;
        const prevButtons = prev?.buttons || [];
        for (let i = 0; i < next.buttons.length; i++) {
            if (next.buttons[i] && !prevButtons[i]) {
                if (i === 12) return 'DPadUp';
                if (i === 13) return 'DPadDown';
                if (i === 14) return 'DPadLeft';
                if (i === 15) return 'DPadRight';
                return `Button${i}`;
            }
        }

        const prevAxes = prev?.axes || [];
        for (let i = 0; i < next.axes.length; i++) {
            const value = next.axes[i] || 0;
            const prevValue = prevAxes[i] || 0;
            if (Math.abs(value) > deadzone && Math.abs(prevValue) <= deadzone) {
                return value > 0 ? `Axis${i}+` : `Axis${i}-`;
            }
        }
        return null;
    }

    cancelGamepadBinding() {
        if (this.gamepadBindFrame) {
            cancelAnimationFrame(this.gamepadBindFrame);
            this.gamepadBindFrame = null;
        }
        const hadPending = Boolean(this.pendingGamepadBind);
        this.pendingGamepadBind = null;
        if (hadPending) {
            this.refreshGamepadBindLabels();
        }
    }

    /**
     * Refresh keybind labels from current bindings
     */
    refreshKeybindLabels() {
        if (!this.input) return;
        for (const [key, button] of this.bindingButtons.entries()) {
            const [action, slotStr] = key.split(':');
            const slot = Number(slotStr);
            const bindings = this.input.getBindings(action);
            const code = bindings[slot] || 'Unbound';
            button.textContent = this.formatBinding(code);
        }
    }

    /**
     * Refresh controller bind labels from current bindings
     */
    refreshGamepadBindLabels() {
        if (!this.input) return;
        for (const [key, button] of this.gamepadBindingButtons.entries()) {
            const [action, slotStr] = key.split(':');
            const slot = Number(slotStr);
            const bindings = this.input.getGamepadBindings(action);
            const code = bindings[slot] || 'Unbound';
            button.textContent = this.formatGamepadBinding(code);
        }
    }

    /**
     * Format binding code for display
     */
    formatBinding(code) {
        if (!code || code === 'Unbound') return 'Unbound';
        if (code.startsWith('Mouse')) {
            const btn = code.replace('Mouse', '');
            if (btn === '0') return 'Mouse L';
            if (btn === '1') return 'Mouse M';
            if (btn === '2') return 'Mouse R';
            return `Mouse ${btn}`;
        }
        if (code.startsWith('Key')) return code.replace('Key', '');
        if (code.startsWith('Arrow')) return code.replace('Arrow', '');
        return code;
    }

    /**
     * Format controller binding code for display
     */
    formatGamepadBinding(code) {
        if (!code || code === 'Unbound') return 'Unbound';
        const buttonLabels = {
            Button0: 'A',
            Button1: 'B',
            Button2: 'X',
            Button3: 'Y',
            Button4: 'LB',
            Button5: 'RB',
            Button6: 'LT',
            Button7: 'RT',
            Button8: 'Back',
            Button9: 'Start',
            Button10: 'LS',
            Button11: 'RS',
            DPadUp: 'D-Pad Up',
            DPadDown: 'D-Pad Down',
            DPadLeft: 'D-Pad Left',
            DPadRight: 'D-Pad Right'
        };
        if (buttonLabels[code]) return buttonLabels[code];
        if (code.startsWith('Axis')) {
            const match = code.match(/^Axis(\d+)([+-])$/);
            if (!match) return code;
            const axisIndex = Number(match[1]);
            const dir = match[2] === '+' ? '+' : '-';
            const axisNames = ['LX', 'LY', 'RX', 'RY'];
            const axisName = axisNames[axisIndex] || `Axis${axisIndex}`;
            return `${axisName}${dir}`;
        }
        return code;
    }

    isBindSectionOpen() {
        const keyOpen = this.keybindSection && this.keybindSection.style.display !== 'none';
        const padOpen = this.gamepadBindSection && this.gamepadBindSection.style.display !== 'none';
        if (keyOpen) return 'key';
        if (padOpen) return 'gamepad';
        return null;
    }

    getBindRows(section) {
        return section === 'gamepad' ? this.gamepadBindRows : this.keybindRows;
    }

    setBindFocus(section, row, col) {
        const rows = this.getBindRows(section);
        if (!rows || rows.length === 0) return;
        const safeRow = Math.max(0, Math.min(row, rows.length - 1));
        const safeCol = Math.max(0, Math.min(col, rows[safeRow].length - 1));
        this.bindFocus = { section, row: safeRow, col: safeCol };
        this.updateBindFocus();
    }

    moveBindFocus(deltaRow, deltaCol) {
        if (!this.bindFocus) return;
        const rows = this.getBindRows(this.bindFocus.section);
        if (!rows || rows.length === 0) return;
        let nextRow = this.bindFocus.row + deltaRow;
        let nextCol = this.bindFocus.col + deltaCol;
        if (nextRow < 0) nextRow = rows.length - 1;
        if (nextRow >= rows.length) nextRow = 0;
        const maxCol = rows[nextRow].length - 1;
        if (nextCol < 0) nextCol = maxCol;
        if (nextCol > maxCol) nextCol = 0;
        this.setBindFocus(this.bindFocus.section, nextRow, nextCol);
    }

    updateBindFocus() {
        const apply = (rows, isActive) => {
            rows.forEach((rowButtons, rowIndex) => {
                rowButtons.forEach((button, colIndex) => {
                    if (!button) return;
                    if (isActive && this.bindFocus && this.bindFocus.row === rowIndex && this.bindFocus.col === colIndex) {
                        button.style.outline = '3px solid #ffd166';
                        button.style.outlineOffset = '2px';
                    } else {
                        button.style.outline = 'none';
                        button.style.outlineOffset = '0';
                    }
                });
            });
        };

        apply(this.keybindRows, this.bindFocus?.section === 'key');
        apply(this.gamepadBindRows, this.bindFocus?.section === 'gamepad');
    }

    updateViewportLayout() {
        if (!this.overlay || !this.getViewport) {
            return;
        }
        const viewport = this.getViewport();
        if (!viewport) return;
        this.overlay.style.left = `${viewport.x}px`;
        this.overlay.style.top = `${viewport.y}px`;
        this.overlay.style.width = `${viewport.width}px`;
        this.overlay.style.height = `${viewport.height}px`;
    }
}
