export default class Enemy {
  constructor(type='DEFAULT', x=0, y=0, z=0) {
    this.type = type;
    this.pos = { x, y, z };
    this.health = 100;
    this.yaw = 0;
    this.vel = { x: 0, y: 0, z: 0 };
  }
  
  update() {
    // Placeholder
  }
  
  display() {
    // Placeholder
  }
}
