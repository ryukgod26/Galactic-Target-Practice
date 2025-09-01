// Spawn initial enemy after scene loaded
document.addEventListener('DOMContentLoaded', function() {
  var scene = document.querySelector('a-scene');
  if (scene) {
    scene.addEventListener('loaded', function() {
  var enemy = document.createElement('a-entity');
  enemy.setAttribute('id', 'enemy1');
  enemy.setAttribute('class', 'enemy');
  enemy.setAttribute('position', '-5 1.2 -10');
  enemy.setAttribute('dynamic-body', 'mass:2; shape:box; linearDamping:0.05; angularDamping:0.9');
  enemy.setAttribute('enemy', '');
  enemy.setAttribute('scale', '0.5 0.5 0.5');
  // Add hidden box geometry for physics
  var box = document.createElement('a-box');
  box.setAttribute('width', '1');
  box.setAttribute('height', '1');
  box.setAttribute('depth', '1');
  box.setAttribute('visible', 'false');
  enemy.appendChild(box);
  // Add GLTF model
  var model = document.createElement('a-gltf-model');
  model.setAttribute('src', '#drone');
  model.setAttribute('position', '0 0 0');
  model.setAttribute('scale', '1 1 1');
  model.setAttribute('shadow', 'cast:true;');
  enemy.appendChild(model);
  scene.appendChild(enemy);
    });
  }
});
// Enemy component for initial and spawned enemies
AFRAME.registerComponent('enemy', {
  schema: {
    health: { type: 'number', default: 100 },
    speed: { type: 'number', default: 5 },
    damage: { type: 'number', default: 25 },
    target: { type: 'selector', default: '#player' }
  },
  init: function () {
    this.bodyReady = false;
    this.body = null;
    // Listen for body-loaded event
    this.el.addEventListener('body-loaded', () => {
      this.bodyReady = true;
      this.body = this.el.body;
    });
    // Fallback: poll for body if event missed
    this._bodyPollTries = 0;
    this._bodyPollInterval = setInterval(() => {
      if (this.bodyReady) {
        clearInterval(this._bodyPollInterval);
        return;
      }
      if (this.el.body) {
        this.bodyReady = true;
        this.body = this.el.body;
        clearInterval(this._bodyPollInterval);
        console.log('Enemy body detected by polling:', this.el);
      }
      this._bodyPollTries++;
      if (this._bodyPollTries > 100) { // ~5 seconds
        clearInterval(this._bodyPollInterval);
        if (!this.bodyReady) {
          console.warn('Enemy body not ready after 5 seconds:', this.el);
        }
      }
    }, 50);
    // Click to damage enemy
    this.el.addEventListener('click', () => {
      this.data.health -= 25;
      if (this.data.health <= 0) {
        this.el.setAttribute('visible', false);
        if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
      }
    });
    // For movement
    this.targetPosition = new THREE.Vector3();
    this.currentPosition = new THREE.Vector3();
    this.direction = new THREE.Vector3();
  },
  tick: function (time, timeDelta) {
    if (!this.bodyReady){
      console.log('Body not ready');
      return ;
      
    } 
    // Get player entity world position
    const player = document.querySelector('#player');
    if (!player || !player.object3D) return;
    // Use player entity's world position
    player.object3D.getWorldPosition(this.targetPosition);
    this.el.object3D.getWorldPosition(this.currentPosition);
    // Move toward player
    this.direction.subVectors(this.targetPosition, this.currentPosition);
    const dist = this.direction.length();
    if (dist < 1.5) {
      // Reached player, emit damage event
      if (this.body && this.body.velocity) this.body.velocity.set(0, 0, 0);
      this.el.emit('enemy-attack', { damage: this.data.damage });
      return;
    }
    this.direction.normalize();
    this.direction.multiplyScalar(this.data.speed);
    if (this.body && this.body.velocity) {
      this.body.velocity.x = this.direction.x;
      this.body.velocity.z = this.direction.z;
    }
  }
});
// Listen for enemy-attack event in player component
// Speed-up powerup system
AFRAME.registerSystem('speedup-spawner', {
  schema: {
    spawnInterval: { default: 20000 }, // ms (20 seconds)
    randomExtra: { default: 5000 }, // ms (up to 5 seconds extra)
    planeSize: { default: 50 },
  },
  init: function () {
    this.lastSpawn = 0;
    this.speedupEntity = null;
    this.player = document.querySelector('#player');
    this.nextInterval = this.data.spawnInterval + Math.random() * this.data.randomExtra;
    this.el.sceneEl.addEventListener('speedup-picked', () => {
      if (this.speedupEntity && this.speedupEntity.parentNode) {
        this.speedupEntity.parentNode.removeChild(this.speedupEntity);
        this.speedupEntity = null;
        this.nextInterval = this.data.spawnInterval + Math.random() * this.data.randomExtra;
        this.lastSpawn = performance.now();
      }
    });
  },
  tick: function (time, timeDelta) {
    if (!this.player) return;
    if (this.speedupEntity) return;
    if (time - this.lastSpawn < this.nextInterval) return;
    this.spawnSpeedup();
    this.lastSpawn = time;
  },
  spawnSpeedup: function () {
    const planeSize = this.data.planeSize;
    const x = (Math.random() - 0.5) * planeSize;
    const z = (Math.random() - 0.5) * planeSize;
    const y = 1.2;
    const speedup = document.createElement('a-entity');
    speedup.setAttribute('id', 'speedup-powerup');
    speedup.setAttribute('position', `${x} ${y} ${z}`);
    speedup.setAttribute('gltf-model', '#speed_up');
    speedup.setAttribute('scale', '0.5 0.5 0.5');
    speedup.setAttribute('speedup', '');
    this.el.sceneEl.appendChild(speedup);
    this.speedupEntity = speedup;
    // Remove after 15 seconds if not picked up
    setTimeout(() => {
      if (this.speedupEntity && this.speedupEntity.parentNode) {
        this.speedupEntity.parentNode.removeChild(this.speedupEntity);
        this.speedupEntity = null;
        this.nextInterval = this.data.spawnInterval + Math.random() * this.data.randomExtra;
        this.lastSpawn = performance.now();
      }
    }, 15000);
  }
});

