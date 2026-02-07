export default class MissionGiver {
  constructor(suitType='GUNDAM', x=0,y=0,z=0, templates=[]) {
    this.suitType = suitType;
    this.pos = { x,y,z };
    this.templates = templates || [];
    this.interactionRadius = 50;
    this.interactionPrompt = 'Press E to talk';
    this.planet = 'TERRA';
  }
  
  update(player) {}
  display(game, player) {}
  interact(player) {}
}
