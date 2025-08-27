# Galactic Target Practice

A VR shooting game built with A-Frame and Ammo.js physics. Shoot drones, avoid getting hit, and survive as long as possible!

## Features
- VR support (A-Frame)
- Physics-based movement and collisions (Ammo.js)
- Player and enemy entities with health and damage
- Enemy AI: drones chase and attack the player
- Bullet and shooting system
- Enemy spawning system (keeps at least 2 enemies in the scene)
- Game over and high score UI

## How to Run
1. Clone or download this repository.
2. Open `index.html` in a WebXR-compatible browser (Chrome, Firefox).
3. Make sure you have internet access for CDN scripts (A-Frame, Ammo.js, aframe-physics-system).

## Controls
- **WASD**: Move player
- **Mouse click**: Shoot
- **VR controllers**: Supported for movement and shooting

## Project Structure
```
Galactic-Target-Practice/
├── index.html
├── script.js
├── README.md
├── images/
│   └── ...
├── models/
│   └── ...
├── sounds/
│   └── ...
```

## Key Technologies
- [A-Frame](https://aframe.io/): WebVR framework
- [Ammo.js](https://github.com/kripken/ammo.js/): Physics engine
- [aframe-physics-system](https://github.com/c-frame/aframe-physics-system): Physics integration for A-Frame

## How It Works
- The player is a physics body (dynamic or kinematic) controlled by keyboard or VR input.
- Enemies are dynamic physics bodies that chase the player using velocity.
- Bullets are spawned and managed by a bullet system.
- Enemy spawner system keeps at least 2 enemies in the scene, spawning new ones at random positions.
- When the player's health reaches zero, the game over UI appears and high score is saved in local storage.

## Customization
- Change enemy spawn positions in `script.js` (`enemy-spawner` system).
- Adjust player/enemy speed, health, and damage in their respective components.
- Add new models, sounds, or assets in the `images/`, `models/`, and `sounds/` folders.

## Credits
- VR DRONE by Dave404 [CC-BY] via Poly Pizza

---
Enjoy Galactic Target Practice!