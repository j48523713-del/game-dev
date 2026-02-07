# Quick Start & Testing Guide

## 🚀 Quick Start

### Option 1: Local Development (Recommended for Testing)

#### Step 1: Start the Server
```bash
python server.py
# Choose port (default: 3000)
# The server will provide URLs to connect
```

#### Step 2: Start the Client
```bash
# In a new terminal, run:
npm install
npm start

# Or open: http://localhost:3000/index.html
```

#### Step 3: Create Account & Login
1. Click "Sign Up" to create a test account
2. Enter username and password
3. Click "Sign Up" button
4. Use same credentials to login

### Option 2: Desktop App (Production)
```bash
# Build executable:
# Windows: Run Build_Game.bat
# macOS: npm run build-mac

# Run the packaged app from dist/ folder
```

---

## 🧪 Testing Checklist

### ✅ Core Gameplay Tests

#### [  ] Mech Combat
- [ ] Spawn with GUNDAM suit
- [ ] Move with W/A/S/D
- [ ] Sprint with Shift
- [ ] Jump/Fly with Space
- [ ] Fire weapons with Left Click
- [ ] Shield with Right Click
- [ ] Switch weapons with 1-2-3 keys
- [ ] Deal damage to enemies
- [ ] Enemies attack you back

#### [  ] Multiple Mechs
- [ ] Switch between at least 3 different suit types
- [ ] Each suit has different stats/speed
- [ ] Verify unique weapon loadouts

#### [  ] Procedural Worlds
- [ ] Visit Terra planet
  - [ ] See market plaza
  - [ ] See residential zones
  - [ ] See industrial areas
  - [ ] See wilderness
- [ ] Visit Mars planet
  - [ ] See rocky terrain
  - [ ] See different visual style
  - [ ] See outpost POIs
- [ ] Visit Space station
  - [ ] See asteroid fields
  - [ ] See space stations

#### [  ] Dynamic Missions
- [ ] Talk to MissionGiver NPC (E key)
- [ ] Accept a mission
- [ ] See mission in "CURRENT MISSIONS" panel
- [ ] Complete mission objectives
- [ ] Receive XP reward

#### [  ] Job Board (Press J)
- [ ] Open Job Board (J key)
- [ ] See 5 available jobs
- [ ] Jobs have different types
- [ ] Rewards shown (XP + Credits)
- [ ] Click "Accept" on a job
- [ ] Active job added to inventory
- [ ] Refresh generates new jobs

#### [  ] NPCs
- [ ] Find MissionGiver and interact (E)
- [ ] Find Merchant and interact (E)
- [ ] Find Stellar Beacon and interact (E)
- [ ] See dialogue/interaction prompts

### ✅ Progression Tests

#### [  ] Player Level & XP
- [ ] Kill enemies and gain XP
- [ ] Complete missions and gain XP
- [ ] Level increases when maxXP reached
- [ ] XP display updates in UI

#### [  ] Persistent Data
- [ ] Gain items/currency
- [ ] Close and reopen game
- [ ] Data is restored
- [ ] Level/XP saved
- [ ] Inventory items saved

#### [  ] Inventory System (Press I)
- [ ] Open Inventory (I key)
- [ ] Collect loot from enemies
- [ ] See items listed
- [ ] See item descriptions
- [ ] Currency displayed
- [ ] Can use/consume items

#### [  ] Facilities (Press B)
- [ ] Open Facilities panel (B key)
- [ ] Create a Mine
- [ ] Create a Farm
- [ ] See facilities listed
- [ ] Harvest resources
- [ ] Resources accumulate
- [ ] Can harvest multiple times

### ✅ Multiplayer Tests

#### [  ] Real-Time Multiplayer
- [ ] Open 2 browser windows to localhost:3000
- [ ] Login as different users
- [ ] Both see each other on map
- [ ] Player positions update in real-time
- [ ] See player names/types
- [ ] Players disappear when offline

#### [  ] Friends System
- [ ] Click "👥 Friends" button
- [ ] Search for another player
- [ ] Click "+" to add friend
- [ ] Confirm friend added
- [ ] See friends in friend list

#### [  ] Party System (Press P)
- [ ] Open Party panel (P key)
- [ ] Click "Create" to start party
- [ ] Get party ID shown
- [ ] In 2nd client, join party via ID
- [ ] See party members list update
- [ ] Both clients show same members
- [ ] Click "Leave" to exit party
- [ ] Party dissolves when empty

#### [  ] Chat System
- [ ] Open Chat (top-right area)
- [ ] Type global message
- [ ] Press ENTER to send
- [ ] Message appears for all players
- [ ] Private message: `/msg username Hello`
- [ ] Private message appears only to recipient
- [ ] See chat history

#### [  ] Leaderboard
- [ ] Check top-right corner
- [ ] See "TOP PILOTS" list
- [ ] Ranked by level
- [ ] Shows top 10 players
- [ ] Updates when players level up

### ✅ Technical Tests

#### [  ] Cross-Platform Support
- [ ] Test on Windows
- [ ] Test on macOS (if available)
- [ ] Test in different browsers
- [ ] Desktop app launches correctly