// Speedup powerup component
AFRAME.registerComponent('speedup', {
  init: function () {
    this.player = document.querySelector('#player');
    this.activated = false;
    
    // Keep click functionality as backup
    this.el.addEventListener('click', () => {
      this.activateSpeedup();
    });
  },
  
  tick: function () {
    if (this.activated || !this.player) return;
    
    // Check distance to player
    const playerPos = new THREE.Vector3();
    const speedupPos = new THREE.Vector3();
    
    this.player.object3D.getWorldPosition(playerPos);
    this.el.object3D.getWorldPosition(speedupPos);
    
    const distance = playerPos.distanceTo(speedupPos);
    
    // Activate if player is within 1.5 units
    if (distance < 1.5) {
      this.activateSpeedup();
    }
  },
  
  activateSpeedup: function () {
    if (this.activated) return;
    this.activated = true;
    
    if (this.player) {
      let playerData = this.player.getAttribute('player');
      let newSpeed = playerData.speed + 2; // Increase speed by 2
      this.player.setAttribute('player', 'speed', newSpeed);
      console.log(`Speed boost collected! Player speed increased to: ${newSpeed}`);
      
      // Reset speed after some time
      setTimeout(() => {
        if (this.player) {
          let currentData = this.player.getAttribute('player');
          let resetSpeed = Math.max(5, currentData.speed - 2); // Don't go below base speed of 5
          this.player.setAttribute('player', 'speed', resetSpeed);
          console.log(`Speed boost expired. Player speed reset to: ${resetSpeed}`);
        }
      }, 10000); // Speed boost lasts 10 seconds
    }
    
    this.el.sceneEl.emit('speedup-picked');
  }
});
// Target component for enemies to allow bullet collision
AFRAME.registerComponent('target', {
  schema: {
    active: { default: true }
  },
  init: function () {
    // Called when bullet hits
    this.el.components.target = this;
  },
  onBulletHit: function (bullet) {
    // Reduce enemy health
    let enemyComp = this.el.components.enemy;
    if (enemyComp) {
      enemyComp.data.health -= bullet.damage || 25;
      if (enemyComp.data.health <= 0) {
        this.el.setAttribute('visible', false);
        this.el.parentNode.removeChild(this.el);
        document.querySelector('#player').emit('enemy-die');
      }
    }
  }
});
// current change: health potion spawner system
AFRAME.registerSystem('potion-spawner', {
  schema: {
    minHealth: { default: 40 },
    spawnInterval: { default: 5000 }, // ms
    potionId: { default: 'potion' },
    planeSize: { default: 50 },
  },
  init: function () {
    this.lastSpawn = 0;
    this.potionEntity = null;
    this.player = document.querySelector('#player');
    this.el.sceneEl.addEventListener('potion-picked', () => {
      if (this.potionEntity && this.potionEntity.parentNode) {
        this.potionEntity.parentNode.removeChild(this.potionEntity);
        this.potionEntity = null;
      }
    });
  },
  tick: function (time, timeDelta) {
    if (!this.player) return;
    const health = this.player.getAttribute('player').health;
    if (health > this.data.minHealth) return;
    if (this.potionEntity) return;
    if (time - this.lastSpawn < this.data.spawnInterval) return;
    this.spawnPotion();
    this.lastSpawn = time;
  },
  spawnPotion: function () {
    const planeSize = this.data.planeSize;
    // Random position on plane
    const x = (Math.random() - 0.5) * planeSize;
    const z = (Math.random() - 0.5) * planeSize;
    const y = 1.2;
    const potion = document.createElement('a-entity');
    potion.setAttribute('id', 'health-potion');
    potion.setAttribute('position', `${x} ${y} ${z}`);
    potion.setAttribute('gltf-model', '#potion');
    potion.setAttribute('scale', '0.5 0.5 0.5');
    potion.setAttribute('potion', '');
    this.el.sceneEl.appendChild(potion);
    this.potionEntity = potion;
    potion.setAttribute('gltf-model', '#potion');
    potion.setAttribute('scale', '0.5 0.5 0.5');
  }
});

