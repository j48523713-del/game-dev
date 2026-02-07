# Developer Documentation

## 🏗️ Architecture Overview

```
Operation Cyberspace
├── Client (Web/Electron)
│   ├── sketch.js (Main game loop, imports)
│   ├── game.js (World, rendering)
│   ├── player_assets/
│   │   ├── player.js (Player class)
│   │   ├── Suits/ (Mech definitions)
│   │   ├── Party.js (Party management)
│   │   ├── JobBoard.js (Job system)
│   │   ├── JobTemplates.js (Job definitions)
│   │   ├── Facility.js (Economy system)
│   │   └── ... (NPCs, Enemies, Items)
│   ├── index.html (Main entry point)
│   └── style.css (UI styling)
│
└── Server (Python)
    ├── server.py (HTTP server, game logic)
    ├── players.json (Persistent player data)
    ├── parties.json (Party data)
    ├── job_board.json (Job board state)
    └── facilities.json (Player facilities)
```

## 📡 Network Protocol

### Update Cycle (20 updates/sec)
```
Client → Server:
POST /update
{
  "id": "player_id",
  "data": {
    "px": 1234,      // quantized x
    "pz": 5678,      // quantized z
    "py": -50,       // quantized y
    "ry": 3.14,      // rotation y
    "h": 85,         // health
    "e": 120,        // energy
    "l": 5,          // level
    "xp": 450,       // experience
    "isMoving": true,
    "shooting": false,
    "melee": false,
    "shield": true,
    "planet": "TERRA"
  },
  "username": "PlayerName",
  "lastEventId": 42
}

Server → Client:
{
  "players": {
    "other_id": { /* quantized data */ },
    "another_id": { /* quantized data */ }
  },
  "events": [
    { "id": 43, "type": "SPAWN_ENEMIES", "data": {...} }
  ],
  "chat": [
    { "sender": "...", "message": "...", "target": null }
  ]
}
```

### Quantization Details
```javascript
// 60% bandwidth reduction via:
quantizePlayerData(player) {
  px: Math.round(player.pos.x),      // Integer
  pz: Math.round(player.pos.z),
  py: Math.round(player.pos.y),
  ry: Math.round(player.rotation.y * 100) / 100,  // 2 decimals
  h: Math.round(player.health),      // Integer
  e: Math.round(player.energy),      // Integer
  l: player.level,                   // Already int
  xp: player.xp                      // Already int
}
```

## 🎮 Class Hierarchies

### Player Hierarchy
```
Suit (Base Class)
  ├── position, velocity, health
  ├── weapons, energy, stats
  └── update(), draw(), takeDamage()

Player (Extends Suit)
  ├── inventory, currency
  ├── missions, jobs, party
  ├── experience, level
  └── update() handles input
```

### NPC Hierarchy
```
NPC (Base Class)
  ├── position, type, interaction
  └── interact(player)

├── MissionGiver (Extends NPC)
│   └── missions, offeredMissions
│
├── Merchant (Extends NPC)
│   └── stock (items for sale)
│
└── StellarBeacon (Extends NPC)
    └── teleportTo(planet)
```

## 📊 Data Models

### Player Save Data
```json
{
  "username": "PlayerName",
  "password": "sha256_hash",
  "save_data": {
    "level": 5,
    "xp": 450,
    "currency": 1250,
    "inventory": [
      {"id": "scrap_001", "name": "Scrap", "quantity": 15}
    ],
    "activeMissions": [...],
    "completedMissions": [...],
    "activeJobs": [...],
    "facilities": [
      {"id": "mine_001", "type": "MINE", "level": 1, "resources": {...}}
    ],
    "partyId": "party_123",
    "missionStats": {...}
  },
  "friends": ["Friend1", "Friend2"]
}
```

