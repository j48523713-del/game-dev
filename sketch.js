import Suit from './player_assets/Suits/Suit.js';
import Player from './player_assets/player.js';
import Enemy from './player_assets/Enemy.js';
import Projectile from './player_assets/Projectile.js';
import { SUIT_DATA } from './player_assets/Suits/suit_arrays.js';
import MissionGiver from './player_assets/MissionGiver.js';
import Merchant from './player_assets/Merchant.js';
import { MISSION_TEMPLATES } from './player_assets/MissionTemplates.js';
import Item from './player_assets/Item.js';
import StellarBeacon from './player_assets/StellarBeacon.js';
import Party from './player_assets/Party.js';
import JobBoard from './player_assets/JobBoard.js';
import { generateRandomJob } from './player_assets/JobTemplates.js';
import Facility from './player_assets/Facility.js';

// Expose classes and data to window so game.js can access them
window.Suit = Suit;
window.Player = Player;
window.Enemy = Enemy;
window.Projectile = Projectile;
window.SUIT_DATA = SUIT_DATA;
window.Party = Party;
window.JobBoard = JobBoard;
window.Facility = Facility;

let player;
let currentState = -1; // -1: LOGIN, 0: MENU, 1: LOBBY, 2: GAME
let worldChunks;
let suits = [];
let npcs = [];
window.loot = [];
window.floatingTexts = [];
let respawnTimer = 0;
let myId = Math.random().toString(36).substr(2, 9); // Generate random ID
let lastNetworkUpdate = 0;
let myUsername = "Guest";
let lastEventId = 0;
let chatLog = [];
let isUpdating = false;
let loadedSaveData = null;

// New systems
let currentParty = null;
let currentJobBoard = null;
let playerFacilities = [];
let jobBoardUI = null;
let partyUI = null;
let facilitiesUI = null;
let currentChatChannel = 'global'; // 'global', 'private', 'party'
let quantizedDataCache = {}; // Cache for bandwidth optimization

// Cheat code detection
let cheatCodeSequence = '';
let offlineMode = false;

// SET YOUR STATIC SERVER URL HERE (e.g. "https://my-game-name.serveo.net")
// Leave empty "" to use the current page's address (local mode)
let SERVER_URL = "http://localhost:3000";
let FALLBACK_URLS = ["http://10.0.0.28:3000", "http://localhost:3000"];

let gameFont;

function preload() {
  // Load a font for 3D text (Required for WEBGL mode)
  gameFont = loadFont('https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceCodePro-Bold.otf');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  if (gameFont) {
      textFont(gameFont);
      window.gameFont = gameFont; // Expose to game.js
  }
  if (window.generateWorldMap) window.generateWorldMap();
  player = new Player('GUNDAM'); // Default
  worldChunks = buildWorld();
  
  // Disable context menu for Shield usage
  document.addEventListener('contextmenu', event => event.preventDefault());

  // Auto-detect server if running in browser
  if (window.location.protocol.startsWith('http')) {
      SERVER_URL = window.location.origin;
      FALLBACK_URLS.unshift(SERVER_URL);
  }
  
  // Skip network initialization if offline mode is enabled
  if (!offlineMode) {
    // Attempt to find best server connection
    findBestServer().then((connected) => {
        if (!connected) return;
        // Load Custom Suits from Server
        fetch(SERVER_URL + '/api/custom_suits')
          .then(res => res.json())
          .then(data => {
              if(window.SUIT_DATA && data && typeof data === 'object') Object.assign(window.SUIT_DATA, data);
          })
          .catch(e => console.log("[Network] No custom suits found or offline:", e));
        
        // Fetch Leaderboard
        fetch(SERVER_URL + '/api/leaderboard')
            .then(res => res.json())
            .then(data => {
                const lb = document.getElementById('leaderboard');
                if(lb && data && Array.isArray(data)) {
                    lb.innerHTML = "<b>TOP PILOTS</b><br>" + data.map((p, i) => `${i+1}. ${p.username} - Lvl ${p.level}`).join('<br>');
                }
            })
            .catch(e => {
                console.log("[Network] Leaderboard unavailable (offline mode):", e);
                const lb = document.getElementById('leaderboard');
                if(lb) lb.innerHTML = "<b>LEADERBOARD</b><br><small>Offline Mode</small>";
            });
    }).catch(e => console.log("[Network] Server discovery failed, continuing offline:", e));
  }
  
  // Initialize example suits
  suits.push(new Suit('GUNDAM', 5900, -50, 5900));
  suits.push(new Suit('ZAKU', 6100, -50, 5900));

  // --- Initialize NPCs ---
  // Mission Giver standing near a house entrance
  // Adjusted Y to -50 to match player ground level and prevent clipping
  const missionGiver = new MissionGiver('ZAKU', 6100, -50, 6100, MISSION_TEMPLATES);
  missionGiver.planet = 'TERRA';
  npcs.push(missionGiver);
  // Merchant in the central market plaza
  const stock = [new Item('repair_kit', 'Repair Kit', 'Restores 200 HP.', 75, 'consumable')];
  const merchant = new Merchant('GUNDAM', 6000, -50, 5900, stock);
  merchant.planet = 'TERRA';
  npcs.push(merchant);

  // Stellar Beacon near spawn
  const beacon = new StellarBeacon(6050, -50, 6050);
  beacon.planet = 'ALL'; // Visible on all planets
  npcs.push(beacon);

  // --- Mars NPCs ---
  // Mars Mission Giver (Using DOM suit type)
  const marsGiver = new MissionGiver('DOM', 6100, -50, 6100, MISSION_TEMPLATES);
  marsGiver.planet = 'MARS';
  npcs.push(marsGiver);

  // Space Beacon (To return home)
  const spaceBeacon = new StellarBeacon(6050, -50, 6050);
  spaceBeacon.planet = 'SPACE';
  npcs.push(spaceBeacon);

  // Setup Login UI Buttons
  const btnLogin = document.getElementById('btn-login');
  const btnSignup = document.getElementById('btn-signup');
  const msgBox = document.getElementById('login-msg');
  const uInput = document.getElementById('username-input');
  const pInput = document.getElementById('password-input');

  // Inject Server URL Input for Manual Connection
  if (uInput && uInput.parentNode) {
      const serverDiv = document.createElement('div');
      serverDiv.style.marginBottom = '10px';
      serverDiv.innerHTML = `
          <input id="server-url-input" type="text" placeholder="Server URL (Auto)" style="padding:10px; width:100%; box-sizing:border-box; background:rgba(0,0,0,0.5); color:white; border:1px solid #555; font-family:monospace;">
      `;
      uInput.parentNode.insertBefore(serverDiv, uInput);
  }

  if (uInput) uInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleAuth('/login'); });
  if (pInput) pInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleAuth('/login'); });

  if (btnLogin) btnLogin.onclick = () => handleAuth('/login');
  if (btnSignup) btnSignup.onclick = () => handleAuth('/signup');

  setupChatUI();
  setupGameUI();

  // Auto-save every 30 seconds (skip if offline)
  setInterval(() => {
      if (!offlineMode && window.saveGame) window.saveGame();
  }, 30000);

  // Save on exit
  window.onbeforeunload = () => {
      if (!offlineMode && window.saveGame) window.saveGame();
  };

  if (offlineMode) {
    const lb = document.getElementById('leaderboard');
    if(lb) lb.innerHTML = "<b>LEADERBOARD</b><br><small>Offline Mode</small>";
  }
}

