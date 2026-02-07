let mapData = [];
let mapSize = 100;
let cellSize = 20;
let camX = 0;
let camY = 0;
let zoom = 1;
let currentTool = 1;

function setup() {
    createCanvas(windowWidth - 250, windowHeight);
    
    // Initialize empty map
    for(let y=0; y<mapSize; y++) {
        let row = [];
        for(let x=0; x<mapSize; x++) row.push(0);
        mapData.push(row);
    }
    
    // Try to load existing map
    fetch('/api/map')
        .then(res => res.json())
        .then(data => {
            if(data && data.length > 0) {
                mapData = data;
                mapSize = data.length;
            }
        });
}

function draw() {
    background(30);
    
    push();
    translate(width/2, height/2);
    scale(zoom);
    translate(-width/2 - camX, -height/2 - camY);
    
    // Draw Grid
    noStroke();
    for(let y=0; y<mapSize; y++) {
        for(let x=0; x<mapSize; x++) {
            let val = mapData[y][x];
            if (val === 1) fill(150); // Wall
            else if (val === 2) fill(100, 100, 200); // Obs 1
            else if (val === 3) fill(200, 100, 100); // Obs 2
            else fill(50); // Empty
            
            // Hover effect
            let screenX = (x * cellSize);
            let screenY = (y * cellSize);
            if (mouseX/zoom + camX + width/2/zoom - width/2/zoom/zoom > screenX && 
                mouseX/zoom + camX < screenX + cellSize &&
                mouseY/zoom + camY > screenY && 
                mouseY/zoom + camY < screenY + cellSize) {
                fill(200, 200, 0);
                if (mouseIsPressed) {
                    mapData[y][x] = currentTool;
                }
            }
            
            rect(x * cellSize, y * cellSize, cellSize-1, cellSize-1);
        }
    }
    pop();
    
    // Pan Controls
    if (keyIsDown(LEFT_ARROW)) camX -= 10;
    if (keyIsDown(RIGHT_ARROW)) camX += 10;
    if (keyIsDown(UP_ARROW)) camY -= 10;
    if (keyIsDown(DOWN_ARROW)) camY += 10;
}

function mouseWheel(event) {
    zoom -= event.delta * 0.001;
    zoom = constrain(zoom, 0.1, 5);
}

window.setTool = (t) => {
    currentTool = t;
    document.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    let id = t===1?'btn-wall':(t===0?'btn-erase':(t===2?'btn-obs1':'btn-obs2'));
    document.getElementById(id).classList.add('active');
    document.getElementById('tool-display').innerText = t===1?'WALL':(t===0?'ERASE':'OBSTACLE');
};

window.saveMap = () => {
    fetch('/api/save_map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapData)
    })
    .then(res => res.json())
    .then(data => {
        alert("Map Saved to Server!");
    })
    .catch(err => alert("Save Failed"));
};

function windowResized() {
    resizeCanvas(windowWidth - 250, windowHeight);
}