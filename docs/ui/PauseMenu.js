/**
 * PauseMenu - In-game menu accessible via button in top right
 * @class PauseMenu
 */
export class PauseMenu {
    constructor(onBackToMenu, onResume, input) {
        this.onBackToMenu = onBackToMenu;
        this.onResume = onResume;
        this.input = input;
        this.isOpen = false;
        this.bindingButtons = new Map();

        // Create menu button (top right)
        this.createMenuButton();

        // Create pause menu overlay
        this.createPauseMenuOverlay();
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
        title.textContent = 'PAUSED';
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
        this.menuContainer.appendChild(this.quitButton);
        this.overlay.appendChild(this.menuContainer);
        document.body.appendChild(this.overlay);

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
        this.menuButton.style.display = 'none';
        this.refreshKeybindLabels();
    }

    /**
     * Close the pause menu
     */
    close() {
        this.isOpen = false;
        this.overlay.style.display = 'none';
        this.menuButton.style.display = 'block';
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
        if (this.menuButton && this.menuButton.parentNode) {
            this.menuButton.parentNode.removeChild(this.menuButton);
        }
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
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
            if (!isOpen) {
                this.refreshKeybindLabels();
            }
        });
        this.keybindToggle.style.marginTop = '15px';
        this.keybindToggle.style.background = 'linear-gradient(135deg, #3a6ea5 0%, #2b5a88 100%)';
        return this.keybindToggle;
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

        button.textContent = 'Press key...';

        const onKey = (event) => {
            event.preventDefault();
            if (event.code === 'Escape') {
                this.refreshKeybindLabels();
                cleanup();
                return;
            }
            this.input.setBinding(action, event.code, slot);
            this.refreshKeybindLabels();
            cleanup();
        };

        const onMouse = (event) => {
            event.preventDefault();
            const code = `Mouse${event.button}`;
            this.input.setBinding(action, code, slot);
            this.refreshKeybindLabels();
            cleanup();
        };

        const cleanup = () => {
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('mousedown', onMouse, true);
        };

        window.addEventListener('keydown', onKey, true);
        window.addEventListener('mousedown', onMouse, true);
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
}