// current change: potion component for pickup
AFRAME.registerComponent('potion', {
  init: function () {
    this.player = document.querySelector('#player');
    this.activated = false;
    
    // Keep click functionality as backup
    this.el.addEventListener('click', () => {
      this.activatePotion();
    });
  },
  
  tick: function () {
    if (this.activated || !this.player) return;
    
    // Check distance to player
    const playerPos = new THREE.Vector3();
    const potionPos = new THREE.Vector3();
    
    this.player.object3D.getWorldPosition(playerPos);
    this.el.object3D.getWorldPosition(potionPos);
    
    const distance = playerPos.distanceTo(potionPos);
    
    // Activate if player is within 1.5 units
    if (distance < 1.5) {
      this.activatePotion();
    }
  },
  
  activatePotion: function () {
    if (this.activated) return;
    this.activated = true;
    
    // Increase player health
    if (this.player) {
      let playerData = this.player.getAttribute('player');
      this.player.setAttribute('player', 'health', Math.min(playerData.health + 40, 100));
      console.log('Health potion collected! Health restored.');
    }
    
    // Remove potion
    this.el.sceneEl.emit('potion-picked');
  }
});

// Restart button component
AFRAME.registerComponent('restart-button', {
  init: function () {
    this.el.addEventListener('click', () => {
      // Show the game over UI which contains restart functionality
      const gameOverUI = document.querySelector('#game-over-ui');
      const player = document.querySelector('#player');
      const scoreText = document.querySelector('#score-text');
      const highScoreText = document.querySelector('#high-score-text');
      
      if (gameOverUI && player && scoreText && highScoreText) {
        const currentScore = player.getAttribute('player').score;
        let highScore = localStorage.getItem('highScore') || 0;
        
        if (currentScore > highScore) {
          highScore = currentScore;
          localStorage.setItem('highScore', highScore);
        }
        
        scoreText.setAttribute('value', `Your Score: ${currentScore}`);
        highScoreText.setAttribute('value', `High Score: ${highScore}`);
        gameOverUI.setAttribute('visible', true);
      }
    });
  }
});