async function findBestServer() {
    let allUrls = [SERVER_URL, ...FALLBACK_URLS];
    // Remove duplicates
    allUrls = [...new Set(allUrls)];
    
    for (let url of allUrls) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 1500);
            const res = await fetch(url + '/api/stats', { method: 'GET', signal: controller.signal });
            clearTimeout(id);
            if (res.ok) {
                console.log(`[Network] Connected to ${url}`);
                SERVER_URL = url;
                return true;
            }
        } catch (err) {
            console.debug(`[Network] Failed to connect to ${url}:`, err.message);
        }
    }
    console.warn("[Network] Could not connect to any server. Running in offline mode.");
    offlineMode = true;
    const msgBox = document.getElementById('login-msg');
    if(msgBox) {
        msgBox.innerText = "Offline Mode - Login to play locally";
        msgBox.style.color = "yellow";
    }
    return false;
}

function createEl(tag, id, style, parent=document.body) {
    let el = document.createElement(tag);
    if(id) el.id = id;
    if(style) el.style.cssText = style;
    parent.appendChild(el);
    return el;
}

function setupChatUI() {
    let chatDiv = createEl('div', 'chat-container', "position:absolute; top:20px; right:20px; width:300px; pointer-events:none; display:none; flex-direction:column; align-items:flex-end;");
    createEl('div', 'chat-messages', "width:100%; height:200px; overflow-y:auto; color:white; text-shadow:1px 1px 0 #000; font-family:monospace; margin-bottom:5px; background:rgba(0,0,0,0.3); padding:5px;", chatDiv);
    
    let chatInp = createEl('input', 'chat-input', "pointer-events:auto; background:rgba(0,0,0,0.5); border:1px solid #555; color:white; padding:5px; width:100%; margin-bottom:5px;", chatDiv);
    chatInp.placeholder = "Press ENTER to chat... (/msg name text)";
    chatInp.addEventListener('keyup', (e) => { if(e.key === 'Enter') sendChat(); });

    let friendBtn = createEl('button', null, "pointer-events:auto; background:#004400; color:#0f0; border:1px solid #0f0; padding:5px 10px; cursor:pointer; font-family:monospace;", chatDiv);
    friendBtn.innerText = "👥 Friends";
    friendBtn.onclick = () => {
        let p = document.getElementById('friend-panel');
        p.style.display = p.style.display === 'none' ? 'block' : 'none';
        if(p.style.display === 'block') window.loadFriends();
    };

    let friendPanel = createEl('div', 'friend-panel', "display:none; pointer-events:auto; background:rgba(0,0,0,0.8); border:1px solid #0f0; padding:10px; width:100%; margin-top:5px;", chatDiv);
    friendPanel.innerHTML = `<div style="display:flex; margin-bottom:10px;"><input id="friend-search" placeholder="Username" style="flex:1; background:#222; border:1px solid #555; color:white; padding:2px;"><button onclick="window.addFriend()" style="background:#004400; color:#0f0; border:1px solid #0f0; cursor:pointer;">+</button></div><div id="friend-list" style="max-height:100px; overflow-y:auto; color:white; font-size:12px;"></div>`;
}

