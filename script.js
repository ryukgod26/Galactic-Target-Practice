AFRAME.registerComponent('enemy', {
    schema: {
        health:{type:'number',default:100},
        damage:{type:'number',default:5},
        speed:{type:'number',default:3},
        target:{type:'selector',default:'#player'}

    },

    init: function () {


        let data = this.data;
        this.speed = this.data.speed;
        this.damage = this.data.damage;
        this.el.addEventListener('collide', (e) => {
      // e.detail.body is the other Cannon body
      if (e.detail.body.el && e.detail.body.el.id === 'player') {
        console.log('Drone collided with player!');
        // Handle damage, effects, etc.
      }
    });

        this.directionVec3 = new THREE.Vector3();
 this.el.addEventListener('click', this.onClick.bind(this));
 this.el.addEventListener('body-loaded', () => {
  const body = this.el.body
  if (! body) return;

  // I learned this from AI.
  body.linearDamping = 0.05;
  body.angularDamping = 0.9;
  console.log('Enemy Ready');
  
});
console.log(data);

    },
onClick:function(evt){
console.log('Enemy Clicked!!!');
this.data.health -= 25;
if(this.data.health <= 0){
    console.log('Enemy Destroyed!!!');
    this.el.setAttribute('visible',false);
    this.el.emit('enemy-die');

    if (this.el.body) {
        this.el.body.setLinearVelocity(new Ammo.btVector3(0,0,0));
        this.el.body.setAngularVelocity(new Ammo.btVector3(0,0,0));
      }
}
else{
    console.log(`Enemy Health is ${this.data.health}`);
}
},
    update: function () {
      // Do something when component's data is updated.
    },



    remove: function () {
 this.el.removeEventListener('click', this.onClick);

 },

    tick: function (time, timeDelta) {
    
const body = this.el.body;
    if (!this.data.target) return;
  if (!this.el.body) return; 
  const targetPos = this.data.target.object3D.position;
  const pos = this.el.object3D.position;
  this.directionVec3.set(
    targetPos.x - pos.x,
    targetPos.y - pos.y,
    targetPos.z - pos.z
  );
  const dist = this.directionVec3.length();
  if(dist < 0.3){
    //SLowing Near Player
    body.velocity.x *= 0.8;
    body.velocity.y *= 0.8;
    body.velocity.z *= 0.8;
    console.log("Enemy Has Reached Near the Player");
    
    return ;
  }
  body.velocity.x = this.directionVec3.x;
  body.velocity.y = this.directionVec3.y;
  body.velocity.z = this.directionVec3.z;



    }
});

//Player
AFRAME.registerComponent('player', {
  schema: {
    score:{type:'number',default:0},
    health:{type:'number',default:100},
    speed:{type:'number',default:30}
  },

  init: function () {
    this.el.addEventListener('enemy-die',this.enemyDie);
    this.el.addEventListener('collide',function(event){
console.log('Player has collided with ',event.detail.body.el);
    })
  },

  enemyDie:function(){
    this.data.score +=1 ;
    console.log(this.data.score);
  },
  update: function () {
    // Do something when component's data is updated.
  },

  remove: function () {
    // Do something the component or its entity is detached.
  },

  tick: function (time, timeDelta) {
    // Do something on every scene tick or frame.
  }
});

const SHOOT_SOUND = 'sounds/shoot1.wav'; // Path to the shooting sound

AFRAME.registerComponent('shoot', {
  schema: {
    projectile: { type: 'string', default: '#bullet' },
    speed: { type: 'number', default: 10 }
  },

  init: function () {
    this.shootSound = new Audio(SHOOT_SOUND);
    this.shootSound.volume = 0.5;
    this.el.addEventListener('shoot', this.shoot.bind(this));
  },

  shoot: function () {
    const projectile = document.createElement('a-entity');
    projectile.setAttribute('geometry', { primitive: 'sphere', radius: 0.1 });
    projectile.setAttribute('material', { color: '#FF0000' });
    projectile.setAttribute('position', this.el.getAttribute('position'));
    projectile.setAttribute('dynamic-body', { mass: 1 });
    
    const direction = new THREE.Vector3();
    this.el.object3D.getWorldDirection(direction);
    direction.multiplyScalar(this.data.speed);
    
    projectile.body.velocity.set(direction.x, direction.y, direction.z);
    
    this.el.sceneEl.appendChild(projectile);
    this.shootSound.play();
    
    // Remove projectile after 2 seconds
    setTimeout(() => {
      if (projectile.parentNode) {
        projectile.parentNode.removeChild(projectile);
      }
    }, 2000);
  }
});

