let selectedSuitIdx = 0;
let suitTypes = ['GUNDAM', 'ZAKU', 'DOM', 'GM', 'ZETA', 'SAZABI', 'BLUE_KITSUNE'];
let previewSuit = null;
window.projectiles = []; // Global projectiles array
window.enemies = []; // Global enemies array
window.otherPlayers = {}; // Global other players
window.particles = []; // Global particles
window.loot = []; // Global loot items
window.floatingTexts = []; // Global floating texts
window.screenShake = 0;
window.currentPlanet = 'TERRA';

// Define World Map if not present (Simple procedural generation)
window.generateWorldMap = (planetType = 'TERRA') => {
    window.currentPlanet = planetType;
    window.WORLD_MAP = [];
    window.worldPOI = []; // Points of Interest
    let mapSize = 200; // Doubled map size (4x area)
    
    for(let z=0; z<mapSize; z++) {
        let row = [];
        for(let x=0; x<mapSize; x++) {
            // Borders
            if (x===0 || x===mapSize-1 || z===0 || z===mapSize-1) row.push(1);
            else {
                let dx = x - 100; // Center is now 100
                let dz = z - 100;
                let dist = Math.sqrt(dx*dx + dz*dz);
                
                if (planetType === 'TERRA') {
                    // 1. Central Market Plaza (Radius 12)
                    if (dist < 12) {
                        if (dist > 8 && (x + z) % 2 === 0) row.push(3); // 3 = Stall
                        else row.push(0); 
                    }
                    // 2. Main Roads
                    else if (Math.abs(dx) < 4 || Math.abs(dz) < 4) row.push(0);
                    // 3. Residential Zone
                    else if (dist < 50) {
                        let bx = x % 10; let bz = z % 10;
                        if ((bx === 2 || bx === 8) && (bz >= 2 && bz <= 8)) row.push(2);
                        else if ((bz === 2 || bz === 8) && (bx >= 2 && bx <= 8)) { if (bx === 5) row.push(0); else row.push(2); }
                        else row.push(0);
                    }
                    // 4. Industrial Zone with better variety
                    else if (dist < 80) {
                        let n = noise(x * 0.2, z * 0.2);
                        if (n > 0.7) row.push(1); // High density factories
                        else if (n > 0.5) row.push(2); // Medium density warehouses
                        else if (n < 0.2 && Math.random() > 0.85) row.push(3); // Scattered crates
                        else row.push(0);
                    }
                    // 5. Wilderness with biomes
                    else {
                        let n = noise(x * 0.1, z * 0.1);
                        let n2 = noise(x * 0.05, z * 0.05);
                        if (n > 0.75) row.push(1); // Dense forest/mountains
                        else if (n > 0.65) row.push(2); // Medium density
                        else if (n2 > 0.8) row.push(4); // Water/special zones
                        else if (n < 0.3 && Math.random() > 0.97) row.push(3); // Rare resources
                        else row.push(0);
                    }
                } else if (planetType === 'MARS') {
                    // Mars: Rocky, harsh, with canyons and dust storms
                    let n = noise(x * 0.15, z * 0.15);
                    let n2 = noise(x * 0.08, z * 0.08);
                    
                    if (dist < 20) row.push(0); // Safe landing zone
                    else if (n > 0.75) row.push(1); // Rocky high terrain
                    else if (n > 0.5) row.push(1); // Medium rocks
                    else if (n2 > 0.7) row.push(4); // Canyon/trench
                    else if (n < 0.2 && Math.random() > 0.85) row.push(3); // Resource nodes
                    else row.push(0);
                    
                    // Register POI for bases/outposts
                    if (dist > 50 && dist < 80 && n > 0.7 && Math.random() < 0.001) {
                        window.worldPOI.push({ x: x, z: z, type: 'MARS_OUTPOST', name: 'Mars Outpost' });
                    }
                } else if (planetType === 'SPACE') {
                    // Space: Asteroid field with varying density
                    let n = noise(x * 0.1, z * 0.1);
                    let n2 = noise(x * 0.05, z * 0.05);
                    
                    if (dist < 20) row.push(0); // Safe zone
                    else if (n > 0.8) row.push(1); // Dense asteroids
                    else if (n > 0.6) row.push(1); // Medium asteroids
                    else if (n2 > 0.7 && Math.random() < 0.02) row.push(3); // Rare space debris
                    else if (Math.random() < 0.015) row.push(1); // Scattered rocks
                    else row.push(0);
                    
                    // Space stations POI
                    if (dist > 40 && dist < 120 && n > 0.75 && Math.random() < 0.0005) {
                        window.worldPOI.push({ x: x, z: z, type: 'SPACE_STATION', name: 'Space Station' });
                    }
                }
            }
        }
        window.WORLD_MAP.push(row);
    }
};