// const SHOOT_SOUND = 'sounds/shoot1.wav'; // Path to the shooting sound

// AFRAME.registerComponent('shoot', {
//   schema: {
//     projectile: { type: 'string', default: '#bullet' },
//     speed: { type: 'number', default: 10 }
//   },

//   init: function () {
//     this.shootSound = new Audio(SHOOT_SOUND);
//     this.shootSound.volume = 0.5;
//     this.el.addEventListener('shoot', this.shoot.bind(this));
//   },

//   shoot: function () {

//     const projectile = document.createElement('a-entity');
//     console.log('Shooting the projectile');

//     projectile.setAttribute('geometry', { primitive: 'sphere', radius: 0.1 });
//     projectile.setAttribute('material', { color: '#FF0000' });
//     projectile.setAttribute('position', this.el.getAttribute('position'));
//     projectile.setAttribute('dynamic-body', { mass: 1 });

//     const direction = new THREE.Vector3();
//     this.el.object3D.getWorldDirection(direction);
//     direction.multiplyScalar(this.data.speed);

//     projectile.body.velocity.set(direction.x, direction.y, direction.z);

//     this.el.sceneEl.appendChild(projectile);
//     this.shootSound.play();

//     // Remove projectile after 2 seconds
//     setTimeout(() => {
//       if (projectile.parentNode) {
//         projectile.parentNode.removeChild(projectile);
//       }
//     }, 2000);
//   }
// });

// AFRAME.registerComponent("shooter", {
//   schema: {
//     schema: {
//       activeBulletType: { type: "string", default: "normal" }, // The current bullet type to fire
//       bulletTypes: { type: "array", default: ["normal"] }, // All available bullet types
//       cycle: { default: !1 }, // Whether to cycle through bullet types
//     },
//   },
//
//   init: function () {
//     this.el.addEventListener("shoot", this.onShoot.bind(this));
//     this.el.addEventListener("onChangeBullet", this.onChangeBullet.bind(this));
//     this.bulletSystem = this.el.sceneEl.systems.bullet;
//     // Register bullet template entity with bullet system
//     let bulletTemplate = document.querySelector('#bullet-template');
//     if (bulletTemplate && this.bulletSystem) {
//       this.bulletSystem.registerBullet({el: bulletTemplate, data: bulletTemplate.components.bullet.data});
//     }
//     // Register all enemies as targets
//     let enemies = document.querySelectorAll('.enemy');
//     enemies.forEach(enemy => {
//       this.bulletSystem.registerTarget({el: enemy}, true);
//     });
//   },
//
//   onShoot: function () {
//     this.bulletSystem.shoot(this.data.activeBulletType, this.el.object3D);
//   },
//
//   onChangeBullet: function (e) {
//     let t;
//     elm = this.el;
//
//     if ("next" === e.detail) {
//       if (-1 == (t = this.data.bulletTypes.indexOf(this.data.activeBulletType)))
//         return;
//       t = this.data.cycle
//         ? (t + 1) % this.data.bulletTypes.length
//         : Math.min(this.data.bulletTypes.length - 1, t + 1);
//       this.data.activeBulletType = this.data.bulletTypes[t];
//       return void elm.setAttribute(
//         "shooter",
//         "activeBulletType",
//         this.data.bulletTypes[t]
//       );
//     }
//
//     if ("prev" === e.detail) {
//       if (
//         -1 === (t = this.data.bulletTypes.indexOf(this.data.activeBulletType))
//       )
//         return;
//       t = this.data.cycle
//         ? (t - 1) % this.data.bulletTypes.length
//         : Math.max(0, t - 1);
//       this.data.activeBulletType = this.data.bulletTypes[t];
//       return void this.el.setAttribute(
//         "shooter",
//         "activeBulletType",
//         this.data.bulletTypes[t]
//       );
//     }
//     //For custom Bullet Type
//     // elm.setAttribute('shooter','activeBulletType',this.data.bulletTypes[e.detail])
//     elm.setAttribute("shooter", "activeBulletType", e.detail);
//   },
// });

