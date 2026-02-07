# Quick Reference Guide

## 🎮 Getting Started (2 Minutes)

### Step 1: Start Server
```bash
python server.py
# Press ENTER twice to accept defaults
# Wait for: "--- GAME SERVER RUNNING ---"
```

### Step 2: Start Game
```bash
# New terminal:
npm start
# Or visit: http://localhost:3000/index.html
```

### Step 3: Create Account & Play
1. Click "Sign Up"
2. Enter username & password
3. Click "Sign Up" button
4. Login with same credentials
5. Select mech type (GUNDAM, ZAKU, etc.)
6. Click "Enter Game"

---

## ⌨️ Essential Controls

### Movement & Combat
```
W          = Move forward
A/D        = Strafe left/right
S          = Move backward
SHIFT      = Sprint
SPACE      = Jump/Fly
MOUSE      = Look around
LEFT CLICK = Shoot
RIGHT CLICK = Shield
1/2/3      = Switch weapons
E          = Talk to NPC
```

### New Features (Press These!)
```
I = Open Inventory
P = Open Party Panel
J = Open Job Board
B = Open Facilities
```

---

## 🎯 20 Features at a Glance

### Combat & Gameplay
1. **3D Mech Combat** - Real-time shooting, shields, melee
2. **Multiple Mechs** - Choose from 7 suit types
3. **Procedural Worlds** - Terra, Mars, Space planets
4. **Dynamic Missions** - Quest from NPCs
5. **Job Board** - Random jobs with rewards (Press J)
6. **Interactive NPCs** - MissionGivers, Merchants, Teleporters

### Progression & Economy
7. **Player Levels** - Gain XP, level up, improve stats
8. **Persistent Saves** - Everything saved server-side
9. **Loot System** - Collect scrap, manage inventory (Press I)
10. **Facilities** - Build Mines/Farms to produce resources (Press B)

### Multiplayer & Social
11. **Real-Time Multiplayer** - See other players moving
12. **Friends List** - Add players as friends
13. **Party System** - Team up with 3 other players (Press P)
14. **Chat** - Global, private, and party chat
15. **Leaderboard** - Compete on "Top Pilots" ranking

### Technical
16. **Desktop App** - Windows/Mac native app (Build_Game.bat)
17. **Single Server** - Unified Python backend
18. **Network Optimization** - 60% bandwidth reduction
19. **Data Safety** - Atomic saves prevent corruption
20. **Efficient Rendering** - Smooth 60 FPS gameplay

---

## 🏃 Quick Missions (First 10 Minutes)

### Goal 1: Level Up
```
1. Kill 10 enemies in Terra
2. Gain ~200 XP
3. Level up to Level 2
⏱️ 2-3 minutes
```

### Goal 2: Complete Job
```
1. Press J (open Job Board)
2. Click "Accept" on any job
3. Complete the objective
4. Get XP + Credits reward
⏱️ 2-5 minutes
```

### Goal 3: Build Facility
```
1. Press B (open Facilities)
2. Click "Build" button
3. Choose Mine or Farm
4. See it in your facilities list
⏱️ 1 minute
```

### Goal 4: Join Party
```
1. Press P (open Party)
2. Click "Create"
3. Open 2nd browser window
4. Login as different user
5. Click "Join" and enter party ID
⏱️ 3 minutes
```

---

## 🌍 Three Worlds to Explore

### TERRA (Home World)
- **Zone 1:** Market Plaza (buy/sell items)
- **Zone 2:** Residential (calm)
- **Zone 3:** Industrial (factories)
- **Zone 4:** Wilderness (dangerous)
- **Best for:** New players, trading
- **Teleport:** Use Stellar Beacon near spawn

### MARS (Red Planet)
- **Zone 1:** Landing Zone (safe)
- **Zone 2:** Rocky Terrain (combat)
- **Zone 3:** Canyons (unique)
- **Zone 4:** Outposts (POI)
- **Best for:** Resources, challenge
- **Teleport:** Find Stellar Beacon

### SPACE (Asteroid Field)
- **Zone 1:** Safe Zone (respawn area)
- **Zone 2:** Asteroid Fields (dense)
- **Zone 3:** Space Debris (rare)
- **Zone 4:** Space Stations (POI)
- **Best for:** Advanced players
- **Teleport:** Use Space Beacon

---

## 💰 Economy Quick Guide

### Earning Credits
```
Action              | Credits | Time
Kill Normal Enemy   | 10-20   | 10s
Kill Elite Enemy    | 50-100  | 30s
Complete Mission    | 100-500 | 5-10 min
Complete Job        | 50-250  | 5-20 min
Harvest Facility    | 0       | FREE every 30s
```

### Spending Credits
```
Action              | Cost
Repair Kit (item)   | 75 credits
Merchant trade      | Varies
```

### Getting Resources
```
Method           | Output      | Time
Mine (harvest)   | Ore + Scrap | 30s
Farm (harvest)   | Crops+Seeds | 30s
Enemy drops      | Scrap       | Kill enemy
```