window.getSelectedSuitType = () => suitTypes[selectedSuitIdx];
window.resetPreviewSuit = () => { previewSuit = null; };

window.spawnExplosion = (x, y, z, color, count = 10, speed = 5) => {
    for(let i=0; i<count; i++) {
        window.particles.push({
            pos: createVector(x, y, z),
            vel: p5.Vector.random3D().mult(Math.random() * speed),
            life: 1.0,
            decay: Math.random() * 0.05 + 0.02,
            color: color,
            size: Math.random() * 15 + 5
        });
    }
};

window.spawnLoot = (x, y, z) => {
    // 50% chance to drop scrap
    if (Math.random() < 0.5) {
        window.loot.push({
            pos: createVector(x, y, z),
            type: 'scrap',
            life: 3000 // Despawn timer
        });
    }
};

window.spawnFloatingText = (pos, text, color) => {
    // Add a slight random offset to prevent stacking
    window.floatingTexts.push({ pos: pos.copy().add(0, -60, 0), text: text, color: color, life: 100, velY: -1 });
};

window.spawnEnemies = (spawnType = 'NORMAL') => {
  window.enemies = [];
  if (window.Enemy) {
    const createEnemy = (type, x, z, isBoss = false, isVirus = false) => {
        // Safe Spawn Logic
        let safeX = x, safeZ = z;
        let attempts = 0; 
        while(window.checkWallCollision(safeX, safeZ, 30, -50, 0) && attempts < 10) {
            safeX += (Math.random() - 0.5) * 400;
            safeZ += (Math.random() - 0.5) * 400;
            attempts++;
        }
        let e = new window.Enemy(type, safeX, -50, safeZ);
        let baseStats = window.SUIT_DATA[type].stats;
        // Weaken HP of player counterpart by default
        e.maxHealth = baseStats.health / 3;
        if (isBoss) {
            e.maxHealth *= 5; // Boss HP
            e.scale = 3; // Make it huge
            e.damageMult = 2; // Double damage
        }
        if (isVirus) {
            e.maxHealth /= 2;
            e.speed = baseStats.speed * 2;
        }
        e.health = e.maxHealth;
        window.enemies.push(e);
    };

    if (spawnType === 'BOSS') {
        // Spawn a massive Boss Gundam
        createEnemy('GUNDAM', 6000, 8000, true, false);
        // And some minions
        createEnemy('ZAKU', 5800, 7800);
        createEnemy('ZAKU', 6200, 7800);
    } else if (spawnType === 'VIRUS') {
        // Spawn fast, weak enemies
        for(let i=0; i<5; i++) {
            createEnemy('ZAKU', 6000 + Math.random()*2000-1000, 6000 + Math.random()*1000-500, false, true);
        }
    } else if (spawnType === 'HORDE') {
        // Spawn many normal enemies
        for(let i=0; i<12; i++) {
            createEnemy('ZAKU', 6000 + Math.random()*3000-1500, 6000 + Math.random()*3000-1500);
        }
    } else {
        // Normal Patrol (Outside town)
        createEnemy('ZAKU', 6000, 8000);
        createEnemy('ZAKU', 4000, 6000);
        createEnemy('GUNDAM', 8000, 6000);
    }
  }
};