// AFRAME.registerComponent("bullet", {
//   dependencies: ["material"],
//   schema: {
//     damage: { default: 1, type: "float" },
//     maxTime: { default: 4, type: "float" },
//     name: { default: "normal", type: "string" },
//     poolSize: { default: 10, type: "int", min: 0 }, //Number of Bullets to pre-create for performance
//     speed: { default: 8, type: "float" },
//   },
//
//   init: function () {
//     // Do something when component first attached.
//   },
//
//   update: function () {
//     // Do something when component's data is updated.
//   },
//
//   remove: function () {
//     // Do something the component or its entity is detached.
//   },
//
//   tick: function (time, timeDelta) {
//     // Do something on every scene tick or frame.
//   },
// });

// AFRAME.registerComponent("click-to-shoot", {
//   init: function () {
//     this.el.addEventListener("mousedown", () => {
//       this.el.emit("shoot");
//     });
//   },
// });

AFRAME.registerComponent("hit-handler", {
  dependencies: ["material"],
  init: function () {
    let e;
    (e = document.createElement("a-entity")).id = "shooterBulletContainer";
    this.el.sceneEl.appendChild(e);
    this.container = e.object3D;

    this.pool = {};
    this.targets = {};
  },

  // creating a pool for specfic types of Bullets
  registerBullet: function (e) {
    let elmData, j, k, n;
    if ((k = e.el.object3D)) {
      elmData = e.data;
      this.pool[elmData.name] = [];

      //Clone teh bullet entity Pool Size Times
      for (n = 0; n < elmData.poolSize; n++) {
        (j = k.clone()).damage = elmData.damage;
        j.direction = new THREE.Vector3(0, 0, -1);
        //I learned this from ai . converting seconds into milliseconds.
        j.maxTime = 1e3 * elmData.maxTime;
        j.name = elmData.name + n;
        j.speed = elmData.speed;
        j.time = 0;
      }
    }
  },
  update: function () {
    // Do something when component's data is updated.
  },

  remove: function () {
    // Do something the component or its entity is detached.
  },

  tick: function (time, timeDelta) {
    // Do something on every scene tick or frame.
  },
});

