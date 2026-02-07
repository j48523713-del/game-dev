export default class Player {
  constructor(suitType='GUNDAM') {
    this.suitType = suitType;
    this.inventory = { items: [] };
    this.inventory = { items: [], addItem: function(item) { this.items.push(item); } };
    this.activeMissions = [];
    this.currency = 0;
    
    // Position and velocity
    this.pos = { 
      x: 6000, y: 0, z: 6000,
      dist: function(other) {
        const dx = this.x - other.x;
        const dz = this.z - other.z;
        return Math.sqrt(dx*dx + dz*dz);
      }
    };
    this.vel = { x: 0, y: 0, z: 0, mult: function(n){ this.x*=n; this.y*=n; this.z*=n; } };
    if (typeof createVector === 'function') {
      this.pos = createVector(6000, 0, 6000);
      this.vel = createVector(0, 0, 0);
    } else {
      this.pos = { 
        x: 6000, y: 0, z: 6000,
        dist: function(other) {
          const dx = this.x - other.x;
          const dz = this.z - other.z;
          return Math.sqrt(dx*dx + dz*dz);
        }
      };
      this.vel = { x: 0, y: 0, z: 0, mult: function(n){ this.x*=n; this.y*=n; this.z*=n; }, mag: function(){ return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z); } };
    }
    
    // Rotation
    this.rotation = { x: 0, y: 0, z: 0 };
    this.yaw = 0;
    this.pitch = 0;
    
    // Combat stats
    this.health = 1000;
    this.maxHealth = 1000;
    this.energy = 500;
    this.maxEnergy = 500;
    this.level = 1;
    this.xp = 0;
    
    // Camera and recoil
    this.camDist = 100;
    this.recoil = 0;
    
    // Weapons and equipment
    this.weapons = [];
    this.currentWeaponIdx = 0;
    this.suit = { health: 1000, energy: 500 };
  }
  
  update() {
    // Placeholder update method
    if (this.recoil > 0) this.recoil *= 0.9;
  }
  
  display() {
    // Placeholder for player rendering - will be implemented by the real game
    if (!window.SUIT_DATA) return;
    let data = window.SUIT_DATA[this.suitType];
    if (!data) return;

    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    rotateY(-this.yaw);
    
    if (data.model) {
        const renderPart = (part) => {
            if (!part) return;
            push();
            if (part.offset) translate(part.offset[0], part.offset[1], part.offset[2]);
            if (part.color) fill(part.color);
            else fill(200);
            if (part.size) box(part.size[0], part.size[1], part.size[2]);
            if (part.details) {
                part.details.forEach(d => {
                    push();
                    if (d.offset) translate(d.offset[0], d.offset[1], d.offset[2]);
                    if (d.color) fill(d.color);
                    if (d.size) box(d.size[0], d.size[1], d.size[2]);
                    pop();
                });
            }
            pop();
        };
        if (Object.keys(data.model).length === 0) {
             fill(0, 0, 255); box(20, 60, 20); // Fallback
        } else {
            renderPart(data.model.torso); renderPart(data.model.head);
            renderPart(data.model.leftArm); renderPart(data.model.rightArm);
            renderPart(data.model.leftLeg); renderPart(data.model.rightLeg);
        }
    }
    pop();
  }
  
  switchWeapon(idx) {
    this.currentWeaponIdx = idx;
  }
  
  importSaveData(data) {
    if (!data) return;
    Object.assign(this, data);
  }
  
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }
}

