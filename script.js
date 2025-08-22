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
