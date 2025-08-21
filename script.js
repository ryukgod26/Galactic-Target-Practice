AFRAME.registerComponent('enemy', {
    schema: {
        health:{type:'number',default:100},
        damage:{type:'number',default:5},
        speed:{type:'number',default:5},
        target:{type:'selector',default:'#player'}

    },

    init: function () {

        let el = this.el;
        let data = this.data;
        this.speed = this.data.speed;
        this.damage = this.data.damage;
        this.target = this.data.target;
        this.directionVec3 = new THREE.Vector3();
 this.el.addEventListener('click', this.onClick);
console.log(data);

    },
onClick:function(evt){
console.log('Enemy Clicked!!!');
this.data.health -= 25;
if(this.data.health <= 0){
    console.log('Enemy Destroyed!!!');
    this.el.setAttribute('visible','false');
    this.el.emit('enemy-die');
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
      let dirV3 = this.directionVec3;
      let targetPosition = this.data.target.object3D.position;
      let currentPosition = this.el.object3D.position;

      dirV3.copy(targetPosition).sub(currentPosition);

      var dist = dirV3.length();

      if(dist < 1){
        console.log('Enemy has Reached the Player.')
        return ;
      }
 // Scale the direction vector's magnitude down to match the speed.
      let factor = this.speed/dist;
      ['x','y','z'].forEach(function(axis){
        dirV3[axis] *= factor * (timeDelta/1000);
      });
      this.el.setAttribute('position',{
        x: currentPosition.x + dirV3.x,
        y: currentPosition.y + dirV3.y,
        z: currentPosition.z + dirV3.z
      })
    }
});