function setupGameUI() {
    // Inventory UI
    let inv = createEl('div', 'inventory-layer', "display:none; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:400px; height:300px; background:rgba(0,0,0,0.9); border:2px solid #0f0; color:#0f0; padding:20px; font-family:monospace; overflow-y:auto; z-index:100;");
    inv.innerHTML = "<h2 style='margin-top:0; border-bottom:1px solid #0f0'>INVENTORY</h2><div id='inv-list'></div><div style='margin-top:20px; font-size:12px; color:#aaa'>Press 'I' to close</div>";
    
    // Add XP Text to UI Layer
    let uiLayer = document.getElementById('ui-layer');
    if(uiLayer) createEl('div', 'xp-text', "position:absolute; bottom:80px; left:20px; color:gold; font-family:monospace; font-size:16px; font-weight:bold; text-shadow:1px 1px 0 #000;", uiLayer);

    // Dialogue UI
    let diag = createEl('div', 'dialogue-layer', "display:none; position:absolute; bottom:100px; left:50%; transform:translateX(-50%); width:600px; background:rgba(0,0,20,0.95); border:2px solid #0af; color:white; padding:20px; font-family:monospace; text-align:center; z-index:100;");
    diag.innerHTML = "<h3 id='diag-title' style='margin:0 0 10px 0; color:#0af'></h3><p id='diag-text' style='font-size:16px'></p><div id='diag-actions' style='margin-top:15px'></div>";

    // Mission UI
    let miss = createEl('div', 'mission-layer', "display:none; position:absolute; top:20px; left:20px; width:250px; background:rgba(0,0,0,0.5); color:white; padding:10px; font-family:monospace; pointer-events:none;");
    miss.innerHTML = "<h3 style='margin:0 0 5px 0; color:gold; border-bottom:1px solid gold; font-size:16px;'>CURRENT MISSIONS</h3><div id='mission-list'></div>";

    // Job Board UI
    let jobUI = createEl('div', 'job-board-layer', "display:none; position:absolute; bottom:20px; right:20px; width:300px; background:rgba(0,0,0,0.9); border:2px solid #f90; color:#f90; padding:15px; font-family:monospace; max-height:400px; overflow-y:auto; z-index:50;");
    jobUI.innerHTML = "<h3 style='margin:0 0 10px 0; border-bottom:1px solid #f90;'>JOB BOARD</h3><div id='job-list' style='max-height:300px; overflow-y:auto;'></div><button onclick='window.refreshJobBoard()' style='width:100%; margin-top:10px; background:#f90; color:black; border:none; padding:5px; cursor:pointer; font-weight:bold;'>Refresh (J)</button>";
    jobBoardUI = jobUI;

    // Party UI
    let partyUI = createEl('div', 'party-layer', "display:none; position:absolute; bottom:20px; left:20px; width:300px; background:rgba(0,0,0,0.9); border:2px solid #0ff; color:#0ff; padding:15px; font-family:monospace; z-index:50;");
    partyUI.innerHTML = "<h3 style='margin:0 0 10px 0; border-bottom:1px solid #0ff;'>PARTY (P)</h3><div id='party-members' style='margin-bottom:10px; max-height:100px; overflow-y:auto;'><small>No party</small></div><div style='display:flex; gap:5px;'><button onclick='window.createParty()' style='flex:1; background:#0ff; color:black; border:none; padding:5px; cursor:pointer; font-size:11px;'>Create</button><button onclick='window.leaveParty()' style='flex:1; background:#0ff; color:black; border:none; padding:5px; cursor:pointer; font-size:11px;'>Leave</button></div>";
    window.partyUI = partyUI;

    // Facilities UI
    let facUI = createEl('div', 'facilities-layer', "display:none; position:absolute; top:320px; left:20px; width:250px; background:rgba(0,0,0,0.8); border:2px solid #0f0; color:#0f0; padding:10px; font-family:monospace; max-height:200px; overflow-y:auto; z-index:50;");
    facUI.innerHTML = "<h3 style='margin:0 0 5px 0; border-bottom:1px solid #0f0; font-size:14px;'>FACILITIES</h3><div id='facility-list' style='font-size:12px;'></div><button onclick='window.toggleFacilityPanel()' style='width:100%; margin-top:5px; background:#0f0; color:black; border:none; padding:3px; cursor:pointer; font-size:11px;'>Build (B)</button>";
    facilitiesUI = facUI;
}

window.toggleInventory = () => {
    let el = document.getElementById('inventory-layer');
    if (el.style.display === 'none') {
        el.style.display = 'block';
        updateInventoryUI();
        document.exitPointerLock();
    } else {
        el.style.display = 'none';
        if(currentState === 2) requestPointerLock();
    }
};