AFRAME.registerComponent("player", {
  schema: {
    score: { type: "number", default: 0 },
    health: { type: "number", default: 100 },
    speed: { type: "number", default: 5 },
  },

  init: function () {
        this.keys ={}
    this.direction = new THREE.Vector3();
    this.bindMethods();
    this.setupEventListeners();
    this.el.addEventListener("enemy-die", this.enemyDie.bind(this));
    this.el.addEventListener("collide", function (event) {
      console.log("Player has collided with ", event.detail.body.el);
    });
    this.el.addEventListener("player-damaged", this.playerDamaged.bind(this));
    this.el.addEventListener('collidestart',(e)=>{
      console.log(`Player Collided with ${e.detail.el.id}`);
      if(e.detail.el.id === 'enemy'){
        this.data.health -= 25;
        console.log(`Player has ${this.data.health} HP.`);
        
      }
      this.enemies = document.querySelectorAll('.enemy');
      
    })
    // Listen for enemy-attack event
    this.el.addEventListener('enemy-attack', (e) => {
      this.data.health -= e.detail.damage;
      if (this.data.health <= 0) {
        this.el.emit('player-die');
      }
    });
  },
  playerDamaged: function (e) {
    const damage = e.detail.damage;
  this.data.health -= damage;
    console.log(`Player took ${damage} damage. Current health: ${this.data.health}`);
    if (this.data.health <= 0) {
      console.log("Player has been defeated!");
      this.el.emit("player-die");
    }
    this.onKeyUp = this.onKeyUp.bind(this);
  },
  enemyDie: function () {
    this.data.score += 1;
    console.log(this.data.score);
  },
  bindMethods: function () {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
  },

  setupEventListeners: function () {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  },

  onKeyDown: function (event) {
    this.keys[event.code] = true;
  },

  onKeyUp: function (event) {
    this.keys[event.code] = false;
  },
  tick: function (time, timeDelta) {
    const el = this.el;
    const body = el.body;
    const camera = el.querySelector('a-camera');
    const speed = this.data.speed;
    if (!body || !camera) return;

    // Synchronize player entity position with camera world position
    const cameraWorldPos = new THREE.Vector3();
    camera.object3D.getWorldPosition(cameraWorldPos);
    el.object3D.position.copy(cameraWorldPos);
    el.setAttribute('position', `${cameraWorldPos.x} ${cameraWorldPos.y} ${cameraWorldPos.z}`);
    // If using Ammo.js kinematic body, update transform:
    if (body && body.ammo && body.ammo.setWorldTransform) {
      let transform = body.ammo.getWorldTransform();
      transform.setOrigin(new Ammo.btVector3(cameraWorldPos.x, cameraWorldPos.y, cameraWorldPos.z));
      body.ammo.setWorldTransform(transform);
    }

    // Movement logic
    let position = cameraWorldPos.clone();
    const cameraDirection = new THREE.Vector3();
    camera.object3D.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    const rightDirection = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection).normalize();

    let zMovement = 0;
    let xMovement = 0;
    if (this.keys.KeyW) { zMovement -= 1; }
    if (this.keys.KeyS) { zMovement += 1; }
    if (this.keys.KeyA) { xMovement += 1; }
    if (this.keys.KeyD) { xMovement -= 1; }

    let moveVector = new THREE.Vector3();
    if (zMovement !== 0) {
      moveVector.add(cameraDirection.multiplyScalar(zMovement));
    }
    if (xMovement !== 0) {
      moveVector.add(rightDirection.multiplyScalar(xMovement));
    }

    if (moveVector.length() > 0) {
      moveVector.normalize().multiplyScalar(speed * timeDelta / 1000);
      position.add(moveVector);
      el.object3D.position.copy(position);
      el.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
      // If using Ammo.js kinematic body, update transform:
      if (body && body.ammo && body.ammo.setWorldTransform) {
        let transform = body.ammo.getWorldTransform();
        transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
        body.ammo.setWorldTransform(transform);
      }
    }

    // current change: damage player when near any drone
    if (this.enemies) {
      for (let i = 0; i < this.enemies.length; i++) {
        const enemy = this.enemies[i];
        const enemyPos = new THREE.Vector3();
        enemy.object3D.getWorldPosition(enemyPos);
        const dist = position.distanceTo(enemyPos);
        if (dist < 1.5) {
          // Damage player
          if (!this._lastDamageTime || time - this._lastDamageTime > 1000) {
            this.data.health -= 5; // Damage amount per second
            if (this.data.health <= 0) {
              this.el.emit('player-die');
            }
            this._lastDamageTime = time;
          }
        }
      }
    }
  },

 
  // tick: function (time, timeDelta) {
  //   const el = this.el;
  //   const body = el.body;
  //   const camera = el.querySelector('a-camera');
  //   const position = el.getAttribute("position");
  //   const speed = this.data.speed;

  //   if(!body || !camera) return;

  //   const finalDirection = new THREE.Vector3(0,0,0);
  //   const cameraDirection = new THREE.Vector3();
  //   camera.object3D.getWorldDirection(cameraDirection);
  //   cameraDirection.y = 0; // Project onto the XZ plane
  //   cameraDirection.normalize();

  //   //ai helped me in understanding it
  //     const rightDirection = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection).normalize();

  //   let zMovement = 0;
  //   let xMovement = 0;
  //   if (this.keys.KeyW) { zMovement -= 1; }
  //   if (this.keys.KeyS) { zMovement += 1; }
  //   if (this.keys.KeyA) { xMovement += 1; }
  //   if (this.keys.KeyD) { xMovement -= 1; }

  //   if (zMovement !== 0) {
  //     finalDirection.add(cameraDirection.multiplyScalar(zMovement));
  //   }
  //   if (xMovement !== 0) {
  //     finalDirection.add(rightDirection.multiplyScalar(xMovement));
  //   }

  //   const currentVelocity = body.velocity;

  //   if (finalDirection.length() > 0) {
  //     finalDirection.normalize().multiplyScalar(speed);
  //     body.velocity.set(finalDirection.x, currentVelocity.y, finalDirection.z);
  //   } else {
  //     // If no input, stop the player's horizontal movement
  //     body.velocity.set(0, currentVelocity.y, 0);
  //   }
  // },

  remove: function () {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  },
});

