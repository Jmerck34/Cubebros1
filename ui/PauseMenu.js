/**
 * PauseMenu - In-game menu accessible via button in top right
 * @class PauseMenu
 */
export class PauseMenu {
    constructor(onBackToMenu, onResume) {
        this.onBackToMenu = onBackToMenu;
        this.onResume = onResume;
        this.isOpen = false;

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
}