function updateInventoryUI() {
    let list = document.getElementById('inv-list');
    if(!player || !player.inventory) return;
    
    // Group items
    let counts = {};
    player.inventory.items.forEach(i => {
        if(!counts[i.name]) counts[i.name] = { count:0, desc: i.description };
        counts[i.name].count++;
    });

    if(player.inventory.items.length === 0) {
        list.innerHTML = "<p style='color:#666'>Inventory is empty.</p>";
        return;
    }
    list.innerHTML = Object.keys(counts).map(k => `<div style='padding:10px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;'><span><b style='color:#fff'>${k}</b><br><small>${counts[k].desc}</small></span><span style='color:#0f0'>x${counts[k].count}</span></div>`).join('');
    list.innerHTML += `<div style='margin-top:10px; text-align:right; color:gold'>Credits: ${player.currency}</div>`;
}

window.updateMissionUI = () => {
    const list = document.getElementById('mission-list');
    if (!list || !player) return;
    
    if (player.activeMissions.length === 0) {
        list.innerHTML = "<small style='color:#aaa'>No active missions.</small>";
        return;
    }
    
    list.innerHTML = player.activeMissions.map(m => {
        const objectives = m.objectives.map(o => {
            const current = o.current || 0;
            const color = current >= o.count ? '#0f0' : '#ccc';
            const target = o.type === 'stat' ? o.statName.replace('_', ' ') : 'Kill ' + (o.targetId==='any'?'Enemies':o.targetId);
            return `<div style='font-size:12px; color:${color}; margin-left:10px;'>- ${target}: ${current}/${o.count}</div>`;
        }).join('');
        
        const titleColor = m.isComplete ? '#0f0' : '#0af';
        const status = m.isComplete ? " <span style='color:#0f0; font-size:10px'>[COMPLETE]</span>" : "";
        
        return `<div style='margin-bottom:8px; border-bottom:1px solid #444; padding-bottom:4px;'><div style='color:${titleColor}; font-weight:bold; font-size:14px;'>${m.title}${status}</div>${objectives}</div>`;
    }).join('');
};

window.showDialogue = (title, text, onAccept) => {
    let el = document.getElementById('dialogue-layer');
    document.getElementById('diag-title').innerText = title;
    document.getElementById('diag-text').innerText = text;
    let acts = document.getElementById('diag-actions');
    acts.innerHTML = "";
    
    let btn = document.createElement('button');
    btn.innerText = "ACCEPT";
    btn.style.cssText = "background:#0af; color:black; border:none; padding:8px 20px; margin-right:10px; cursor:pointer; font-weight:bold; font-family:monospace;";
    btn.onclick = () => { onAccept(); el.style.display = 'none'; requestPointerLock(); };
    acts.appendChild(btn);
    
    let close = document.createElement('button');
    close.innerText = "LEAVE";
    close.style.cssText = "background:transparent; color:#0af; border:1px solid #0af; padding:8px 20px; cursor:pointer; font-family:monospace;";
    close.onclick = () => { el.style.display = 'none'; requestPointerLock(); };
    acts.appendChild(close);
    
    el.style.display = 'block';
    document.exitPointerLock();
};

window.openTravelMenu = () => {
    document.getElementById('travel-layer').style.display = 'flex';
    document.exitPointerLock();
};

window.closeTravelMenu = () => {
    document.getElementById('travel-layer').style.display = 'none';
    if (currentState === 2) {
        try {
            requestPointerLock();
        } catch(e) { console.warn("Pointer lock failed:", e); }
    }
};

window.travelTo = (planetType) => {
    console.log("Traveling to " + planetType);
    window.generateWorldMap(planetType);
    worldChunks = buildWorld(); // Rebuild 3D mesh
    if (player) {
        player.pos.set(6000, -50, 6000); // Reset position to center
        player.vel.mult(0);
    }
    window.enemies = []; // Clear enemies from previous planet
    window.loot = []; // Clear loot
    window.projectiles = []; // Clear projectiles
    window.closeTravelMenu();
};

  let authRetryCount = 0;
  let authMaxRetries = 3;

  function handleAuth(endpoint) {
    const msgBox = document.getElementById('login-msg');
    const u = document.getElementById('username-input').value;
    const p = document.getElementById('password-input').value;
    
    // Check for manual server URL
    const serverInput = document.getElementById('server-url-input');
    if (serverInput && serverInput.value.trim() !== "") {
        let customUrl = serverInput.value.trim();
        if(customUrl.endsWith('/')) customUrl = customUrl.slice(0, -1);
        if(!customUrl.startsWith('http')) customUrl = 'http://' + customUrl;
        
        SERVER_URL = customUrl;
        offlineMode = false; // Force online attempt
        console.log("[Network] Manual Server URL set:", SERVER_URL);
    }

    if(!u || !p) {
        msgBox.innerText = "Please enter username and password.";
        msgBox.style.color = "orange";
        return;
    }

    if (offlineMode) {
        msgBox.innerText = "Offline Mode: Logging in...";
        msgBox.style.color = "lime";
        setTimeout(() => {
            currentState = 0; // Menu
            myUsername = u;
            loadedSaveData = null; 
        }, 500);
        return;
    }
    
    // Reset retry counter on fresh login attempt
    if (authRetryCount === 0) msgBox.innerText = "Connecting...";

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    fetch(SERVER_URL + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
        signal: controller.signal
    })
    .then(res => {
        clearTimeout(id);
        if (!res.ok) {
            if (res.status === 405) throw new Error("Server Error 405: Are you using 'Live Server'? Please open http://localhost:5000 instead.");
            throw new Error(`Server Error: ${res.status} ${res.statusText}`);
        }
        return res.json();
    })
    .then(data => {
        authRetryCount = 0; // Reset on success
        if (data.status === 'success') {
            if (endpoint === '/signup') {
                msgBox.innerText = "Account created! Please Login.";
                msgBox.style.color = "lime";
            } else {
                // Login Success
                msgBox.innerText = "Success!";
                msgBox.style.color = "lime";
                currentState = 0; // Go to Menu
                loadedSaveData = data.data; // Store loaded save data
                myUsername = u;
            }
        } else {
            msgBox.innerText = data.message || "Login failed.";
            msgBox.style.color = "red";
        }
    })
    .catch(err => {
        clearTimeout(id);
        console.warn("Network Error:", err.message);
        
        // Try next fallback URL (up to authMaxRetries times)
        if (authRetryCount < authMaxRetries && FALLBACK_URLS.length > 0) {
            authRetryCount++;
            let nextUrl = FALLBACK_URLS.shift();
            FALLBACK_URLS.push(SERVER_URL);
            SERVER_URL = nextUrl;
            msgBox.innerText = `Retry ${authRetryCount}/${authMaxRetries}: ${nextUrl}`;
            msgBox.style.color = "yellow";
            setTimeout(() => handleAuth(endpoint), 800);
            return;
        }
        
        // Give up and show offline message
        authRetryCount = 0;
        msgBox.innerText = "Network unavailable. Check connection or try localhost:3000";
        msgBox.style.color = "red";
        console.error("Authentication failed after retries. Servers unreachable.");
    });
  }