window.spawnMissionEnemies = (count, type) => {
    if (!window.Enemy) return;
    // Spawn outside the wall (radius > 2500)
    for(let i=0; i<count; i++) {
        let angle = Math.random() * Math.PI * 2;
        let dist = 4000 + Math.random() * 2000; // Outside the town
        let x = 6000 + Math.cos(angle) * dist;
        let z = 6000 + Math.sin(angle) * dist;
        
        // Clamp to map bounds
        x = Math.max(200, Math.min(11800, x));
        z = Math.max(200, Math.min(11800, z));
        
        let e = new window.Enemy(type, x, -50, z);
        window.enemies.push(e);
    }
};

window.checkWallCollision = (x, z, radius, minY, maxY) => {
  if (typeof WORLD_MAP === 'undefined') return false;
  
  let s = 60; // Grid size matching buildWorld
  // Check the grid cells that the bounding box [x-r, x+r] x [z-r, z+r] overlaps
  let minGx = Math.floor((x - radius + s/2) / s);
  let maxGx = Math.floor((x + radius + s/2) / s);
  let minGz = Math.floor((z - radius + s/2) / s);
  let maxGz = Math.floor((z + radius + s/2) / s);

  // Wall vertical bounds (based on box(s,s,s) at y=-s/2)
  let wallTop = -s; 
  let wallBottom = 0;

  // Check if object is vertically within wall range
  // Added epsilon (0.1) to prevent sticking when standing exactly on top
  if (maxY <= wallTop + 0.1 || minY >= wallBottom - 0.1) return false;

  for (let gz = minGz; gz <= maxGz; gz++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      if (gz >= 0 && gz < WORLD_MAP.length && gx >= 0 && gx < WORLD_MAP[0].length) {
        if (WORLD_MAP[gz][gx] > 0) return true;
      }
    }
  }
  return false;
};

window.getMapHeight = (x, z) => {
  if (typeof window.WORLD_MAP === 'undefined') return 0;
  let s = 60;
  let gx = Math.floor((x + s/2) / s);
  let gz = Math.floor((z + s/2) / s);
  
  if (gz >= 0 && gz < window.WORLD_MAP.length && gx >= 0 && gx < window.WORLD_MAP[0].length) {
      if (window.WORLD_MAP[gz][gx] > 0) return -s; // Top of block is -60
  }
  return 0;
};

function lobbyInput(code) {
  if (code === LEFT_ARROW) {
    selectedSuitIdx = (selectedSuitIdx - 1 + suitTypes.length) % suitTypes.length;
    // Refresh suit types in case custom ones were loaded
    if (window.SUIT_DATA) {
        // This is a bit hacky, ideally suitTypes should be dynamic
        // But for now we just rely on the array. 
        // To support custom suits in lobby, we need to update suitTypes array in drawLobby3D or similar.
    }
  } else if (code === RIGHT_ARROW) {
    selectedSuitIdx = (selectedSuitIdx + 1) % suitTypes.length;
  }
}

window.drawShadow = (pos, scale = 1) => {
    push();
    translate(pos.x, pos.y + 2, pos.z);
    rotateX(HALF_PI);
    noStroke();
    fill(0, 0, 0, 80); // Soft shadow
    ellipse(0, 0, 50 * scale, 50 * scale);
    pop();
};