AFRAME.registerComponent("game-manager", {
  init: function () {

    this.player = document.querySelector("#player");
    this.gameOverUI = document.querySelector("#game-over-ui");
    this.restartButton = document.querySelector("#restart-button");
    this.scoreText = document.querySelector("#score-text");
    this.highScoreText = document.querySelector("#high-score-text");

    
    this.player.addEventListener("player-die", this.onPlayerDie.bind(this));
    this.restartButton.addEventListener("click", () => {
      window.location.reload();
    });
  },

  onPlayerDie: function () {
    const currentScore = this.player.getAttribute("player").score;
    let highScore = localStorage.getItem("highScore") || 0;

    if (currentScore > highScore) {
      highScore = currentScore;
      localStorage.setItem("highScore", highScore);
    }

    this.scoreText.setAttribute("value", `Your Score: ${currentScore}`);
    this.highScoreText.setAttribute("value", `High Score: ${highScore}`);
    this.gameOverUI.setAttribute("visible", true);

    // Stop enemies
    const enemies = document.querySelectorAll(".enemy");
    enemies.forEach((enemy) => {
      if (enemy.parentNode) {
        enemy.removeAttribute("enemy");
      }
    });
  },
});

//Manages all Bullets,Targets, and collision Detections.
AFRAME.registerSystem("bullet", {
  init: function () {
    var e;
    // Create a container for all active bullets
    (e = document.createElement("a-entity")).id = "superShooterBulletContainer";
    this.el.sceneEl.appendChild(e);
    this.container = e.object3D;

    // Initialize storage for bullet pools and targets
    this.pool = {};
    this.targets = [];
  },

  // Creates a pool of bullets for a specific type
  registerBullet: function (e) {
    var t, i, n, l;
    if ((l = e.el.object3D)) {
      i = e.data;
      this.pool[i.name] = [];

      // Clone the bullet entity 'poolSize' times
      for (n = 0; n < i.poolSize; n++) {
        (t = l.clone()).damagePoints = i.damagePoints;
        t.direction = new THREE.Vector3(0, 0, -1);
        t.maxTime = 1e3 * i.maxTime; // Convert seconds to milliseconds
        t.name = i.name + n;
        t.speed = i.speed;
        t.time = 0;

        t.visible = !1;
        this.pool[i.name].push(t);
      }
    }
  },

  // Adds a target to the list of shootable entities
  registerTarget: function (e, t) {
    var i;
    this.targets.push(e.el);
    // Pre-calculate the bounding box for static targets to improve performance
    if (t) {
      (i = e.el.object3D).boundingBox = new THREE.Box3().setFromObject(i);
    }
  },

  // Finds an available bullet from the pool and shoots it
  shoot: function (e, t) {
    var i,
      n = 0,
      l = 0,
      o = this.pool[e];
    if (void 0 === o) return null;

    // Find an invisible (inactive) bullet to reuse
    for (i = 0; i < o.length; i++) {
      if (!1 === o[i].visible) return this.shootBullet(o[i], t);
    }

    // If all are active, reuse the one that has been alive the longest
    o[i].time > l && ((n = i), (l = o[i].time));
    return this.shootBullet(o[n], t);
  },

  // Activates and fires a single bullet object
  shootBullet: function (e, t) {
    e.visible = !0;
    e.time = 0;

    // Set bullet position and direction based on the shooter's transform
    t.getWorldPosition(e.position);
    t.getWorldDirection(e.direction);
    e.direction.multiplyScalar(-e.speed);

    this.container.add(e); // Add the bullet to the scene
    return e;
  },

  // The main update loop, called on every frame
  tick: (function () {
    var e = new THREE.Box3(),
      t = new THREE.Vector3(),
      i = new THREE.Box3();
    return function (n, l) {
      var o, r, s, a, u;
      // Loop through all active bullets
      for (r = 0; r < this.container.children.length; r++)
        if ((o = this.container.children[r]).visible)
          if (((o.time += l), o.time >= o.maxTime)) {
            // Deactivate bullet if its lifetime expires
            this.killBullet(o);
          } else {
            // Update bullet position
            t.copy(o.direction).multiplyScalar(l / 850);
            o.position.add(t);

            // Get the bullet's current bounding box for collision detection
            e.setFromObject(o);

            // Check for collision against all targets
            for (u = 0; u < this.targets.length; u++) {
              let t = this.targets[u];
              if (t.getAttribute("target").active && (a = t.object3D).visible) {
                s = !1;

                a.boundingBox
                  ? (s = a.boundingBox.intersectsBox(e))
                  : (i.setFromObject(a), (s = i.intersectsBox(e)));

                if (s) {
                  this.killBullet(o);
                  t.components.target.onBulletHit(o);
                  t.emit("hit", null);
                  break;
                }
              }
            }
          }
    };
  })(),
});