function sendChat() {
    const inp = document.getElementById('chat-input');
    const msg = inp.value.trim();
    if (!msg) return;
    
    fetch(SERVER_URL + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, message: msg })
    });
    
    inp.value = '';
    inp.blur(); // Unfocus to return control to game
}

window.addFriend = () => {
    const inp = document.getElementById('friend-search');
    const target = inp.value.trim();
    if(!target) return;
    
    fetch(SERVER_URL + '/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, target: target })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if(data.status === 'success') {
            inp.value = '';
            window.loadFriends();
        }
    });
};

window.loadFriends = () => {
    fetch(SERVER_URL + '/api/friends/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername })
    })
    .then(res => res.json())
    .then(list => {
        const div = document.getElementById('friend-list');
        div.innerHTML = list.map(f => 
            `<div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <span>${f}</span>
                <button onclick="document.getElementById('chat-input').value='/msg ${f} '; document.getElementById('chat-input').focus();" style="font-size:10px; cursor:pointer;">Msg</button>
             </div>`
        ).join('');
    });
};

window.saveGame = () => {
    if (!player || !myUsername || currentState !== 2) return;
    
    const data = player.exportSaveData();
    
    fetch(SERVER_URL + '/api/save_progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, save_data: data }),
        keepalive: true // Ensure save completes if tab is closed
    })
    .then(res => {
        if (!res.ok) throw new Error("Server returned " + res.status);
        return res.json();
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === 'success') console.log("Game Saved");
    })
    .catch(e => console.error("Save failed", e));
};