window.drawGame3D = (player, worldChunks) => {
  background(135, 206, 235);
  
  // Fog for depth (GTA-style atmosphere)
  if (window.currentPlanet === 'MARS') fog(150, 50, 30, 500, 3500);
  else if (window.currentPlanet === 'SPACE') fog(10, 10, 20, 500, 4000);
  else fog(135, 206, 235, 500, 4000);
  
  // Check if typing in chat/input
  const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

  if (player && !isTyping) player.update();

  // Orbital Camera Math
  let sx = 0, sy = 0, sz = 0;
  if (window.screenShake > 0) {
      sx = (Math.random() - 0.5) * window.screenShake;
      sy = (Math.random() - 0.5) * window.screenShake;
      sz = (Math.random() - 0.5) * window.screenShake;
      window.screenShake *= 0.9;
      if (window.screenShake < 0.5) window.screenShake = 0;
  }
  
  // Add Recoil Pitch
  if (player && player.recoil) {
      sy -= player.recoil * 2;
  }

  // Camera Smoothing Variables
  if (!window.camSmoothPos) window.camSmoothPos = createVector(0, -100, 200);
  if (!window.camSmoothLook) window.camSmoothLook = createVector(0, 0, 0);

  if (player && player.pos) {
    let targetPos, targetLook;
    
    if (player.camDist <= 20) {
        // First Person
        let headY = player.pos.y - 25;
        targetPos = createVector(player.pos.x + sx, headY + sy, player.pos.z + sz);
        targetLook = createVector(
            player.pos.x + cos(player.yaw) * cos(player.pitch) * 100 + sx,
            headY + sin(player.pitch) * 100 + sy,
            player.pos.z + sin(player.yaw) * cos(player.pitch) * 100 + sz
        );
    } else {
        // Third Person
        let eyeX = player.pos.x - cos(player.yaw) * cos(player.pitch) * player.camDist;
        let eyeY = player.pos.y - sin(player.pitch) * player.camDist - 40;
        let eyeZ = player.pos.z - sin(player.yaw) * cos(player.pitch) * player.camDist;
        targetPos = createVector(eyeX + sx, eyeY + sy, eyeZ + sz);
        targetLook = createVector(player.pos.x, player.pos.y - 40, player.pos.z);
    }
    
    // Apply Smoothing (Lerp)
    // Use a higher value (0.2) for responsiveness, lower (0.05) for heavy feel
    let smoothFactor = 0.15; 
    window.camSmoothPos.lerp(targetPos, smoothFactor);
    window.camSmoothLook.lerp(targetLook, smoothFactor);
    
    camera(window.camSmoothPos.x, window.camSmoothPos.y, window.camSmoothPos.z, 
           window.camSmoothLook.x, window.camSmoothLook.y, window.camSmoothLook.z, 0, 1, 0);
  }

  ambientLight(150);
  directionalLight(255, 255, 255, 0.5, 1, -0.5);
  // Hero Light (Point light near player for better visuals)
  if (player && player.pos) {
      pointLight(255, 255, 240, player.pos.x, player.pos.y - 200, player.pos.z);
  }

  // Draw and Update Enemies
  for (let i = window.enemies.length - 1; i >= 0; i--) {
    let e = window.enemies[i];
    e.update(player);
    if (player && player.pos.dist(e.pos) > 3000) continue; // Optimization: Cull distant enemies
    window.drawShadow(e.pos, e.scale || 1); // Draw Shadow
    e.display(window);
    
    // Draw Enemy Health Bar
    if (player) {
        push();
        translate(e.pos.x, e.pos.y - 90, e.pos.z);
        rotateY(-player.yaw - HALF_PI); // Face player
        rotateX(-player.pitch); // Face camera pitch
        
        // Disable lights for UI so it's always bright
        noLights(); 
        
        noStroke();
        
        // Red Background (Empty Health)
        fill(100, 0, 0);
        plane(60, 10);
        
        translate(0, 0, 1); // Move forward again
        
        // Green Foreground (Current Health)
        let hpPct = Math.max(0, e.health / e.maxHealth);
        
        // Color changes based on health (Red -> Green)
        let c = lerpColor(color(255, 0, 0), color(0, 255, 0), hpPct);
        fill(c);
        
        // Calculate center offset for left-alignment
        let newW = 60 * hpPct;
        let offsetX = -30 + newW / 2;
        
        push();
        translate(offsetX, 0, 0);
        plane(newW, 10);
        pop();

        // HP Text
        translate(0, -20, 0);
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(14);
        if (window.gameFont) {
            text(`${Math.ceil(e.health)} / ${Math.ceil(e.maxHealth)}`, 0, 0);
        }
        
        pop();
    }

    if (e.health <= 0) {
      window.spawnExplosion(e.pos.x, e.pos.y, e.pos.z, [255, 100, 50], 30, 8);
      window.screenShake = 15;
      window.spawnLoot(e.pos.x, e.pos.y, e.pos.z);
      if (player) {
          player.gainXp(50);
          if(player.logKill) player.logKill(e.typeId);
      }
      window.enemies.splice(i, 1);
    }
  }

  // Draw and Update Projectiles
  for (let i = window.projectiles.length - 1; i >= 0; i--) {
    let p = window.projectiles[i];
    p.update();
    if (player && player.pos.dist(p.pos) > 3000) { if(p.life<=0) window.projectiles.splice(i, 1); continue; } // Cull distant projectiles
    p.display();
    
    // Collision with Player
    if (p.owner !== player && player) {
        // Improved Cylinder Hitbox
        let dx = p.pos.x - player.pos.x;
        let dz = p.pos.z - player.pos.z;
        let distSq = dx*dx + dz*dz;
        // Check radius (25) and height range (player is approx 50 units tall)
        if (distSq < 625 && p.pos.y >= player.pos.y && p.pos.y <= player.pos.y + 60) {
            player.takeDamage(p.damage);
            window.spawnExplosion(p.pos.x, p.pos.y, p.pos.z, [255, 50, 50], 5, 3);
            window.screenShake = 5;
            p.life = 0;
        }
    }

    // Collision with Enemies & Other Players (PvP)
    let targets = [...window.enemies, ...Object.values(window.otherPlayers)];
    
    for (let e of targets) {
        if (p.owner === e) continue;
        
        let scale = e.scale || 1;
        let dx = p.pos.x - e.pos.x;
        let dz = p.pos.z - e.pos.z;
        let distSq = dx*dx + dz*dz;
        if (distSq < 625 * scale * scale && p.pos.y >= e.pos.y && p.pos.y <= e.pos.y + (60 * scale)) {
            if(e.takeDamage) e.takeDamage(p.damage); // Only enemies have local HP usually
            window.spawnExplosion(p.pos.x, p.pos.y, p.pos.z, [255, 200, 50], 5, 3);
            p.life = 0;
        }
    }

    // Collision with Walls
    if (window.checkWallCollision(p.pos.x, p.pos.z, p.size, p.pos.y - p.size, p.pos.y + p.size)) {
        window.spawnExplosion(p.pos.x, p.pos.y, p.pos.z, [200, 200, 200], 5, 3);
        p.life = 0;
    }

    if (p.life <= 0) {
      window.projectiles.splice(i, 1);
    }
  }

  // Draw Other Players (Multiplayer)
  for (let id in window.otherPlayers) {
    let op = window.otherPlayers[id];
    if (op) {
        window.drawShadow(op.pos, 1.2); // Draw Shadow
        op.display(window);
        // Draw their shield
        if (op.isShielding) {
            push();
            translate(op.pos.x, op.pos.y, op.pos.z);
            noFill();
            stroke(0, 200, 255, 150);
            strokeWeight(2);
            sphere(40);
            pop();
        }
        // Draw their melee
        if (op.meleeCooldown > 15) {
            push();
            translate(op.pos.x, op.pos.y, op.pos.z);
            rotateY(-op.yaw + HALF_PI);
            translate(0, 0, 60);
            fill(255, 50, 50, 200);
            noStroke();
            box(80, 10, 40); // Slash effect
            pop();
        }
    }
  }

  // Draw Loot
  for (let i = window.loot.length - 1; i >= 0; i--) {
      let l = window.loot[i];
      l.life--;
      
      push();
      translate(l.pos.x, l.pos.y - 10 + Math.sin(frameCount * 0.1) * 5, l.pos.z);
      rotateY(frameCount * 0.05);
      noStroke();
      fill(200, 200, 255);
      emissiveMaterial(100, 100, 255);
      box(15);
      pop();

      // Pickup Logic
      if (player && player.pos.dist(l.pos) < 50) {
          if (l.type === 'scrap') {
              // Import Item class dynamically or assume structure
              // We'll just push a raw object for now that matches Item structure
              player.inventory.addItem({id: 'scrap', name: 'Scrap', description: 'Salvaged parts.', price: 15, type: 'material'});
              if(player.missionStats) player.missionStats.items_collected = (player.missionStats.items_collected || 0) + 1;
              if(player.updateMissionProgress) player.updateMissionProgress();
              window.spawnFloatingText(player.pos, "+1 Scrap", [200, 200, 255]);
          }
          window.loot.splice(i, 1);
      } else if (l.life <= 0) window.loot.splice(i, 1);
  }

  // Draw World Chunks (Optimization)
  if (worldChunks && player) {
      for(let chunk of worldChunks) {
          if (player.pos.dist(chunk.center) < 3500) { // Render distance
              model(chunk.mesh);
          }
      }
  }

  if (player && player.camDist > 20) {
      window.drawShadow(player.pos, 1.2); // Draw Player Shadow
      player.display(window);
      // Draw Shield Visual
      if (player.isShielding) {
          push();
          translate(player.pos.x, player.pos.y, player.pos.z);
          noFill();
          stroke(0, 200, 255, 150);
          strokeWeight(2);
          sphere(40);
          pop();
      }
      // Draw Melee Visual
      if (player.meleeCooldown > 15) {
          push();
          translate(player.pos.x, player.pos.y, player.pos.z);
          rotateY(-player.yaw + HALF_PI);
          translate(0, 0, 60);
          fill(255, 50, 50, 200);
          noStroke();
          box(80, 10, 40); // Slash effect
          pop();
      }
      
      // Muzzle Flash
      if (player.isShootingFrame) {
          push();
          translate(player.pos.x, player.pos.y - 25, player.pos.z);
          rotateY(-player.yaw);
          translate(10, 0, 30); // Approximate gun position
          noStroke();
          fill(255, 255, 100, 200);
          sphere(8);
          pop();
      }
  }

  // Draw Particles
  noStroke();
  for (let i = window.particles.length - 1; i >= 0; i--) {
      let part = window.particles[i];
      part.pos.add(part.vel);
      part.life -= part.decay;
      if (part.life <= 0) {
          window.particles.splice(i, 1);
          continue;
      }
      push();
      translate(part.pos.x, part.pos.y, part.pos.z);
      fill(part.color[0], part.color[1], part.color[2], part.life * 255);
      box(part.size * part.life);
      pop();
  }

  // Draw Floating Texts (Always on top, billboarded)
  for (let i = window.floatingTexts.length - 1; i >= 0; i--) {
      let ft = window.floatingTexts[i];
      ft.pos.y += ft.velY;
      ft.life--;
      
      push();
      translate(ft.pos.x, ft.pos.y, ft.pos.z);
      rotateY(-player.yaw - HALF_PI);
      rotateX(-player.pitch); // Face camera fully
      fill(ft.color[0], ft.color[1], ft.color[2], map(ft.life, 0, 20, 0, 255));
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(20);
      if (window.gameFont) {
          text(ft.text, 0, 0);
      }
      pop();
      
      if (ft.life <= 0) window.floatingTexts.splice(i, 1);
  }
};

