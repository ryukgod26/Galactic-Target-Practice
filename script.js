AFRAME.registerComponent("enemy", {
  schema: {
    health: { type: "number", default: 100 },
    damage: { type: "number", default: 5 },
    speed: { type: "number", default: 3 },
    target: { type: "selector", default: "#player" },
     attackCooldown: { type: "number", default: 1000 }, // Cooldown in milliseconds (1 second)
  },

  init: function () {
    let data = this.data;
    this.speed = this.data.speed;
    this.damage = this.data.damage;
     this.timeSinceLastAttack = 0;
    this.el.addEventListener("collide", (e) => {
      // e.detail.body is the other Cannon body
      if (e.detail.body.el && e.detail.body.el.id === "player") {
        console.log("Drone collided with player!");
        // Handle damage, effects, etc.
      }
    });

    this.directionVec3 = new THREE.Vector3();
    this.targetPos = new THREE.Vector3();
    this.el.addEventListener("click", this.onClick.bind(this));
    this.el.addEventListener("body-loaded", () => {
      const body = this.el.body;
      if (!body) return;

      // I learned this from AI.
      body.linearDamping = 0.05;
      body.angularDamping = 0.9;
      console.log("Enemy Ready");
    });
    console.log(data);
  },
  onClick: function (evt) {
    console.log("Enemy Clicked!!!");
    this.data.health -= 25;
    if (this.data.health <= 0) {
      console.log("Enemy Destroyed!!!");
      this.el.setAttribute("visible", false);
      this.data.target.emit("enemy-die");

      if (this.el.body) {
        this.el.body.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
        this.el.body.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
      }
      this.el.parentNode.removeChild(this.el);
    } else {
      console.log(`Enemy Health is ${this.data.health}`);
    }
  },
  update: function () {
    // Do something when component's data is updated.
  },

  remove: function () {
    this.el.removeEventListener("click", this.onClick);
  },

  tick: function (time, timeDelta) {
     this.timeSinceLastAttack += timeDelta; 

    const body = this.el.body;
    if (!this.data.target) return;
    if (!this.el.body) return;
    this.targetPos = this.data.target.object3D.getWorldPosition(this.targetPos);
    console.log(`Player is at x: ${this.targetPos.x}, y: ${this.targetPos.y}, z: ${this.targetPos.z}`);
    
    const pos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(pos);
    this.directionVec3.subVectors(this.targetPos, pos);
    // this.directionVec3.set(
    //   this.targetPos.x - pos.x,
    //   this.targetPos.y - pos.y,
    //   this.targetPos.z - pos.z
    // );
    const dist = this.directionVec3.length();
    if (dist < 1.5) {
      //SLowing Near Player
      body.velocity.set(0, 0, 0);
      if (this.timeSinceLastAttack >= this.data.attackCooldown) {
        console.log("Enemy attacks!");
        this.data.target.emit("player-damaged", { damage: this.data.damage });
        this.timeSinceLastAttack = 0; // Reset the timer
      }

      
      return;
    }
    const factor = this.data.speed / dist;
  const velocity = this.directionVec3.multiplyScalar(factor);
    body.velocity.set(velocity.x, velocity.y, velocity.z);
    
    // body.velocity.x = this.directionVec3.x;
    // body.velocity.y = this.directionVec3.y;
    // body.velocity.z = this.directionVec3.z;
  },
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

AFRAME.registerComponent("shooter", {
  schema: {
    schema: {
      activeBulletType: { type: "string", default: "normal" }, // The current bullet type to fire
      bulletTypes: { type: "array", default: ["normal"] }, // All available bullet types
      cycle: { default: !1 }, // Whether to cycle through bullet types
    },
  },

  init: function () {
    // Do something when component first attached.
    this.el.addEventListener("shoot", this.onShoot.bind(this));
    this.el.addEventListener("onChangeBullet", this.onChangeBullet.bind(this));
    this.bulletSystem = this.el.sceneEl.systems.bullet;
  },

  onShoot: function () {
    this.bulletSystem.shoot(this.data.activeBulletType, this.el.object3D);
  },

  onChangeBullet: function (e) {
    let t;
    elm = this.el;

    if ("next" === e.detail) {
      if (-1 == (t = this.data.bulletTypes.indexOf(this.data.activeBulletType)))
        return;
      t = this.data.cycle
        ? (t + 1) % this.data.bulletTypes.length
        : Math.min(this.data.bulletTypes.length - 1, t + 1);
      this.data.activeBulletType = this.data.bulletTypes[t];
      return void elm.setAttribute(
        "shooter",
        "activeBulletType",
        this.data.bulletTypes[t]
      );
    }

    if ("prev" === e.detail) {
      if (
        -1 === (t = this.data.bulletTypes.indexOf(this.data.activeBulletType))
      )
        return;
      t = this.data.cycle
        ? (t - 1) % this.data.bulletTypes.length
        : Math.max(0, t - 1);
      this.data.activeBulletType = this.data.bulletTypes[t];
      return void this.el.setAttribute(
        "shooter",
        "activeBulletType",
        this.data.bulletTypes[t]
      );
    }
    //For custom Bullet Type
    // elm.setAttribute('shooter','activeBulletType',this.data.bulletTypes[e.detail])
    elm.setAttribute("shooter", "activeBulletType", e.detail);
  },
});

AFRAME.registerComponent("bullet", {
  dependencies: ["material"],
  schema: {
    damage: { default: 1, type: "float" },
    maxTime: { default: 4, type: "float" },
    name: { default: "normal", type: "string" },
    poolSize: { default: 10, type: "int", min: 0 }, //Number of Bullets to pre-create for performance
    speed: { default: 8, type: "float" },
  },

  init: function () {
    // Do something when component first attached.
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

AFRAME.registerComponent("click-to-shoot", {
  init: function () {
    this.el.addEventListener("mousedown", () => {
      this.el.emit("shoot");
    });
  },
});

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
    const position = el.getAttribute("position");
    const speed = this.data.speed;

    if(!body || !camera) return;

    const finalDirection = new THREE.Vector3(0,0,0);
    const cameraDirection = new THREE.Vector3();
    camera.object3D.getWorldDirection(cameraDirection);
    cameraDirection.y = 0; // Project onto the XZ plane
    cameraDirection.normalize();

    //ai helped me in understanding it
      const rightDirection = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection).normalize();

    let zMovement = 0;
    let xMovement = 0;
    if (this.keys.KeyW) { zMovement -= 1; }
    if (this.keys.KeyS) { zMovement += 1; }
    if (this.keys.KeyA) { xMovement += 1; }
    if (this.keys.KeyD) { xMovement -= 1; }

    if (zMovement !== 0) {
      finalDirection.add(cameraDirection.multiplyScalar(zMovement));
    }
    if (xMovement !== 0) {
      finalDirection.add(rightDirection.multiplyScalar(xMovement));
    }

    const currentVelocity = body.velocity;

    if (finalDirection.length() > 0) {
      finalDirection.normalize().multiplyScalar(speed);
      body.velocity.set(finalDirection.x, currentVelocity.y, finalDirection.z);
    } else {
      // If no input, stop the player's horizontal movement
      body.velocity.set(0, currentVelocity.y, 0);
    }
  },

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

  killBullet: function (e) {
    e.visible = !1;
  },
});
