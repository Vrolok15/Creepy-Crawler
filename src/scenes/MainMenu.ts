import { Scene } from 'phaser';

export class MainMenu extends Scene {
    constructor() {
        super({ key: 'MainMenu' });
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.height * 0.3;

        const title = this.add.text(centerX, centerY, 'CREEPY CRAWLER', {
            fontFamily: '"Rubik Iso"',
            fontSize: '64px',
            color: '#ffffff'
        });
        title.setOrigin(0.5);

        // Add Play button
        const playButton = this.add.text(centerX, centerY + 200, 'PLAY', {
            fontFamily: '"Rubik Iso"',
            fontSize: '48px',
            color: '#ffffff'
        });
        playButton.setOrigin(0.5);
        playButton.setInteractive({ useHandCursor: true });

        // Hover effects
        playButton.on('pointerover', () => {
            playButton.setScale(1.2);
            playButton.setTint(0xff0000);
        });

        playButton.on('pointerout', () => {
            playButton.setScale(1);
            playButton.clearTint();
        });

        playButton.on('pointerdown', () => {
            this.scene.start('Game');
        });

        this.tweens.add({
            targets: title,
            y: centerY - 10,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });
    }
} 