#### [  ] Server Architecture
- [ ] Server accepts multiple clients
- [ ] Handles 3+ simultaneous players
- [ ] No crashes with simultaneous actions
- [ ] Graceful handling of disconnects

#### [  ] Network Quantization
- [ ] Monitor network tab in DevTools
- [ ] Each update ~60 bytes (not 150+)
- [ ] Smooth multiplayer at 50ms update rate
- [ ] No lag with quantized data

#### [  ] Data Integrity
- [ ] Rapid server restarts don't corrupt data
- [ ] Player data persists after server crash
- [ ] Multiple simultaneous saves work
- [ ] No data loss observed

#### [  ] Rendering Performance
- [ ] Game runs smoothly at 60 FPS
- [ ] No stuttering during exploration
- [ ] UI loads quickly
- [ ] Multiple objects rendered without lag

---

## 📊 Test Scenarios

### Scenario 1: Solo Campaign
```
1. Login as Player1
2. Kill 10 enemies (gain XP)
3. Level up to Level 2
4. Accept 3 jobs from job board
5. Complete all 3 jobs
6. Build 1 Mine facility
7. Harvest resources 2 times
8. Close game and reopen
9. Verify all progress saved ✅
```

### Scenario 2: Multiplayer Cooperation
```
1. Player1 and Player2 login
2. Player1 creates party
3. Player2 joins party
4. Both accept same job
5. Kill enemies together
6. Complete job (both get rewards) ✅
7. Both see each other take damage ✅
8. Trade items at merchant ✅
```

### Scenario 3: Economy & Trading
```
1. Kill 20 enemies (collect scrap)
2. Build Mine facility
3. Harvest 3 times (accumulate ore)
4. Build Farm facility
5. Harvest Farm 2 times (get crops)
6. Visit Merchant
7. Buy/Sell items with currency ✅
```

### Scenario 4: World Exploration
```
1. Start on Terra
2. Explore all zones
3. Teleport to Mars
4. Explore Mars terrain
5. Teleport to Space
6. See asteroid fields
7. Return to Terra
8. Verify POI system working ✅
```

### Scenario 5: Stress Test
```
1. Login 5 players simultaneously
2. All move around Terra
3. All accept jobs
4. All take damage/heal
5. All send chat messages
6. Verify no crashes
7. Verify all data saves correctly ✅
```

---

## 🐛 Troubleshooting

### Game Won't Connect to Server
```
Error: Could not connect to SERVER_URL

Solution:
1. Check if server.py is running
2. Verify port 3000 is not blocked
3. Check firewall settings
4. Try http://localhost:3000 directly
```

### Data Not Saving
```
Error: Progress lost after reload

Solution:
1. Check players.json exists in server folder
2. Verify write permissions on server folder
3. Check server console for save errors
4. Ensure user exists in players.json
```

### Multiplayer Not Working
```
Error: Can't see other players

Solution:
1. Verify both clients on same SERVER_URL
2. Check network latency
3. Open DevTools > Network tab
4. Look for /update requests
5. Verify response includes 'players' field
```

### Performance Issues
```
Error: Lag/Stuttering

Solution:
1. Close other browser tabs
2. Reduce game resolution (if option available)
3. Check CPU usage in Task Manager
4. Verify graphics card drivers updated
5. Try different browser
```

### Friends/Party Not Working
```
Error: Can't add friend or join party

Solution:
1. Verify player username spelled correctly
2. Ensure other player is online
3. Check server logs for errors
4. Try creating new party
5. Check PLAYERS_FILE is valid JSON
```

---

## 📈 Performance Benchmarks

### Expected Performance
| Metric | Expected | Pass |
|--------|----------|------|
| FPS | 60 | [ ] |
| Update Latency | <100ms | [ ] |
| Load Time | <5s | [ ] |
| Memory Usage | <500MB | [ ] |
| Bandwidth/Player | 4.8 KB/s | [ ] |
| Max Concurrent Players | 50+ | [ ] |

---

## 🔍 DevTools Inspection

### Check Network Quantization
```javascript
// In browser console:
// Monitor network requests
// Filter for '/update' endpoints
// Check payload size < 100 bytes ✅
```

### Check Local Storage
```javascript
// Check if player data saved
console.log(localStorage)
// Should see game-state, player-progress, etc.
```

### Check Console for Errors
```
- No 404 errors for API endpoints
- No unhandled promise rejections
- No CORS errors
```

---

## 📝 Test Results Template

```
Game Version: 1.0.0
Test Date: ___________
Tester: ___________

Gameplay Tests: ___/20
Progression Tests: ___/5
Multiplayer Tests: ___/5
Technical Tests: ___/5

Total Score: ___/35

Issues Found:
1. ___________
2. ___________

Notes:
___________
```

---

## ✅ Final Sign-Off

When all tests pass:
1. [ ] Delete test player accounts
2. [ ] Backup players.json
3. [ ] Clear chat logs (if needed)
4. [ ] Document any known issues
5. [ ] Update version number
6. [ ] Commit changes to version control

**All Features Tested & Working! 🎉**