### Party Data
```json
{
  "id": "party_123456789",
  "leader": "LeaderName",
  "members": ["Player1", "Player2", "Player3"],
  "created_at": 1234567890,
  "invites": [
    {"username": "Player4", "inviter": "Player1", "timestamp": 1234567890}
  ]
}
```

### Facility Data
```json
{
  "id": "facility_123",
  "type": "MINE|FARM",
  "owner": "PlayerName",
  "level": 1,
  "position": {"x": 1000, "y": -50, "z": 1000},
  "resources": {
    "ore": 45,
    "scrap": 12
  },
  "production_rate": {
    "ore": 10,
    "scrap": 2
  },
  "last_harvest": 1234567890
}
```

## 🔧 Adding New Features

### Example: Adding a New Suit Type

**Step 1: Define Suit Stats** (player_assets/Suits/suit_arrays.js)
```javascript
'NEW_SUIT': {
  stats: {
    maxHealth: 150,
    maxEnergy: 200,
    speed: 6,
    acceleration: 1.2
  },
  weapons: [
    { name: 'Beam Rifle', damage: 45, cooldown: 500 },
    { name: 'Sword', damage: 80, cooldown: 1000 },
    { name: 'Missiles', damage: 60, cooldown: 800 }
  ],
  model: 'models/new_suit.gltf'
}
```

**Step 2: Add to Suit List** (game.js)
```javascript
let suitTypes = [..., 'NEW_SUIT'];
```

**Step 3: Test**
```javascript
// In game:
player = new Player('NEW_SUIT');
// Verify stats load correctly
```

### Example: Adding a New Mission Type

**Step 1: Define Mission Template** (player_assets/MissionTemplates.js)
```javascript
{
  id: 'collect_components',
  title: 'Collect Components',
  description: 'Find and collect %count% mechanical components',
  objectives: [{
    type: 'collect',
    targetType: 'component',
    count: 8
  }],
  rewards: {
    xp: 200,
    currency: 150,
    items: ['blueprint_001']
  }
}
```

**Step 2: Add Logic** (player_assets/MissionGiver.js)
```javascript
// Track collection in player.missionStats
// Trigger completion when count reached
```

**Step 3: Test Mission Completion**
```javascript
// Accept mission, collect items, verify completion
```

### Example: Adding New Server Endpoint

**Step 1: Add Handler** (server.py)
```python
elif path == '/api/features/new_feature':
    action = data.get('action')
    username = data.get('username')
    
    if action == 'get_data':
        # Load data
        result = get_feature_data(username)
        self.serve_json(result)
    
    elif action == 'update_data':
        # Atomic update
        success = atomic_save_feature_data(username, data.get('feature_data'))
        self.serve_json({'status': 'success' if success else 'error'})
```

**Step 2: Call from Client** (sketch.js)
```javascript
fetch(SERVER_URL + '/api/features/new_feature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        action: 'get_data',
        username: myUsername
    })
})
.then(res => res.json())
.then(data => {
    // Handle response
})
.catch(e => console.error('Error:', e));
```

## 🐛 Debugging Guide

### Enable Debug Mode
```javascript
// In sketch.js setup():
window.DEBUG = true;
```

### Check Network Requests
```javascript
// Monitor in DevTools Console
// All requests logged automatically
```

### Check Server Logs
```bash
# Server outputs:
# [SAVE] Saved progress for PlayerName
# [ERROR] Failed to read file: ...
# [OPTIONS] /api/endpoint
```

### Common Issues & Fixes

**Issue: Player data not persisting**
```
Check:
1. Is atomic_save_json being called?
2. Check players.json exists and is writable
3. Check for JSON format errors
4. Verify username in save_data matches login
```

**Issue: Multiplayer not syncing**
```
Check:
1. Are /update requests being sent?
2. Check for CORS errors in console
3. Verify both clients have same SERVER_URL
4. Check network latency in DevTools
```

**Issue: Jobs not working**
```
Check:
1. Is JobBoard instantiated?
2. Are job objectives initialized?
3. Check job completion logic in player
4. Verify job rewards applied correctly
```