function draw() {
  // 1. Draw 3D Scene
  push();
  if (currentState === 2) {
    // Fallback: render a simple blue background if no game rendering function
    if (window.drawGame3D) {
      try {
        window.drawGame3D(player, worldChunks);
      } catch (err) {
        console.error("[DRAW] Error in drawGame3D:", err);
        background(50, 100, 200); // Fallback light blue
      }
    } else {
      background(50, 100, 200); // Fallback: light blue sky
      fill(50);
      text("Game rendering not loaded. Press ESCAPE to return.", -200, -50);
    }

    // Update and draw NPCs in the world
    if (npcs && Array.isArray(npcs)) {
      for (const npc of npcs) {
        if (npc && npc.pos && (npc.planet === 'ALL' || npc.planet === window.currentPlanet)) {
            try {
              if (npc.update) npc.update(player);
              if (npc.display) npc.display(window, player);
            } catch (e) {
              console.warn("[NPC] Error rendering NPC:", e);
            }
        }
      }
    }
    
    // Draw static suits (if any)
    if (suits && Array.isArray(suits)) {
      for (const s of suits) {
        if (window.currentPlanet !== 'TERRA') continue;
        try {
          if (s.update) s.update();
          if (s.display) s.display();
        } catch (e) {
          console.warn("[SUIT] Error rendering suit:", e);
        }
      }
    }
    
    // Check for Game Over
    if (player && player.health <= 0 && currentState === 2) {
      currentState = 0; // Go back to Menu
      document.exitPointerLock();
      player = null; // Destroy player instance
      
      // Show message on menu
      const lb = document.getElementById('leaderboard');
      if(lb) lb.innerHTML = "<h2 style='color:red'>CRITICAL FAILURE<br>UNIT DESTROYED</h2>" + lb.innerHTML;
      return; // Skip rest of draw
    }
  } else {
    background(0); // Clear background for Login/Menu/Lobby
    if (currentState === 1 && window.drawLobby3D) {
      window.drawLobby3D();
    }
  }
  pop();
  
  // 2. Update HTML UI
  if (window.updateMenus) {
    window.updateMenus(currentState);
  }
  if (currentState === 2 && window.updateUI && player) {
    window.updateUI(player);

    // --- Interaction Prompt UI ---
    let closestNpc = null;
    let minDist = Infinity;
    for (const npc of npcs) {
      if (npc.planet === 'ALL' || npc.planet === window.currentPlanet) {
          const d = player.pos.dist(npc.pos);
          if (d < npc.interactionRadius && d < minDist) {
            minDist = d;
            closestNpc = npc;
          }
      }
    }
    // Using the login message box as a temporary UI element for the prompt
    const msgBox = document.getElementById('login-msg');
    if (closestNpc) {
      msgBox.innerText = closestNpc.interactionPrompt;
    } else if (msgBox.innerText.startsWith('Press E')) {
      msgBox.innerText = ''; // Clear the prompt when out of range
    }
  } else {
    // Hide UI if not in game
    const ui = document.getElementById('ui-layer');
    if (ui) ui.style.display = 'none';
  }
  
  // Show Chat in Game
  const chatUI = document.getElementById('chat-container');
  if (chatUI) chatUI.style.display = (currentState === 2) ? 'flex' : 'none';

  // Show Mission UI
  const missionUI = document.getElementById('mission-layer');
  if (missionUI) missionUI.style.display = (currentState === 2) ? 'block' : 'none';

  // Send Network Data (Quantized for bandwidth optimization)
  if (!offlineMode && currentState === 2 && player && millis() - lastNetworkUpdate > 50 && !isUpdating) {
        lastNetworkUpdate = millis();
        isUpdating = true;
        const quantizedData = quantizePlayerData(player);
        fetch(SERVER_URL + '/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            id: myId,
            data: {
                ...quantizedData,
                isMoving: player.vel.mag() > 0.1, 
                shooting: player.isShootingFrame,
                melee: player.isMeleeFrame, 
                shield: player.isShielding,
                planet: window.currentPlanet
            },
            username: myUsername,
            lastEventId: lastEventId
            })
        })
        .then(res => res.json())
        .then(response => {
            isUpdating = false;
            // Handle Events (like Spawn Enemies)
            if (response.events) {
                response.events.forEach(evt => {
                    if (evt.id > lastEventId) {
                        lastEventId = evt.id;
                        if (evt.type === 'SPAWN_ENEMIES') {
                            if (window.spawnEnemies) window.spawnEnemies(evt.data ? evt.data.enemyType : 'NORMAL');
                        }
                    }
                });
            }

            // Handle Chat
            if (response.chat) {
                const msgDiv = document.getElementById('chat-messages');
                msgDiv.innerHTML = response.chat.map(c => `<div><b style="color:#0f0">${c.sender}:</b> ${c.message}</div>`).join('');
                msgDiv.scrollTop = msgDiv.scrollHeight;
            }

            // Handle Players
            let others = response.players || {};
            
            let seenIds = new Set();
            for (let id in others) {
                let data = others[id];
                if (data.planet !== window.currentPlanet) continue; // Skip players on other planets
                seenIds.add(id); // Only mark seen if on same planet
                
                // Create if new
                if (!window.otherPlayers[id]) {
                    let s = new Suit(data.type, data.x, data.y, data.z);
                    s.pitch = 0;
                    s.isShielding = false;
                    s.meleeCooldown = 0;
                    window.otherPlayers[id] = s;
                }
                // Update
                let s = window.otherPlayers[id];
                s.pos.set(data.x, data.y, data.z);
                s.yaw = data.yaw;
                s.pitch = data.pitch || 0;
                s.isShielding = data.shield || false;
                s.rotation.y = -s.yaw + HALF_PI;
                if (data.isMoving) s.animState.walkCycle += 0.2;
                if (s.typeId !== data.type) s.typeId = data.type;
                
                if (data.shooting) {
                    // Create a projectile from this player
                    let weapon = { speed: 10, damage: 10, color: [255, 50, 50], size: 5, cooldown: 10 };
                    if (window.SUIT_DATA && window.SUIT_DATA[s.typeId] && window.SUIT_DATA[s.typeId].weapons) {
                        weapon = window.SUIT_DATA[s.typeId].weapons[0];
                    }
                    // Calculate spawn pos
                    let spawnPos = s.pos.copy();
                    spawnPos.y -= 25; spawnPos.x += Math.cos(s.yaw) * 20; spawnPos.z += Math.sin(s.yaw) * 20;
                    window.projectiles.push(new window.Projectile(spawnPos.x, spawnPos.y, spawnPos.z, s.yaw, s.pitch, weapon, s));
                }

                if (data.melee) {
                    s.meleeCooldown = 30;
                }
                if (s.meleeCooldown > 0) s.meleeCooldown--;

            }
            // Remove disconnected
            for (let id in window.otherPlayers) {
                if (!seenIds.has(id)) delete window.otherPlayers[id];
            }
        })
        .catch(e => handleNetworkError(e)); 
  }
}