window.updateUI = (player) => {
  const ui = document.getElementById('ui-layer');
  if (!player) {
    if (ui) ui.style.display = 'none';
    return;
  }
  if (ui) ui.style.display = 'block';

  // HP
  const hpFill = document.getElementById('hp-fill');
  const hpText = document.getElementById('hp-text');
  const hpPct = Math.max(0, (player.health / player.maxHealth) * 100);
  if (hpFill) hpFill.style.width = hpPct + '%';
  if (hpText) hpText.innerText = `HP: ${Math.ceil(player.health)}/${player.maxHealth}`;

  // XP / Level
  const xpText = document.getElementById('xp-text'); // Need to add this to HTML or create dynamically
  if (!xpText && ui) { /* Create if missing logic could go here, but better in sketch setup */ }
  if (xpText) xpText.innerText = `LVL ${player.level} (${player.xp}/${player.maxXp})`;

  // EN
  const enFill = document.getElementById('en-fill');
  const enText = document.getElementById('en-text');
  const enPct = Math.max(0, (player.energy / player.maxEnergy) * 100);
  if (enFill) enFill.style.width = enPct + '%';
  if (enText) enText.innerText = `EN: ${Math.ceil(player.energy)}/${player.maxEnergy}`;

  // Weapon
  const wName = document.getElementById('weapon-name');
  const wStatus = document.getElementById('weapon-status');
  if (player.weapons && player.weapons.length > 0) {
    let w = player.weapons[player.currentWeaponIdx];
    if (wName) wName.innerText = w.name;
    
    if (player.weaponCooldowns[player.currentWeaponIdx] > 0) {
      if (wStatus) { wStatus.innerText = 'RELOADING'; wStatus.style.color = 'red'; }
    } else {
      if (wStatus) { wStatus.innerText = 'READY'; wStatus.style.color = 'lime'; }
    }
  }
};

