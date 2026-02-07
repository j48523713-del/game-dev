import os
import socket
import http.server
import socketserver
import json
import time
import threading
import hashlib
import subprocess
import shutil
import re
import random
import tempfile
import sys

# Configuration
PORT = 3000
SERVER_SUBDOMAIN = f"op-cyber-{int(time.time())}" # Dynamic name to avoid port 80 conflicts
players = {}  # Stores player data: { id: { data: {...}, last_seen: timestamp } }
PLAYERS_FILE = 'players.json'
chat_log = [] # Stores {sender, message, time}
RESET_ON_START = False # <--- CHANGE TO FALSE AFTER FIRST RUN TO KEEP PROGRESS
server_events = [] # Stores {id, type, timestamp}
event_counter = 0
CUSTOM_SUITS_FILE = 'custom_suits.json'
CUSTOM_MAP_FILE = 'custom_map.json'
PARTIES_FILE = 'parties.json'
JOB_BOARD_FILE = 'job_board.json'
FACILITIES_FILE = 'facilities.json'
parties = {} # Stores party data: { partyId: {...} }
job_boards = {} # Stores job boards per planet: { planetName: [...jobs] }
facilities = {} # Stores player facilities: { ownername: [...] }
save_lock = threading.RLock()  # Lock for atomic saves

def update_client_config(server_url, fallback_urls):
    print(f"[AUTO-CONFIG] Updating sketch.js with: {server_url}")
    fb_str = ", ".join(fallback_urls)
    for fname in ['sketch.js', 'Client/sketch.js', 'app/sketch.js']:
        if os.path.exists(fname):
            with open(fname, 'r', encoding='utf-8') as f: content = f.read()
            content = re.sub(r'let SERVER_URL = ".*";', f'let SERVER_URL = "{server_url}";', content)
            content = re.sub(r'let FALLBACK_URLS = \[.*\];', f'let FALLBACK_URLS = [{fb_str}];', content)
            with open(fname, 'w', encoding='utf-8') as f: f.write(content)

def atomic_save_json(filepath, data):
    """Atomically write JSON to file to prevent corruption"""
    global save_lock
    with save_lock:
        try:
            # Write to temporary file first
            fd, temp_path = tempfile.mkstemp(suffix='.json', dir=os.path.dirname(filepath) or '.')
            with os.fdopen(fd, 'w') as f:
                json.dump(data, f, indent=2)
            # Atomic rename
            os.replace(temp_path, filepath)
            return True
        except Exception as e:
            print(f"[ERROR] Failed to save {filepath}: {e}")
            return False

def atomic_read_json(filepath):
    """Atomically read JSON from file"""
    global save_lock
    with save_lock:
        try:
            if os.path.exists(filepath):
                with open(filepath, 'r') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            print(f"[ERROR] Failed to read {filepath}: {e}")
            return {}

class GameRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Centralized CORS header logic for all API-related requests
        path = self.path.split('?')[0]
        if path.startswith('/api/') or path in ['/login', '/signup', '/update', '/chat']:
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight browser checks
        print(f"[OPTIONS] {self.path}")
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        # Allow requested headers
        requested_headers = self.headers.get('Access-Control-Request-Headers')
        if requested_headers:
            self.send_header('Access-Control-Allow-Headers', requested_headers)
        else:
            self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Max-Age', '86400')
        super().end_headers() # Use super to avoid recursive loop
    
    def serve_json(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_GET(self):
        if self.path == '/api/stats':
            online = [{'id': k, 'username': v.get('username'), 'type': v['data'].get('type'), 'last_seen': v['last_seen']} for k,v in players.items()]
            self.serve_json(online)
        elif self.path in ['/api/custom_suits', '/api/map']:
            fpath = CUSTOM_SUITS_FILE if 'suits' in self.path else CUSTOM_MAP_FILE
            if os.path.exists(fpath):
                with open(fpath, 'rb') as f:
                    content = f.read()
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Content-Length', str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
            else:
                self.serve_json({} if 'suits' in self.path else [])
        elif self.path == '/api/leaderboard':
            leaderboard = []
            if os.path.exists(PLAYERS_FILE):
                with open(PLAYERS_FILE, 'r') as f: players_db = json.load(f)
                for username, doc in players_db.items():
                    save = doc.get('save_data', {})
                    level = save.get('level', 1)
                    leaderboard.append({'username': username, 'level': level})
            # Sort by level descending
            leaderboard.sort(key=lambda x: x['level'], reverse=True)
            self.serve_json(leaderboard[:10])
        else:
            super().do_GET()

    def do_POST(self):
        # Handle player updates via POST requests
        print(f"[POST] {self.path}")
        path = self.path.split('?')[0].rstrip('/')
        
        try:
            # Safely read request body
            content_length = self.headers.get('Content-Length', '0')
            try:
                length = int(content_length)
            except ValueError:
                length = 0
            
            data = {}
            if length > 0:
                try:
                    raw_data = self.rfile.read(length).decode('utf-8')
                    data = json.loads(raw_data)
                except (json.JSONDecodeError, UnicodeDecodeError) as e:
                    print(f"[ERROR] JSON parse error: {e}")
                    self.serve_json({'status': 'error', 'message': 'Invalid JSON'})
                    return
            
            if path in ['/signup', '/login']:
                u, p = data.get('username', '').strip(), data.get('password', '').strip()
                
                if not u or not p:
                    self.serve_json({'status': 'error', 'message': 'Invalid input'})
                    return

                with save_lock:
                    players_db = {}
                    if os.path.exists(PLAYERS_FILE):
                        try:
                            with open(PLAYERS_FILE, 'r') as f: 
                                players_db = json.load(f)
                        except json.JSONDecodeError:
                            print(f"[ERROR] players.json is corrupted, resetting")
                            players_db = {}

                    if path == '/signup':
                        if u in players_db: 
                            self.serve_json({'status': 'error', 'message': 'User exists'})
                        else:
                            try:
                                players_db[u] = {'password': hashlib.sha256(p.encode()).hexdigest(), 'save_data': {}, 'friends': []}
                                with open(PLAYERS_FILE, 'w') as f: 
                                    json.dump(players_db, f, indent=2)
                                self.serve_json({'status': 'success', 'message': 'Created!'})
                            except Exception as e:
                                print(f"[ERROR] Failed to create user: {e}")
                                self.serve_json({'status': 'error', 'message': 'Signup failed'})
                    else: # login
                        if u in players_db:
                            user_record = players_db[u]
                            if user_record.get('password') == hashlib.sha256(p.encode()).hexdigest():
                                self.serve_json({'status': 'success', 'data': user_record.get('save_data', {})})
                            else: 
                                self.serve_json({'status': 'error', 'message': 'Wrong password'})
                        else: 
                            self.serve_json({'status': 'error', 'message': 'User not found'})

            elif path == '/api/admin/spawn':
                global event_counter
                event_counter += 1
                server_events.append({'id': event_counter, 'type': 'SPAWN_ENEMIES', 'data': {'enemyType': data.get('type', 'NORMAL')}, 'time': time.time()})
                if len(server_events) > 20: server_events.pop(0)
                self.serve_json({'status': 'ok'})

            elif path == '/api/save_suit':
                try:
                    suits = {}
                    if os.path.exists(CUSTOM_SUITS_FILE):
                        with open(CUSTOM_SUITS_FILE, 'r') as f: 
                            suits = json.load(f)
                    suits.update(data)
                    with open(CUSTOM_SUITS_FILE, 'w') as f: 
                        json.dump(suits, f)
                    self.serve_json({'status': 'ok'})
                except Exception as e:
                    print(f"[ERROR] Failed to save suit: {e}")
                    self.serve_json({'status': 'error', 'message': 'Save suit failed'})

            elif path == '/api/save_map':
                try:
                    with open(CUSTOM_MAP_FILE, 'w') as f: 
                        json.dump(data, f)
                    self.serve_json({'status': 'ok'})
                except Exception as e:
                    print(f"[ERROR] Failed to save map: {e}")
                    self.serve_json({'status': 'error', 'message': 'Save map failed'})

            elif path == '/api/save_progress':
                username = data.get('username')
                save_data = data.get('save_data')
                
                if username and save_data is not None:
                    players_db = atomic_read_json(PLAYERS_FILE)
                    
                    if username in players_db:
                        players_db[username]['save_data'] = save_data
                        if atomic_save_json(PLAYERS_FILE, players_db):
                            print(f"[SAVE] Saved progress for {username}")
                            self.serve_json({'status': 'success'})
                        else:
                            self.serve_json({'status': 'error', 'message': 'Save failed'})
                    else:
                        self.serve_json({'status': 'error', 'message': 'User not found'})
                else:
                    self.serve_json({'status': 'error', 'message': 'Missing data'})

            elif path.startswith('/api/party/'):
                action = path.split('/')[-1]
                
                if action == 'create':
                    leader = data.get('leader')
                    party_id = f"party_{int(time.time())}_{random.randint(1000, 9999)}"
                    parties[party_id] = {
                        'id': party_id,
                        'leader': leader,
                        'members': [leader],
                        'created_at': time.time()
                    }
                    self.serve_json({'status': 'success', 'party_id': party_id})
                
                elif action == 'join':
                    party_id = data.get('party_id')
                    username = data.get('username')
                    if party_id in parties:
                        if username not in parties[party_id]['members']:
                            parties[party_id]['members'].append(username)
                            self.serve_json({'status': 'success', 'message': 'Joined party'})
                        else:
                            self.serve_json({'status': 'error', 'message': 'Already in party'})
                    else:
                        self.serve_json({'status': 'error', 'message': 'Party not found'})
                
                elif action == 'leave':
                    party_id = data.get('party_id')
                    username = data.get('username')
                    if party_id in parties and username in parties[party_id]['members']:
                        parties[party_id]['members'].remove(username)
                        if len(parties[party_id]['members']) == 0:
                            del parties[party_id]
                        self.serve_json({'status': 'success'})
                    else:
                        self.serve_json({'status': 'error'})
                
                elif action == 'info':
                    party_id = data.get('party_id')
                    if party_id in parties:
                        self.serve_json(parties[party_id])
                    else:
                        self.serve_json({'status': 'error', 'message': 'Party not found'})

            elif path.startswith('/api/jobs/'):
                action = path.split('/')[-1]
                planet = data.get('planet', 'TERRA')
                
                if action == 'list':
                    if planet not in job_boards:
                        job_boards[planet] = []
                    self.serve_json(job_boards[planet][:5])
                
                elif action == 'accept':
                    if planet not in job_boards:
                        job_boards[planet] = []
                    job_id = data.get('job_id')
                    username = data.get('username')
                    for job in job_boards[planet]:
                        if job['id'] == job_id and not job.get('accepted_by'):
                            job['accepted_by'] = username
                            job['accepted_at'] = time.time()
                            self.serve_json({'status': 'success', 'job': job})
                            return
                    self.serve_json({'status': 'error', 'message': 'Job not available'})
                
                elif action == 'complete':
                    if planet not in job_boards:
                        job_boards[planet] = []
                    job_id = data.get('job_id')
                    for i, job in enumerate(job_boards[planet]):
                        if job['id'] == job_id:
                            self.serve_json({'status': 'success', 'rewards': job.get('rewards', {})})
                            job_boards[planet].pop(i)
                            return
                    self.serve_json({'status': 'error', 'message': 'Job not found'})
                
                elif action == 'generate':
                    if planet not in job_boards:
                        job_boards[planet] = []
                    # Generate new jobs if needed
                    while len(job_boards[planet]) < 5:
                        job_id = f"job_{int(time.time())}_{random.randint(10000, 99999)}"
                        job_types = ['hunt_normal', 'hunt_elite', 'collect_scrap', 'defeat_boss', 'travel_distance', 'survive_combat']
                        job_type = random.choice(job_types)
                        rewards = {'xp': random.randint(100, 500), 'currency': random.randint(50, 300)}
                        job_boards[planet].append({
                            'id': job_id,
                            'type': job_type,
                            'rewards': rewards,
                            'created_at': time.time()
                        })
                    self.serve_json({'status': 'success', 'jobs_count': len(job_boards[planet])})

            elif path.startswith('/api/facility/'):
                action = path.split('/')[-1]
                username = data.get('username')
                
                if action == 'create':
                    facility_type = data.get('type')  # 'MINE' or 'FARM'
                    if username not in facilities:
                        facilities[username] = []
                    facility_id = f"facility_{int(time.time())}_{random.randint(1000, 9999)}"
                    facilities[username].append({
                        'id': facility_id,
                        'type': facility_type,
                        'level': 1,
                        'resources': {},
                        'created_at': time.time()
                    })
                    self.serve_json({'status': 'success', 'facility_id': facility_id})
                
                elif action == 'list':
                    if username in facilities:
                        self.serve_json(facilities[username])
                    else:
                        self.serve_json([])
                
                elif action == 'harvest':
                    facility_id = data.get('facility_id')
                    if username in facilities:
                        for facility in facilities[username]:
                            if facility['id'] == facility_id:
                                harvested = {'ore': 20, 'crops': 15} if facility['type'] == 'MINE' else {'crops': 20, 'seeds': 5}
                                if 'resources' not in facility:
                                    facility['resources'] = {}
                                for resource, amount in harvested.items():
                                    facility['resources'][resource] = facility['resources'].get(resource, 0) + amount
                                self.serve_json({'status': 'success', 'harvested': harvested, 'total': facility['resources']})
                                return
                    self.serve_json({'status': 'error', 'message': 'Facility not found'})

            elif path == '/api/friends/add':
                username, target_name = data.get('username'), data.get('target')
                
                try:
                    if os.path.exists(PLAYERS_FILE):
                        with open(PLAYERS_FILE, 'r') as f: 
                            players_db = json.load(f)
                        
                        if target_name not in players_db:
                            self.serve_json({'status': 'error', 'message': 'Player not found'})
                        elif username not in players_db:
                            self.serve_json({'status': 'error', 'message': 'User error'})
                        else:
                            friends = players_db[username].get('friends', [])
                            if target_name not in friends:
                                friends.append(target_name)
                                players_db[username]['friends'] = friends
                                with open(PLAYERS_FILE, 'w') as f: 
                                    json.dump(players_db, f, indent=2)
                                self.serve_json({'status': 'success', 'message': f'Added {target_name}'})
                            else:
                                self.serve_json({'status': 'error', 'message': 'Already friends'})
                    else:
                        self.serve_json({'status': 'error', 'message': 'DB error'})
                except Exception as e:
                    print(f"[ERROR] Friend add error: {e}")
                    self.serve_json({'status': 'error', 'message': 'Failed to add friend'})

            elif path == '/api/friends/list':
                try:
                    username = data.get('username')
                    friends = []
                    if os.path.exists(PLAYERS_FILE):
                        with open(PLAYERS_FILE, 'r') as f: 
                            players_db = json.load(f)
                        if username in players_db:
                            friends = players_db[username].get('friends', [])
                    self.serve_json(friends)
                except Exception as e:
                    print(f"[ERROR] Friend list error: {e}")
                    self.serve_json([])

            elif path == '/chat':
                try:
                    msg = data.get('message', '').strip()
                    sender = data.get('username', 'Unknown')
                    if msg:
                        target = None
                        if msg.startswith('/msg '):
                            parts = msg.split(' ', 2)
                            if len(parts) >= 3:
                                target = parts[1]
                                msg = f"(Private) {parts[2]}"
                        chat_log.append({'sender': sender, 'message': msg, 'target': target, 'time': time.time()})
                        if len(chat_log) > 50: 
                            chat_log.pop(0)
                    self.serve_json({})
                except Exception as e:
                    print(f"[ERROR] Chat error: {e}")
                    self.serve_json({'status': 'error', 'message': 'Chat failed'})

            elif path == '/update':
                player_id, player_data, username = data.get('id'), data.get('data'), data.get('username')
                if player_id and player_data:
                    players[player_id] = {
                        'data': player_data,
                        'last_seen': time.time(),
                        'username': username
                    }
                
                # Cleanup
                now = time.time()
                for pid in [p for p, v in players.items() if now - v['last_seen'] > 3]: del players[pid]
                
                # Response
                others = {pid: p['data'] for pid, p in players.items() if pid != player_id}
                new_events = [e for e in server_events if e['id'] > data.get('lastEventId', 0)]
                visible_chat = [c for c in chat_log[-20:] if not c.get('target') or c.get('target') == username or c.get('sender') == username]

                self.serve_json({'players': others, 'events': new_events, 'chat': visible_chat})
            else:
                self.serve_json({'status': 'error', 'message': 'Unknown endpoint'})

        except Exception as e:
            print(f"[ERROR] Server exception: {e}")
            import traceback
            traceback.print_exc()
            self.serve_json({'status': 'error', 'message': f'Server error: {str(e)}'})

# Threading server to handle multiple players at once without blocking
class ThreadingSimpleServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

if __name__ == '__main__':
    print("\n--- SERVER SETUP ---")
    
    # --- RESET PROGRESS LOGIC ---
    if RESET_ON_START and os.path.exists(PLAYERS_FILE):
        print("\n[ADMIN] RESETTING ALL PLAYER PROGRESS IN players.json...")
        with open(PLAYERS_FILE, 'r') as f: db = json.load(f)
        for user in db:
            db[user]['save_data'] = {} # Wipe save data
        with open(PLAYERS_FILE, 'w') as f: json.dump(db, f, indent=2)
        print("[ADMIN] Reset Complete.\n")

    # Non-blocking configuration via arguments
    # Usage: python server.py [PORT] [--online [subdomain]]
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        PORT = int(sys.argv[1])
    
    USE_ONLINE = "--online" in sys.argv
    custom_sub = ""
    if USE_ONLINE:
        try:
            idx = sys.argv.index("--online")
            if idx + 1 < len(sys.argv) and not sys.argv[idx+1].startswith("-"):
                custom_sub = sys.argv[idx+1]
        except: pass

    # Start HTTP Server in a background thread so we can run the SSH tunnel in the main thread
    server = ThreadingSimpleServer(('0.0.0.0', PORT), GameRequestHandler)
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True
    server_thread.start()
    
    print(f"\n--- GAME SERVER RUNNING ---\nListening on port {PORT}...")
    print(f"Admin Dashboard: http://localhost:{PORT}/dashboard.html")
    print(f"Local Game URL:  http://localhost:{PORT}/index.html")

    # Detect Local IP for LAN play
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except:
        local_ip = "localhost"
    lan_url = f"http://{local_ip}:{PORT}"
    local_url = f"http://localhost:{PORT}"

    # Default to Local Mode immediately for fast setup
    update_client_config(local_url, [f'"{lan_url}"', f'"{local_url}"'])
    fail_count = 0

    # --- ONLINE LAUNCHER LOGIC ---
    if USE_ONLINE and shutil.which("ssh"):
        print("\n===================================================")
        print("      OPERATION CYBERSPACE - ONLINE LAUNCHER")
        print("===================================================")
        
        # Setup SSH Key
        user_profile = os.environ.get('USERPROFILE', os.path.expanduser("~"))
        ssh_dir = os.path.join(user_profile, '.ssh')
        key_path = os.path.join(ssh_dir, 'id_rsa')
        
        if not os.path.exists(key_path):
            print("[SETUP] Generating SSH Key...")
            if not os.path.exists(ssh_dir): os.makedirs(ssh_dir)
            subprocess.run(['ssh-keygen', '-t', 'rsa', '-b', '4096', '-f', key_path, '-N', ''], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        print("   [CONNECTING] Starting Online Tunnel...")

        # Presets to try in order (predictable URLs)
        SUBDOMAIN_PRESETS = [
            "op-cyber-node-01",
            "op-cyber-node-02",
            "op-cyber-node-03",
            "op-cyber-node-04",
            "op-cyber-node-05",
            "op-cyber-node-06"
        ]

        fail_count = 0
        while fail_count < 6:
            # Generate dynamic subdomain inside loop to handle retries/collisions
            if custom_sub:
                subname = custom_sub
            else:
                if fail_count < len(SUBDOMAIN_PRESETS):
                    subname = SUBDOMAIN_PRESETS[fail_count]
                else:
                    subname = f"op-cyber-{int(time.time())}-{random.randint(100, 999)}"
            server_url = f"https://{subname}.serveo.net"
            
            # Construct Fallback List (LAN + Localhost + Other Presets)
            fb_urls = [f'"{lan_url}"', f'"http://localhost:{PORT}"']
            for p in SUBDOMAIN_PRESETS:
                p_url = f"https://{p}.serveo.net"
                if p_url != server_url:
                    fb_urls.append(f'"{p_url}"')
            
            update_client_config(server_url, fb_urls)
            
            print(f"\n   YOUR SERVER URL IS: {server_url}")
            print("   (Enter this URL manually in the game client if auto-detect fails)")

            try:
                # Added ServerAliveInterval to prevent timeouts
                # Added ConnectTimeout and ServerAliveCountMax for better stability
                result = subprocess.run(['ssh', '-i', key_path, '-o', 'StrictHostKeyChecking=no', '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=3', '-o', 'ConnectTimeout=10', '-o', 'ExitOnForwardFailure=yes', '-R', f'{subname}:80:localhost:{PORT}', 'serveo.net'])
                if result.returncode != 0:
                    fail_count += 1
                    print("\n[DISCONNECTED] Tunnel closed. Retrying in 3 seconds...")
                    time.sleep(3)
            except KeyboardInterrupt:
                print("\n[STOPPING] Tunnel stopped.")
                break

    if fail_count >= 6:
        print("\n[ERROR] Online Tunnel failed multiple times.")
        print(f"[FALLBACK] Switching to LAN Mode: {lan_url}")
        
        update_client_config(lan_url, [f'"http://localhost:{PORT}"'])
        
        print(f"\n   USE THIS URL ON OTHER DEVICES: {lan_url}")
        print("   (Enter this URL manually in the game client if auto-detect fails)\n")
    elif USE_ONLINE:
        print("[INFO] SSH not found. Online mode unavailable.")
    else:
        print("[INFO] Running in Local Mode. Use 'python server.py --online' to enable internet play.")

    # Keep main thread alive for Local Mode
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt:
        pass