function keyPressed() {
  // Cheat code detection: press 'c', 'a', 'd' to skip login and enableOfflineMode
  if (!offlineMode && currentState !== 2) {
    if (key === 'c' || key === 'C') cheatCodeSequence = 'c';
    else if (key === 'a' || key === 'A') {
      if (cheatCodeSequence === 'c') cheatCodeSequence = 'ca';
      else cheatCodeSequence = '';
    }
    else if (key === 'd' || key === 'D') {
      if (cheatCodeSequence === 'ca') {
        // Cheat code activated!
        console.log("[CHEAT] Cheat code detected! Activating offline mode...");
        offlineMode = true;
        currentState = 2; // Skip to game
        player = new Player('GUNDAM');
        player.pos.x = 6000;
        player.pos.y = 0;
        player.pos.z = 6000;
        myUsername = 'Pilot';
        console.log("[CHEAT] Player initialized:", player);
        console.log("[CHEAT] Current state:", currentState);
        console.log("[CHEAT] Offline mode:", offlineMode);
        // Request pointer lock for game controls
        try {
          document.documentElement.requestPointerLock();
          console.log("[CHEAT] Pointer lock requested");
        } catch(e) {
          console.warn("[CHEAT] Pointer lock failed:", e);
        }
        return;
      } else {
        cheatCodeSequence = '';
      }
    }
    else {
      cheatCodeSequence = '';
    }
  }

  if (currentState === 1) {
    if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
      if (typeof lobbyInput === 'function') lobbyInput(keyCode);
    }
  }
  if (keyCode === ENTER) {
    if (currentState === 0) currentState = 1;      // Menu -> Lobby
    else if (currentState === 1) {
      currentState = 2; // Lobby -> Game
      let type = window.getSelectedSuitType ? window.getSelectedSuitType() : 'GUNDAM';
      player = new Player(type);
      if (loadedSaveData) player.importSaveData(loadedSaveData); // Load save data
      // Removed automatic spawnEnemies() here. Now controlled by Dashboard.
    }
    
    // Chat Focus
    if (currentState === 2) {
        document.getElementById('chat-input').focus();
    }
  }

  // --- NPC Interaction Input ---
  if (currentState === 2 && player && keyCode === 69) { // 'E' key
    let closestNpc = null;
    let minDist = Infinity;
    for (const npc of npcs) {
      if (npc.planet === 'ALL' || npc.planet === window.currentPlanet) {
          const d = player.pos.dist(npc.pos);
          if (d < npc.interactionRadius && d < minDist) {
            minDist = d;
            closestNpc = npc;
          }
      }
    }
    if (closestNpc) {
      closestNpc.interact(player);
    }
  }
  
  // Weapon Switching
  if (currentState === 2 && player) {
      if (key === '1') player.switchWeapon(0);
      if (key === '2') player.switchWeapon(1);
      if (key === '3') player.switchWeapon(2);
  }
  
  // Inventory
  if (currentState === 2 && (key === 'i' || key === 'I')) {
      window.toggleInventory();
  }

  // New feature shortcuts
  if (currentState === 2) {
      if (key === 'p' || key === 'P') {
          let partyUI = document.getElementById('party-layer');
          if (partyUI) partyUI.style.display = partyUI.style.display === 'none' ? 'block' : 'none';
          window.updatePartyUI();
      }
      if (key === 'j' || key === 'J') {
          let jobUI = document.getElementById('job-board-layer');
          if (jobUI) {
              if (jobUI.style.display === 'none') {
                  jobUI.style.display = 'block';
                  window.refreshJobBoard();
              } else {
                  jobUI.style.display = 'none';
              }
          }
      }
      if (key === 'b' || key === 'B') {
          window.toggleFacilityPanel();
      }
  }
}

function mouseWheel(event) {
  if (currentState === 2) {
    mouseWheelGame(event, player);
  }
}

function mousePressed() {
  if (currentState === 2) {
    // Check if UI is open
    const diag = document.getElementById('dialogue-layer');
    const inv = document.getElementById('inventory-layer');
    const chat = document.getElementById('chat-input');
    
    const isDiagOpen = diag && diag.style.display === 'block';
    const isInvOpen = inv && inv.style.display === 'block';
    const isChatFocused = document.activeElement === chat;

    if (!isDiagOpen && !isInvOpen && !isChatFocused) {
        mousePressedGame();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function handleNetworkError(e) {
    // Log sparingly or handle disconnection logic here
}

// ========== PARTY SYSTEM FUNCTIONS ==========
window.createParty = () => {
    if (currentParty) {
        alert('You are already in a party. Leave first.');
        return;
    }
    fetch(SERVER_URL + '/api/party/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leader: myUsername })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            currentParty = {
                id: data.party_id,
                leader: myUsername,
                members: [myUsername]
            };
            updatePartyUI();
            alert('Party created! Share the ID: ' + data.party_id);
        }
    })
    .catch(e => console.error('Create party error:', e));
};

window.leaveParty = () => {
    if (!currentParty) return;
    fetch(SERVER_URL + '/api/party/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ party_id: currentParty.id, username: myUsername })
    })
    .then(res => res.json())
    .then(() => {
        currentParty = null;
        updatePartyUI();
        alert('Left party');
    })
    .catch(e => console.error('Leave party error:', e));
};

