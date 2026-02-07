export default class StellarBeacon {
  constructor(x=0,y=0,z=0) {
    this.pos = { x,y,z };
    this.planet = null;
    this.interactionRadius = 50;
    this.interactionPrompt = 'Press E to travel';
  }
  
  update(player) {}
  display(game, player) {}
  interact(player) {}
}