AFRAME.registerComponent('shooter', {
  schema: {
     schema: {
        activeBulletType: { type: "string", default: "normal" }, // The current bullet type to fire
        bulletTypes: { type: "array", default: ["normal"] }, // All available bullet types
        cycle: { default: !1 }, // Whether to cycle through bullet types
      },
  },

  init: function () {
    // Do something when component first attached.
    this.el.addEventListener('shoot',this.onShoot.bind(this));
    this.el.addEventListener('onChangeBullet',this.onChangeBullet.bind(this));
    this.bulletSystem = this.el.sceneEl.systems.bullet;
  },

  onShoot: function(){
    this.bulletSystem.shoot(this.data.activeBulletType,this.el.object3D)
  },

  onChangeBullet:function(e){
    let t;
    elm = this.el;
    
    if('next' === e.detail){
      if(-1 == (t = this.data.bulletTypes.indexOf(this.data.activeBulletType))) return ;
      t = this.data.cycle ? (t+1) % this.data.bulletTypes.length : Math.min(this.data.bulletTypes.length -1 ,t+1);
      this.data.activeBulletType = this.data.bulletTypes[t];
      return void elm.setAttribute('shooter','activeBulletType',this.data.bulletTypes[t]);
    }

    if('prev' === e.detail){
      if(-1 === (t = this.data.bulletTypes.indexOf(this.data.activeBulletType))) return ;
      t = this.data.cycle ? (t-1) % this.data.bulletTypes.length : Math.max(0 ,t-1);
      this.data.activeBulletType = this.data.bulletTypes[t];
      return void this.el.setAttribute('shooter','activeBulletType',this.data.bulletTypes[t]);
    }
    //For custom Bullet Type
    // elm.setAttribute('shooter','activeBulletType',this.data.bulletTypes[e.detail])
    elm.setAttribute('shooter','activeBulletType',e.detail);
  }
});


AFRAME.registerComponent('bullet', {
  dependencies:['material'],
    schema :{
      damage:{default:1,type:'float'},
      maxTime:{default:4,type:'float'},
      name:{default:'normal',type:'string'},
      poolSize:{default:10,type:'int',min:0}, //Number of Bullets to pre-create for performance
    speed:{default:8,type:'float'}
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
  }
});




AFRAME.registerComponent('player-controls', {
  schema: {
    speed: {type: 'number', default: 5}
  },

  init: function () {
    this.direction = new THREE.Vector3();
    this.bindMethods();
    this.setupEventListeners();
  },

  bindMethods: function () {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
  },

  setupEventListeners: function () {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  },

  onKeyDown: function (event) {
    switch (event.code) {
      case 'KeyW':
        this.direction.z = -1;
        break;
      case 'KeyS':
        this.direction.z = 1;
        break;
      case 'KeyA':
        this.direction.x = -1;
        break;
      case 'KeyD':
        this.direction.x = 1;
        break;
    }
  },

  onKeyUp: function (event) {
    switch (event.code) {
      case 'KeyW':
      case 'KeyS':
        this.direction.z = 0;
        break;
      case 'KeyA':
      case 'KeyD':
        this.direction.x = 0;
        break;
    }
  },

  tick: function (time, timeDelta) {
    const el = this.el;
    const position = el.getAttribute('position');
    const speed = this.data.speed * (timeDelta / 1000);
    
    position.x += this.direction.x * speed;
    position.z += this.direction.z * speed;
    
    el.setAttribute('position', position);
  },

  remove: function () {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
});












//Manages all Bullets,Targets, and collision Detections.
AFRAME.registerSystem("bullet", {
      init: function () {
        var e;
        // Create a container for all active bullets
        (e = document.createElement("a-entity")).id =
          "superShooterBulletContainer";
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
                  if (
                    t.getAttribute("target").active &&
                    (a = t.object3D).visible
                  ) {
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
