export default class Merchant {
  constructor(suitType='GUNDAM', x=0,y=0,z=0, stock=[]) {
    this.suitType = suitType;
    this.pos = { x,y,z };
    this.stock = stock || [];
    this.interactionRadius = 50;
    this.interactionPrompt = 'Press E to trade';
    this.planet = 'TERRA';
  }
  
  update(player) {}
  display(game, player) {}
  interact(player) {}
}