// Enemy spawner system: keeps at least 2 enemies in the scene
AFRAME.registerSystem('enemy-spawner', {
  schema: {
    minEnemies: { default: 2 },
    planeSize: { default: 50 },
    spawnInterval: { default: 3000 }, // ms
  },
  init: function () {
    this.lastSpawn = 0;
    this.enemies = [];
    this.player = document.querySelector('#player');
    this.el.sceneEl.addEventListener('enemy-die', () => {
      setTimeout(() => this.checkAndSpawn(), 500);
    });
    this.checkAndSpawn();
  },
  tick: function (time, timeDelta) {
    if (time - this.lastSpawn > this.data.spawnInterval) {
      this.checkAndSpawn();
      this.lastSpawn = time;
    }
  },
  checkAndSpawn: function () {
    const currentEnemies = document.querySelectorAll('.enemy');
    if (currentEnemies.length < this.data.minEnemies) {
      this.spawnEnemy();
    }
  },
  spawnEnemy: function () {
    const planeSize = this.data.planeSize;
    const x = (Math.random() - 0.5) * planeSize;
    const z = (Math.random() - 0.5) * planeSize;
    const y = 1.2;
    const enemy = document.createElement('a-entity');
    enemy.setAttribute('class', 'enemy');
    enemy.setAttribute('position', `${x} ${y} ${z}`);
    enemy.setAttribute('dynamic-body', 'mass:2; shape:box; linearDamping:0.05; angularDamping:0.9');
    enemy.setAttribute('enemy', '');
    enemy.setAttribute('scale', '0.5 0.5 0.5');
    // Add hidden box geometry for physics
    var box = document.createElement('a-box');
    box.setAttribute('width', '1');
    box.setAttribute('height', '1');
    box.setAttribute('depth', '1');
    box.setAttribute('visible', 'false');
    enemy.appendChild(box);
    // Add GLTF model
    var model = document.createElement('a-gltf-model');
    model.setAttribute('src', '#drone');
    model.setAttribute('position', '0 0 0');
    model.setAttribute('scale', '1 1 1');
    model.setAttribute('shadow', 'cast:true;');
    enemy.appendChild(model);
    enemy.addEventListener('body-loaded', () => {
      console.log('Enemy body loaded:', enemy);
    });
    this.el.sceneEl.appendChild(enemy);
  }
});