window.updateMenus = (currentState) => {
  // Dynamically update suitTypes array if custom suits exist
  if (window.SUIT_DATA) {
      // Rebuild suitTypes array from SUIT_DATA keys
      const keys = Object.keys(window.SUIT_DATA);
      if (suitTypes.length < keys.length) {
          keys.forEach(k => { if(!suitTypes.includes(k)) suitTypes.push(k); });
      }
  }

  const menu = document.getElementById('menu-layer');
  const lobby = document.getElementById('lobby-layer');
  const login = document.getElementById('login-layer');
  
  if (currentState === -1) {
    if (login) login.style.display = 'flex';
    if (menu) menu.style.display = 'none';
    if (lobby) lobby.style.display = 'none';
  } else if (currentState === 0) {
    if (login) login.style.display = 'none';
    if (menu) menu.style.display = 'flex';
    if (lobby) lobby.style.display = 'none';
  } else if (currentState === 1) {
    if (login) login.style.display = 'none';
    if (menu) menu.style.display = 'none';
    if (lobby) lobby.style.display = 'flex';

    // Gundam Maker Button
    let makerBtn = document.getElementById('btn-maker');
    if (!makerBtn) {
        makerBtn = document.createElement('button');
        makerBtn.id = 'btn-maker';
        makerBtn.innerText = 'OPEN GUNDAM MAKER';
        makerBtn.style.position = 'absolute';
        makerBtn.style.right = '20px';
        makerBtn.style.bottom = '100px';
        makerBtn.style.padding = '15px';
        makerBtn.style.fontSize = '18px';
        makerBtn.style.cursor = 'pointer';
        makerBtn.onclick = () => {
            window.location.href = 'maker.html';
        };
        lobby.appendChild(makerBtn);
    }

    // Update Lobby Text
    const suitName = document.getElementById('lobby-suit-name');
    const stats = document.getElementById('lobby-stats');
    if (suitName) suitName.innerText = "< " + suitTypes[selectedSuitIdx] + " >";
    
    if (stats && window.SUIT_DATA) {
        let data = window.SUIT_DATA[suitTypes[selectedSuitIdx]];
        if (data) {
            let weaponsList = data.weapons.map(w => `${w.name} (${w.damage})`).join(' | ');
            stats.innerHTML = `
                <p>HP: ${data.stats.health} | EN: ${data.stats.energy} | SPD: ${data.stats.speed} | ATK: ${data.stats.attack}</p>
                <p style="font-size: 16px; margin-top: 5px;">Weapons: ${weaponsList}</p>
            `;
        }
    }
  } else {
    // Game State
    if (login) login.style.display = 'none';
    if (menu) menu.style.display = 'none';
    if (lobby) lobby.style.display = 'none';
  }
};