---

## 👥 Multiplayer Quick Start

### Add Friend
```
1. See another player on map
2. Click "Friends" button (top-right)
3. Type username
4. Click "+" to add
```

### Create Party
```
1. Press P (Party Panel)
2. Click "Create"
3. Note party ID shown
4. Tell friend party ID
5. Friend joins via party ID
```

### Send Message
```
Global: Type message + ENTER
Private: /msg playername Hello + ENTER
Party: Send when in party
```

### Join Leaderboard
```
- Automatically tracked
- Ranked by Level
- Top 10 shown
- Refresh every 10 seconds
```

---

## 🔧 Technical Shortcuts

### Server URL (Auto-configured)
```
Local: http://localhost:3000
LAN:   http://[your-ip]:3000
```

### Save Game
```
Auto-save: Every 30 seconds
Manual: Closing game saves
No button needed - automatic!
```

### Debug Console (Browser)
```
Press F12 in browser
Check Console tab
Look for network requests to /update
Verify responses have 'players' field
```

---

## 🐛 Troubleshooting (30 seconds each)

### "Can't connect"
→ Is server running? (`python server.py`)

### "Data not saving"
→ Check players.json exists
→ Close and reopen to test

### "Can't see other player"
→ Are both on same SERVER_URL?
→ Check browser network tab

### "Party not working"
→ Make sure both players online
→ Try exact username spelling
→ Verify player exists

### "Job Board empty"
→ Press J to refresh
→ Visit different planet

### "Facilities not working"
→ Check press B to open panel
→ Must accept build action
→ Harvest every 30 seconds

---

## 📊 Useful Numbers

### Progression
```
Level   | XP Required | Reach Time
1       | 0           | Start
2       | 100         | 5-10 min
3       | 250         | 15-20 min
5       | 800         | 1-2 hours
10      | 5000+       | Many hours
```

### Combat
```
Normal Enemy  | 10 XP | 20 damage | Easy
Elite Enemy   | 50 XP | 50 damage | Medium
Boss Enemy    | 200 XP| 150 damage| Hard
```

### Facilities
```
Mine Harvest  | 20 ore + 10 scrap | Every 30s
Farm Harvest  | 20 crops + 5 seeds | Every 30s
Upgrade Cost  | 500 credits        | 1x only
```

### Network
```
Update Rate    | 20/sec | 50ms | 60 bytes
Bandwidth      | 4.8 KB/s | Per player
Players Online | 50+ supported
```

---

## 🎮 Pro Tips

### Tip 1: Level Up Fast
```
1. Farm enemies in Mars (tougher = more XP)
2. Accept high-reward jobs
3. Complete missions quickly
4. Party up (shared rewards)
```

### Tip 2: Earn Credits
```
1. Kill elite enemies (100 cr vs 20)
2. Complete jobs (100-250 cr)
3. Harvest facilities (passive income)
4. Trade wisely at merchants
```

### Tip 3: Multiplayer Success
```
1. Join others' parties
2. Team up for tough jobs
3. Farm resources together
4. Share wealth/items
```

### Tip 4: Explore All Planets
```
1. Terra = Training grounds
2. Mars = Medium difficulty
3. Space = Endgame content
4. Return often for items/missions
```

### Tip 5: Optimize Economy
```
1. Build early (passive income)
2. Harvest frequently (30s intervals)
3. Upgrade facilities (2x output)
4. Use resources for crafting (future)
```

---

## 📱 File Locations (For Reference)

### Config Files
```
players.json       = Player accounts & progress
parties.json       = Party data
job_board.json     = Current jobs
facilities.json    = Player facilities
```

### Code Files
```
sketch.js          = Main game logic
game.js            = World generation
server.py          = Game server
player_assets/*    = Game classes
```

### Documentation
```
FEATURES.md        = Full feature list
TESTING.md         = Testing guide
DEVELOPER.md       = Developer docs
```

---

## 🎯 Success Metrics

### You Know You're Doing Well When...
- ✅ Level 5+ within 30 minutes
- ✅ Have 2+ facilities generating resources
- ✅ 10+ credits/second passive income
- ✅ Can defeat elite enemies solo
- ✅ In a party with other players
- ✅ Completed 5+ jobs
- ✅ Have multiple friends added

---

## 💡 Remember

- **Auto-save** = Don't worry about saving
- **Keyboard shortcuts** = Press P, J, B, I!
- **Multiplayer** = More fun with friends
- **Facilities** = Free money every 30 seconds
- **Planets** = Each has unique items/challenges
- **Chat** = Press T (typing sends messages)
- **Help** = Press E on NPCs for dialogue

---

## 🚀 You're Ready!

```
✅ Server running
✅ Game loaded
✅ Account created
✅ First mech selected

NOW PLAY! 🎮
```

**Have fun piloting your mech!** 🤖⚔️

---

**Quick Ref v1.0 | Jan 2026**