window.updatePartyUI = () => {
    const memberDiv = document.getElementById('party-members');
    if (!memberDiv || !currentParty) return;
    
    if (currentParty.members.length === 0) {
        memberDiv.innerHTML = '<small>No party</small>';
        return;
    }
    
    memberDiv.innerHTML = '<small style="color:#0ff;">Members:</small><br>' + 
        currentParty.members.map(m => `<div style="padding:2px 0; font-size:12px;">• ${m}${m === currentParty.leader ? ' (Leader)' : ''}</div>`).join('');
};

// ========== JOB BOARD FUNCTIONS ==========
window.refreshJobBoard = () => {
    if (!currentJobBoard) {
        currentJobBoard = new JobBoard(window.currentPlanet || 'TERRA');
    }
    
    const jobs = currentJobBoard.getAvailableJobs();
    const jobList = document.getElementById('job-list');
    if (!jobList) return;
    
    jobList.innerHTML = jobs.map(job => `
        <div style="background:rgba(255,153,0,0.1); padding:8px; margin:5px 0; border-left:2px solid #f90; font-size:11px;">
            <b style="color:#fff;">${job.title}</b><br>
            <small>${job.description}</small><br>
            <small style="color:#0f0;">XP: ${job.rewards.xp} | CR: ${job.rewards.currency}</small><br>
            <button onclick='window.acceptJob("${job.jobId}")' style='width:100%; background:#f90; color:black; border:none; padding:3px; margin-top:5px; cursor:pointer; font-size:10px;'>Accept</button>
        </div>
    `).join('');
};

window.acceptJob = (jobId) => {
    if (!currentJobBoard) return;
    const job = currentJobBoard.acceptJob(jobId, myUsername);
    if (job.status === 'success') {
        if (!player.activeJobs) player.activeJobs = [];
        player.activeJobs.push(job.job);
        alert(`Accepted: ${job.job.title}`);
        window.refreshJobBoard();
    } else {
        alert('Could not accept job: ' + job.message);
    }
};

window.completeJob = (jobId) => {
    if (!currentJobBoard) return;
    const result = currentJobBoard.completeJob(jobId, myUsername);
    if (result.status === 'success') {
        player.xp += result.rewards.xp;
        player.currency += result.rewards.currency;
        alert(`Completed! +${result.rewards.xp}XP +${result.rewards.currency}CR`);
        window.refreshJobBoard();
    }
};

// ========== FACILITY SYSTEM FUNCTIONS ==========
window.toggleFacilityPanel = () => {
    if (!facilitiesUI) return;
    if (facilitiesUI.style.display === 'none') {
        facilitiesUI.style.display = 'block';
        window.updateFacilityUI();
    } else {
        facilitiesUI.style.display = 'none';
    }
};

window.updateFacilityUI = () => {
    const facList = document.getElementById('facility-list');
    if (!facList) return;
    
    if (playerFacilities.length === 0) {
        facList.innerHTML = '<small style="color:#aaa;">No facilities. Build one!</small>';
        return;
    }
    
    facList.innerHTML = playerFacilities.map((fac, i) => `
        <div style="background:rgba(0,255,0,0.1); padding:5px; margin:3px 0; border-left:2px solid #0f0;">
            <b>${fac.type} Lvl${fac.level}</b><br>
            <small>Resources: ${JSON.stringify(fac.resources || {}).substring(0, 30)}...</small><br>
            <button onclick='window.harvestFacility(${i})' style='width:100%; background:#0f0; color:black; border:none; padding:2px; margin-top:3px; cursor:pointer; font-size:10px;'>Harvest</button>
        </div>
    `).join('');
};

window.harvestFacility = (index) => {
    if (!playerFacilities[index]) return;
    const facility = playerFacilities[index];
    
    fetch(SERVER_URL + '/api/facility/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, facility_id: facility.id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            facility.resources = data.total;
            updateFacilityUI();
            alert(`Harvested: ${JSON.stringify(data.harvested)}`);
        }
    })
    .catch(e => console.error('Harvest error:', e));
};

window.createFacility = (type) => {
    fetch(SERVER_URL + '/api/facility/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, type: type })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            playerFacilities.push({ id: data.facility_id, type: type, level: 1, resources: {} });
            alert(`${type} created!`);
            window.updateFacilityUI();
        }
    })
    .catch(e => console.error('Create facility error:', e));
};

// ========== NETWORK DATA QUANTIZATION ==========
function quantizePlayerData(player) {
    // Compress player position and rotation data
    return {
        px: Math.round(player.pos.x),
        pz: Math.round(player.pos.z),
        py: Math.round(player.pos.y),
        ry: Math.round(player.rotation.y * 100) / 100,
        h: Math.round(player.health),
        e: Math.round(player.energy),
        l: player.level,
        xp: player.xp
    };
}

function dequantizePlayerData(qData) {
    return {
        pos: { x: qData.px, y: qData.py, z: qData.pz },
        rotation: { y: qData.ry },
        health: qData.h,
        energy: qData.e,
        level: qData.l,
        xp: qData.xp
    };
}

// Expose p5 functions to global scope because we are in a module
window.preload = preload;
window.setup = setup;
window.draw = draw;
window.keyPressed = keyPressed;
window.mouseWheel = mouseWheel;
window.mousePressed = mousePressed;
window.windowResized = windowResized;