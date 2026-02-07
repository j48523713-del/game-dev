export default class Projectile {
  constructor(ownerId=null, x=0,y=0,z=0, vx=0, vy=0, vz=0) {
    this.ownerId = ownerId;
    this.pos = { x,y,z };
    this.vel = { x:vx, y:vy, z:vz };
    this.life = 1000;
  }
  
  update() {}
  display() {}
}