window.drawLobby3D = () => {
  let type = suitTypes[selectedSuitIdx];
  if (!previewSuit || previewSuit.typeId !== type) {
    if (window.Suit) {
      previewSuit = new window.Suit(type, 0, 0, 0);
    }
  }
  if (previewSuit) {
    ambientLight(150);
    directionalLight(255, 255, 255, 1, 1, -1);
    push();
    translate(0, 0, -300); // Move back to be visible in default camera
    rotateY(frameCount * 0.02);
    scale(2);
    previewSuit.display(window);
    pop();
  }
};

function mouseWheelGame(event, player) {
  if (player) player.zoom(event.delta);
  return false; // Prevents the browser page from scrolling
}

function mousePressedGame() {
  if (!document.pointerLockElement) {
    requestPointerLock();
  }
}

function buildWorld() {
  let s = 60;
  let mapSize = window.WORLD_MAP.length;
  let chunkSize = 40; // 40x40 blocks per chunk
  let chunks = [];

  for (let cz = 0; cz < mapSize; cz += chunkSize) {
    for (let cx = 0; cx < mapSize; cx += chunkSize) {
      let geom = buildGeometry(() => {
        // Floor for this chunk
        if (window.currentPlanet === 'MARS') fill(150, 50, 30);
        else if (window.currentPlanet === 'SPACE') fill(10, 10, 20);
        else fill(60, 120, 60); // Terra

        push();
        let cw = Math.min(chunkSize, mapSize - cx) * s;
        let cd = Math.min(chunkSize, mapSize - cz) * s;
        translate(cx * s + cw/2 - s/2, 0, cz * s + cd/2 - s/2); // Center of chunk
        rotateX(HALF_PI);
        plane(cw, cd);
        pop();

        // Blocks
        for (let z = cz; z < Math.min(cz + chunkSize, mapSize); z++) {
          for (let x = cx; x < Math.min(cx + chunkSize, mapSize); x++) {
             let cell = window.WORLD_MAP[z][x];
             if (cell > 0) {
            push();
            translate(x * s, -s/2, z * s);
            
            if (cell === 1) { 
                // Border/Rock - Taller, varied height
                fill(80); 
                let h = s * (1 + Math.sin(x * 0.5 + z) * 0.5);
                translate(0, -h/2 + s/2, 0);
                box(s, h, s);
            }
            else if (cell === 2) { 
                // House (Brown) - Box with Roof
                fill(160, 82, 45);
                box(s, s, s);
                // Roof
                push();
                translate(0, -s, 0);
                fill(100, 50, 30);
                rotateY(PI/4);
                cone(s * 0.8, s * 0.8);
                pop();
            }
            else if (cell === 3) { 
                // Market Stall (Blue) - Pillars and top
                fill(100, 80, 60); // Wood legs
                box(s*0.8, s, s*0.8); // Simplified stall base
                translate(0, -s/2 - 5, 0);
                fill(70, 130, 180); // Blue Canopy
                box(s, 10, s);
            }
            else if (cell === 4) {
                // Tree
                noStroke();
                // Trunk
                fill(139, 69, 19);
                push();
                translate(0, -s/2, 0);
                cylinder(s/4, s);
                pop();
                // Leaves
                fill(34, 139, 34);
                translate(0, -s*1.5, 0);
                sphere(s*0.8);
            }
            pop();
          }
          }
        }
      });
      
      chunks.push({
          mesh: geom,
          center: createVector((cx + chunkSize/2) * s, 0, (cz + chunkSize/2) * s)
      });
    }
  }
  return chunks;
}