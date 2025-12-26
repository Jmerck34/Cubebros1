/**
 * DebugMenu - Developer menu for testing and balancing
 * Activated with "=" key
 * @class DebugMenu
 */
export class DebugMenu {
    constructor(player, pauseMenu = null) {
        this.player = player;
        this.pauseMenu = pauseMenu; // Reference to pause menu to trigger pause
        this.isOpen = false;

        // Global physics multipliers (persist across hero switches)
        this.globalPhysics = {
            moveSpeedMultiplier: 1.0,
            gravityMultiplier: 1.0,
            jumpForceMultiplier: 1.0
        };
        this.globalHitbox = {
            enabled: false,
            playerScaleX: 1.0,
            playerScaleY: 1.0,
            enemyScaleX: 1.0,
            enemyScaleY: 1.0
        };

        this.createDebugMenuOverlay();
        this.setupKeyboardListener();
    }

    /**
     * Create the debug menu button (small "=" in top left)
     */
    createMenuButton() {
        this.menuButton = document.createElement('button');
        this.menuButton.textContent = '=';
        this.menuButton.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            width: 40px;
            height: 40px;
            background: rgba(0, 0, 0, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 5px;
            color: white;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            z-index: 1000;
            transition: all 0.2s;
            font-family: monospace;
        `;

        this.menuButton.addEventListener('mouseenter', () => {
            this.menuButton.style.background = 'rgba(50, 50, 50, 0.7)';
            this.menuButton.style.transform = 'scale(1.1)';
        });

        this.menuButton.addEventListener('mouseleave', () => {
            this.menuButton.style.background = 'rgba(0, 0, 0, 0.5)';
            this.menuButton.style.transform = 'scale(1)';
        });

        this.menuButton.addEventListener('click', () => {
            this.toggle();
        });

        document.body.appendChild(this.menuButton);
    }

    /**
     * Create the debug menu overlay
     */
    createDebugMenuOverlay() {
        // Overlay background (semi-transparent)
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
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
            padding: 30px;
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;

        // Title
        const title = document.createElement('h1');
        title.textContent = '⚙️ DEBUG MENU';
        title.style.cssText = `
            color: #ffffff;
            font-size: 36px;
            margin: 0 0 20px 0;
            text-align: center;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
            font-family: Arial, sans-serif;
        `;

        const subtitle = document.createElement('p');
        subtitle.textContent = 'Press = or ESC to close • Game is PAUSED';
        subtitle.style.cssText = `
            color: #ffdd00;
            font-size: 14px;
            text-align: center;
            margin: -10px 0 20px 0;
            font-family: Arial, sans-serif;
            font-weight: bold;
        `;

        // Content container
        this.contentContainer = document.createElement('div');

        // Assemble menu
        this.menuContainer.appendChild(title);
        this.menuContainer.appendChild(subtitle);
        this.menuContainer.appendChild(this.contentContainer);
        this.overlay.appendChild(this.menuContainer);
        document.body.appendChild(this.overlay);

        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Populate content
        this.populateMenu();
    }

    /**
     * Populate menu with controls
     */
    populateMenu() {
        this.contentContainer.innerHTML = '';

        // Health Section
        this.addSection('❤️ Health');
        this.addNumberControl('Current Health', this.player.currentHealth, 0, this.player.maxHealth, 10, (value) => {
            this.player.currentHealth = value;
            this.player.healthBar.setHealth(value);
            console.log(`[Debug] Current Health set to ${value}`);
        });
        this.addNumberControl('Max Health', this.player.maxHealth, 50, 500, 10, (value) => {
            this.player.maxHealth = value;
            if (this.player.currentHealth > value) {
                this.player.currentHealth = value;
            }
            this.player.healthBar.setHealth(this.player.currentHealth);
            console.log(`[Debug] Max Health set to ${value}`);
        });

        // Physics Section
        this.addSection('🏃 Physics');
        this.addNumberControl('Move Speed Multiplier', this.globalPhysics.moveSpeedMultiplier, 0.1, 3.0, 0.1, (value) => {
            this.globalPhysics.moveSpeedMultiplier = value;
            console.log(`[Debug] Move Speed multiplier: ${this.globalPhysics.moveSpeedMultiplier.toFixed(2)}x`);
        }, 'x');
        this.addNumberControl('Gravity Multiplier', this.globalPhysics.gravityMultiplier, 0.1, 3.0, 0.1, (value) => {
            this.globalPhysics.gravityMultiplier = value;
            console.log(`[Debug] Gravity multiplier: ${this.globalPhysics.gravityMultiplier.toFixed(2)}x`);
        }, 'x');
        this.addNumberControl('Jump Force Multiplier', this.globalPhysics.jumpForceMultiplier, 0.1, 3.0, 0.1, (value) => {
            this.globalPhysics.jumpForceMultiplier = value;
            console.log(`[Debug] Jump Force multiplier: ${this.globalPhysics.jumpForceMultiplier.toFixed(2)}x`);
        }, 'x');

        // Hitbox Section
        this.addSection('📦 Hitboxes');
        this.addToggle('Show Hitboxes', this.globalHitbox.enabled, (checked) => {
            this.globalHitbox.enabled = checked;
            this.applyHitboxSettings();
        });
        this.addNumberControl('Player Hitbox Width', this.globalHitbox.playerScaleX, 0.5, 2.5, 0.05, (value) => {
            this.globalHitbox.playerScaleX = value;
            this.applyHitboxSettings();
        }, 'x');
        this.addNumberControl('Player Hitbox Height', this.globalHitbox.playerScaleY, 0.5, 2.5, 0.05, (value) => {
            this.globalHitbox.playerScaleY = value;
            this.applyHitboxSettings();
        }, 'x');
        this.addNumberControl('Enemy Hitbox Width', this.globalHitbox.enemyScaleX, 0.5, 2.5, 0.05, (value) => {
            this.globalHitbox.enemyScaleX = value;
            this.applyHitboxSettings();
        }, 'x');
        this.addNumberControl('Enemy Hitbox Height', this.globalHitbox.enemyScaleY, 0.5, 2.5, 0.05, (value) => {
            this.globalHitbox.enemyScaleY = value;
            this.applyHitboxSettings();
        }, 'x');

        // Abilities Section (only if player has abilities)
        if (this.player.abilitiesList && this.player.abilitiesList.length > 0) {
            this.addSection('✨ Abilities');

            // Get ability names
            const abilityNames = this.getAbilityNames();

            this.player.abilitiesList.forEach((ability, index) => {
                if (ability) {
                    const abilityKey = ['Q', 'W', 'E', 'R'][index];
                    const abilityName = abilityNames[index] || `Ability ${abilityKey}`;

                    this.addAbilityControls(abilityKey, abilityName, ability, index);
                }
            });
        }
    }

    /**
     * Get ability names for current player
     */
    getAbilityNames() {
        const heroName = this.player.constructor.name;

        const abilityMap = {
            'Cyborg': ['Fireball', 'Freeze Blast', 'Bubble Shield', 'Kame Hame Ha'],
            'Warlock': ['Lightning Strike', 'Fear', 'Hover', 'Mind Control'],
            'Warrior': ['Sword Slash', 'Shield Bash', 'Dash', 'Whirlwind'],
            'Assassin': ['Dagger Combo', 'Poison Bomb', 'Shadow Walk', 'Assassinate'],
            'Archer': ['Shoot Arrow', 'Healing Potion', 'Teleport Arrow', 'Machine Bow']
        };

        return abilityMap[heroName] || ['A1', 'A2', 'A3', 'Ultimate'];
    }

    /**
     * Add ability controls (damage multiplier, cooldown multiplier, reset button)
     */
    addAbilityControls(key, name, ability, index) {
        // Ability header
        const header = document.createElement('div');
        header.style.cssText = `
            color: #ffdd00;
            font-size: 16px;
            font-weight: bold;
            margin: 15px 0 8px 0;
            font-family: Arial, sans-serif;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding-bottom: 5px;
        `;
        header.textContent = `${key} - ${name}`;
        this.contentContainer.appendChild(header);

        // Damage Multiplier
        this.addNumberControl(`  Damage Multiplier`, ability.damageMultiplier, 0, 5.0, 0.25, (value) => {
            ability.damageMultiplier = value;
            console.log(`[Debug] ${name} damage multiplier: ${ability.damageMultiplier.toFixed(2)}x`);
        }, 'x');

        // Cooldown Speed Multiplier
        this.addNumberControl(`  Cooldown Speed`, ability.cooldownMultiplier, 0.1, 5.0, 0.25, (value) => {
            ability.cooldownMultiplier = value;
            console.log(`[Debug] ${name} cooldown speed: ${ability.cooldownMultiplier.toFixed(2)}x`);
        }, 'x');

        // Reset Cooldown Button
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            margin: 8px 0;
            padding-left: 10px;
        `;

        const resetButton = document.createElement('button');
        resetButton.textContent = `Reset ${key} Cooldown`;
        resetButton.style.cssText = `
            padding: 8px 15px;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            border: 2px solid #ffffff;
            border-radius: 5px;
            color: white;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            font-family: Arial, sans-serif;
        `;

        resetButton.addEventListener('mouseenter', () => {
            resetButton.style.transform = 'scale(1.05)';
        });

        resetButton.addEventListener('mouseleave', () => {
            resetButton.style.transform = 'scale(1)';
        });

        resetButton.addEventListener('click', () => {
            ability.currentCooldown = 0;
            ability.isReady = true;
            console.log(`[Debug] ${name} cooldown reset!`);
        });

        buttonContainer.appendChild(resetButton);
        this.contentContainer.appendChild(buttonContainer);
    }

    /**
     * Add a section header
     */
    addSection(title) {
        const section = document.createElement('h2');
        section.textContent = title;
        section.style.cssText = `
            color: #ffffff;
            font-size: 24px;
            margin: 25px 0 15px 0;
            padding-top: 15px;
            border-top: 2px solid rgba(255, 255, 255, 0.3);
            font-family: Arial, sans-serif;
        `;
        if (this.contentContainer.children.length === 0) {
            section.style.borderTop = 'none';
            section.style.paddingTop = '0';
        }
        this.contentContainer.appendChild(section);
    }

    /**
     * Add a toggle control
     */
    addToggle(label, initialValue, onChange) {
        const container = document.createElement('div');
        container.style.cssText = `
            margin: 12px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        const labelElement = document.createElement('label');
        labelElement.style.cssText = `
            color: #ccc;
            font-size: 14px;
            font-family: Arial, sans-serif;
            flex: 1;
        `;
        labelElement.textContent = label;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = initialValue;
        checkbox.style.cssText = `
            width: 18px;
            height: 18px;
            cursor: pointer;
        `;

        checkbox.addEventListener('change', () => {
            onChange(checkbox.checked);
        });

        container.appendChild(labelElement);
        container.appendChild(checkbox);
        this.contentContainer.appendChild(container);
    }

    /**
     * Add a number control with +/- buttons
     */
    addNumberControl(label, initialValue, min, max, step = 1, onChange, suffix = '') {
        const container = document.createElement('div');
        container.style.cssText = `
            margin: 15px 0;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 5px;
        `;

        const labelElement = document.createElement('label');
        labelElement.style.cssText = `
            display: block;
            color: #fff;
            font-size: 14px;
            margin-bottom: 8px;
            font-family: Arial, sans-serif;
            font-weight: bold;
        `;
        labelElement.textContent = label;

        const controlRow = document.createElement('div');
        controlRow.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        // Decrease button
        const decreaseBtn = document.createElement('button');
        decreaseBtn.textContent = '-';
        decreaseBtn.style.cssText = `
            width: 35px;
            height: 35px;
            background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
            border: 2px solid #ffffff;
            border-radius: 5px;
            color: white;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            font-family: Arial, sans-serif;
        `;

        // Value display
        const valueDisplay = document.createElement('span');
        valueDisplay.style.cssText = `
            color: #ffffff;
            font-size: 16px;
            min-width: 100px;
            text-align: center;
            font-family: monospace;
            font-weight: bold;
            background: rgba(0, 0, 0, 0.3);
            padding: 5px 10px;
            border-radius: 3px;
        `;

        let currentValue = initialValue;
        const updateDisplay = () => {
            valueDisplay.textContent = currentValue.toFixed(2) + suffix;
        };
        updateDisplay();

        // Increase button
        const increaseBtn = document.createElement('button');
        increaseBtn.textContent = '+';
        increaseBtn.style.cssText = `
            width: 35px;
            height: 35px;
            background: linear-gradient(135deg, #388e3c 0%, #2e7d32 100%);
            border: 2px solid #ffffff;
            border-radius: 5px;
            color: white;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            font-family: Arial, sans-serif;
        `;

        // Reset button (sets to initial value)
        const resetBtn = document.createElement('button');
        resetBtn.textContent = '↻';
        resetBtn.style.cssText = `
            width: 35px;
            height: 35px;
            background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);
            border: 2px solid #ffffff;
            border-radius: 5px;
            color: white;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            font-family: Arial, sans-serif;
        `;

        // Button event handlers
        decreaseBtn.addEventListener('click', () => {
            currentValue = Math.max(min, currentValue - step);
            updateDisplay();
            onChange(currentValue);
            console.log(`[Debug] ${label} decreased to ${currentValue.toFixed(2)}${suffix}`);
        });

        increaseBtn.addEventListener('click', () => {
            currentValue = Math.min(max, currentValue + step);
            updateDisplay();
            onChange(currentValue);
            console.log(`[Debug] ${label} increased to ${currentValue.toFixed(2)}${suffix}`);
        });

        resetBtn.addEventListener('click', () => {
            currentValue = initialValue;
            updateDisplay();
            onChange(currentValue);
            console.log(`[Debug] ${label} reset to ${currentValue.toFixed(2)}${suffix}`);
        });

        // Hover effects
        [decreaseBtn, increaseBtn, resetBtn].forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.1)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
            });
        });

        controlRow.appendChild(decreaseBtn);
        controlRow.appendChild(valueDisplay);
        controlRow.appendChild(increaseBtn);
        controlRow.appendChild(resetBtn);

        container.appendChild(labelElement);
        container.appendChild(controlRow);
        this.contentContainer.appendChild(container);

        console.log(`[Debug Menu] Created number control: ${label}, range: ${min}-${max}, value: ${initialValue}`);
    }

    /**
     * Setup keyboard listener for "=" key
     */
    setupKeyboardListener() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '=' || e.key === '+') {
                this.toggle();
            } else if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    /**
     * Open the debug menu
     */
    open() {
        this.isOpen = true;
        this.overlay.style.display = 'flex';
        this.populateMenu(); // Refresh with current values
        console.log('[Debug Menu] Menu opened');
        console.log('[Debug Menu] Current physics:', this.globalPhysics);
    }

    /**
     * Close the debug menu
     */
    close() {
        this.isOpen = false;
        this.overlay.style.display = 'none';
    }

    /**
     * Toggle the debug menu
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Check if menu is open (used by game loop to pause)
     */
    isDebugMenuOpen() {
        return this.isOpen;
    }

    /**
     * Check if game should be paused (same as isOpen for debug menu)
     */
    isPaused() {
        return this.isOpen;
    }

    /**
     * Get physics multipliers
     */
    getPhysicsMultipliers() {
        return this.globalPhysics;
    }

    /**
     * Update player reference (when switching heroes)
     */
    setPlayer(player) {
        this.player = player;
        // Ensure physics reference is connected
        this.player.debugPhysics = this.globalPhysics;
        this.applyHitboxSettings();
    }

    /**
     * Apply hitbox settings to player and enemies
     */
    applyHitboxSettings() {
        if (!this.player) return;

        this.player.hitboxScale = {
            x: this.globalHitbox.playerScaleX,
            y: this.globalHitbox.playerScaleY
        };
        if (typeof this.player.setDebugHitboxVisible === 'function') {
            this.player.setDebugHitboxVisible(this.globalHitbox.enabled);
        }

        if (this.player.enemies) {
            this.player.enemies.forEach((enemy) => {
                enemy.hitboxScale = {
                    x: this.globalHitbox.enemyScaleX,
                    y: this.globalHitbox.enemyScaleY
                };
                if (typeof enemy.setDebugHitboxVisible === 'function') {
                    enemy.setDebugHitboxVisible(this.globalHitbox.enabled);
                }
            });
        }
    }

    /**
     * Destroy the menu (cleanup)
     */
    destroy() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
    }
}