## 📈 Performance Optimization

### Current Optimizations
- Quantized network data (60% bandwidth reduction)
- Atomic file operations (thread-safe)
- UI element caching
- Lazy world chunk loading
- Procedural generation (no large asset files)

### Future Optimizations
```javascript
// 1. Implement object pooling for particles
class ParticlePool {
    constructor(size) {
        this.pool = [];
        this.active = [];
    }
    
    get(x, y, z) {
        // Reuse from pool instead of creating
    }
}

// 2. Add frustum culling
function cullOffscreenObjects() {
    // Only render visible objects
}

// 3. Implement spatial hashing
class SpatialGrid {
    // Query nearby objects in O(1)
}
```

## 🔐 Security Considerations

### Current Security
- Password hashing (SHA256)
- Session-based player isolation
- Atomic writes prevent data corruption
- Server-side validation

### Future Security
```python
# 1. Add rate limiting
def rate_limit_check(ip_address):
    # Prevent DDoS/brute force

# 2. Add input validation
def validate_username(username):
    # Prevent injection attacks

# 3. Add encryption
def encrypt_save_data(data):
    # Encrypt sensitive player data
```

## 📚 File Structure Reference

```
app/
├── sketch.js                 # Main entry, imports all classes
├── game.js                   # World generation, rendering
├── index.html                # HTML entry point
├── style.css                 # UI styling
├── server.py                 # Python HTTP server
│
├── player_assets/
│   ├── player.js             # Player class
│   ├── Suits/
│   │   ├── Suit.js          # Base suit class
│   │   ├── suit_arrays.js   # Suit stats/models
│   │   └── suit_animator.js # Animation handling
│   │
│   ├── Party.js              # Party management
│   ├── JobBoard.js           # Job board system
│   ├── JobTemplates.js       # Job definitions
│   ├── Facility.js           # Facilities system
│   │
│   ├── Enemy.js              # Enemy AI
│   ├── NPC.js                # Base NPC class
│   ├── MissionGiver.js       # Mission giver NPC
│   ├── Merchant.js           # Merchant NPC
│   ├── StellarBeacon.js      # Teleporter NPC
│   │
│   ├── Mission.js            # Mission tracking
│   ├── MissionTemplates.js   # Mission definitions
│   ├── Inventory.js          # Inventory system
│   ├── Item.js               # Item definitions
│   ├── Projectile.js         # Projectile physics
│   └── ...
│
├── user_data/
│   ├── players.json          # User database
│   ├── parties.json          # Party data
│   ├── job_board.json        # Job board state
│   └── facilities.json       # Facilities data
│
├── Build_Game.bat            # Windows build script
├── start_server.bat          # Server launcher
└── README.md                 # Main documentation
```

## 🎓 Best Practices

### Code Organization
```javascript
// 1. Group related functionality
class Player extends Suit {
    // Constructor
    // Movement methods
    // Combat methods
    // Data persistence methods
}

// 2. Use clear naming
window.quantizePlayerData = () => {}  // Clear purpose
window.qpd = () => {}                  // Avoid abbreviations

// 3. Comment complex logic
// Quantize position to reduce bandwidth by 60%
const px = Math.round(player.pos.x);
```

### Error Handling
```javascript
// Always include error handling
fetch(url)
    .then(res => res.json())
    .then(data => {
        if (data.status === 'error') {
            console.error('API Error:', data.message);
            return;
        }
        // Process data
    })
    .catch(e => console.error('Network Error:', e));
```

### Testing
```javascript
// Modular functions are easier to test
function quantizePlayerData(player) {
    // Pure function, no side effects
    return { px: ..., pz: ..., ... };
}

// Test independently
let result = quantizePlayerData(mockPlayer);
assert(result.px === 123);
```

---

**Last Updated:** January 2026
**Version:** 1.0.0
**Maintainer:** Development Team
