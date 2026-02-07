import { SUIT_DATA } from './player_assets/Suits/suit_arrays.js';

let shapes = [];
let selectedIdx = -1;
let pickingBuffer;
let cam;
let isDragging = false;
let dragInfo = null; // { type: 'shape'|'axis', axis: 'x'|'y'|'z'|'xz', offset: val, startPos: vec }
let currentSuitType = 'GUNDAM';

// Constants
const GIZMO_SIZE = 40;

window.setup = () => {
    let c = createCanvas(window.innerWidth - 300, window.innerHeight, WEBGL);
    c.elt.addEventListener('contextmenu', e => e.preventDefault());

    pickingBuffer = createGraphics(width, height, WEBGL);
    
    cam = createCamera();
    cam.setPosition(0, -100, 400);
    cam.lookAt(0, 0, 0);
    
    buildUI();
    loadSuit(currentSuitType);
    
    // Load custom suits from server to edit them
    fetch('/api/custom_suits')
        .then(res => res.json())
        .then(data => {
            Object.assign(SUIT_DATA, data);
        });
};

window.draw = () => {
    background(30);
    
    // Lighting
    ambientLight(150);
    directionalLight(255, 255, 255, 1, 1, -1);
    
    // Grid
    push();
    rotateX(HALF_PI);
    stroke(50);
    fill(40);
    plane(1000, 1000);
    pop();

    // Draw Shapes
    shapes.forEach((shape, idx) => {
        push();
        translate(shape.pos.x, shape.pos.y, shape.pos.z);
        if (selectedIdx === idx) {
            stroke(255, 255, 0);
            strokeWeight(2);
        } else {
            noStroke();
        }
        fill(shape.color);
        box(shape.size.x, shape.size.y, shape.size.z);
        pop();
    });

    // Draw Gizmo if selected
    if (selectedIdx !== -1 && shapes[selectedIdx]) {
        drawGizmo(shapes[selectedIdx].pos);
    }
    
    // Orbit Control (Alt + Drag)
    if (keyIsDown(ALT)) {
        orbitControl(1, 1, 0.1);
    }
};

function drawGizmo(pos) {
    push();
    translate(pos.x, pos.y, pos.z);
    noStroke();
    
    // X Axis (Red)
    fill(255, 0, 0);
    push(); translate(GIZMO_SIZE, 0, 0); rotateZ(-HALF_PI); cone(5, 15); pop();
    push(); translate(GIZMO_SIZE/2, 0, 0); box(GIZMO_SIZE, 2, 2); pop();
    
    // Y Axis (Green)
    fill(0, 255, 0);
    push(); translate(0, GIZMO_SIZE, 0); cone(5, 15); pop();
    push(); translate(0, GIZMO_SIZE/2, 0); box(2, GIZMO_SIZE, 2); pop();
    
    // Z Axis (Blue)
    fill(0, 0, 255);
    push(); translate(0, 0, GIZMO_SIZE); rotateX(HALF_PI); cone(5, 15); pop();
    push(); translate(0, 0, GIZMO_SIZE/2, 0); box(2, 2, GIZMO_SIZE); pop();
    
    pop();
}

window.mousePressed = () => {
    if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;
    if (keyIsDown(ALT)) return; // Orbiting

    // Render picking scene
    pickingBuffer.background(255); // White = nothing
    pickingBuffer.resetMatrix();
    pickingBuffer.camera(cam.eyeX, cam.eyeY, cam.eyeZ, cam.centerX, cam.centerY, cam.centerZ, cam.upX, cam.upY, cam.upZ);
    pickingBuffer.perspective(PI/3.0, width/height, 0.1, 5000);
    pickingBuffer.noStroke();

    // Draw Shapes with ID encoded in Red channel (0-200)
    shapes.forEach((shape, idx) => {
        pickingBuffer.push();
        pickingBuffer.translate(shape.pos.x, shape.pos.y, shape.pos.z);
        pickingBuffer.fill(idx, 0, 0); 
        pickingBuffer.box(shape.size.x, shape.size.y, shape.size.z);
        pickingBuffer.pop();
    });

    // Draw Gizmos if selected (ID encoded in Green channel: 1=X, 2=Y, 3=Z)
    if (selectedIdx !== -1 && shapes[selectedIdx]) {
        let pos = shapes[selectedIdx].pos;
        pickingBuffer.push();
        pickingBuffer.translate(pos.x, pos.y, pos.z);
        
        pickingBuffer.fill(0, 1, 0); // X
        pickingBuffer.push(); pickingBuffer.translate(GIZMO_SIZE/2, 0, 0); pickingBuffer.box(GIZMO_SIZE, 8, 8); pickingBuffer.pop();
        
        pickingBuffer.fill(0, 2, 0); // Y
        pickingBuffer.push(); pickingBuffer.translate(0, GIZMO_SIZE/2, 0); pickingBuffer.box(8, GIZMO_SIZE, 8); pickingBuffer.pop();
        
        pickingBuffer.fill(0, 3, 0); // Z
        pickingBuffer.push(); pickingBuffer.translate(0, 0, GIZMO_SIZE/2); pickingBuffer.box(8, 8, GIZMO_SIZE); pickingBuffer.pop();
        
        pickingBuffer.pop();
    }

    // Read pixel
    let pix = pickingBuffer.get(mouseX, mouseY);
    let id = pix[0];
    let gizmo = pix[1];

    if (gizmo > 0) {
        // Clicked Gizmo
        isDragging = true;
        let axis = gizmo === 1 ? 'x' : (gizmo === 2 ? 'y' : 'z');
        dragInfo = { type: 'axis', axis: axis, startMouse: {x:mouseX, y:mouseY}, startVal: shapes[selectedIdx].pos[axis] };
    } else if (id < 255 && shapes[id]) {
        // Clicked Shape
        selectedIdx = id;
        isDragging = true;
        // Drag on XZ plane logic
        dragInfo = { type: 'shape', axis: 'xz', startMouse: {x:mouseX, y:mouseY}, startPos: shapes[selectedIdx].pos.copy() };
        updateUI();
    } else {
        // Clicked Empty
        selectedIdx = -1;
        updateUI();
    }
};

window.mouseDragged = () => {
    if (isDragging && selectedIdx !== -1) {
        let shape = shapes[selectedIdx];
        let dx = mouseX - dragInfo.startMouse.x;
        let dy = mouseY - dragInfo.startMouse.y;
        
        if (dragInfo.type === 'axis') {
            // Simple screen-space mapping to axis
            // A proper implementation projects the axis to screen, but this is a simple approximation
            let sensitivity = 0.5;
            if (dragInfo.axis === 'y') sensitivity *= -1; // Up is negative Y in screen
            shape.pos[dragInfo.axis] = dragInfo.startVal + (dx - dy) * sensitivity;
        } else if (dragInfo.type === 'shape') {
            // Move on XZ plane relative to camera view roughly
            // This is a "Canva-like" feel where you drag things around
            let speed = 0.5;
            shape.pos.x = dragInfo.startPos.x + dx * speed;
            shape.pos.z = dragInfo.startPos.z + dy * speed;
        }
        updateUI();
    }
};

window.mouseReleased = () => {
    isDragging = false;
    dragInfo = null;
};

window.windowResized = () => {
    resizeCanvas(window.innerWidth - 300, window.innerHeight);
    pickingBuffer.resizeCanvas(width, height);
};

function loadSuit(type) {
    shapes = [];
    let data = SUIT_DATA[type].model;
    
    const decompose = (part, groupName, parentOffset) => {
        let absPos = p5.Vector.add(parentOffset, createVector(...(part.offset || [0,0,0])));
        if (part.size && (part.size[0] > 0)) {
            shapes.push({
                pos: absPos.copy(),
                size: createVector(...part.size),
                color: part.color || [200,200,200],
                group: groupName
            });
        }
        if (part.details) {
            part.details.forEach(det => {
                let detPos = p5.Vector.add(absPos, createVector(...(det.offset || [0,0,0])));
                shapes.push({
                    pos: detPos,
                    size: createVector(...(det.size || [5,5,5])),
                    color: det.color || [100,100,100],
                    group: groupName
                });
            });
        }
    };
    
    ['torso', 'head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'].forEach(key => {
        if (data[key]) decompose(data[key], key, createVector(0,0,0));
    });
}

function saveSuit() {
    let name = prompt("Enter a name for your Custom Gundam:", "CustomGundam");
    if (!name) return;
    
    let newModel = {};
    let groups = ['torso', 'head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    
    groups.forEach(group => {
        let groupShapes = shapes.filter(s => s.group === group);
        if (groupShapes.length === 0) {
            newModel[group] = { size: [0,0,0], offset: [0,0,0], color: [0,0,0] };
            return;
        }
        let center = createVector(0,0,0);
        groupShapes.forEach(s => center.add(s.pos));
        center.div(groupShapes.length);
        
        let details = groupShapes.map(s => ({
            type: 'box',
            size: [s.size.x, s.size.y, s.size.z],
            color: s.color,
            offset: [s.pos.x - center.x, s.pos.y - center.y, s.pos.z - center.z]
        }));
        
        newModel[group] = {
            size: [0,0,0],
            offset: [center.x, center.y, center.z],
            color: [255,255,255],
            details: details
        };
    });
    
    // Create Suit Data Structure
    let suitPayload = {};
    suitPayload[name] = {
        name: name,
        stats: { health: 1200, energy: 1200, speed: 1.2, attack: 15 }, // Custom stats
        model: newModel,
        weapons: SUIT_DATA['GUNDAM'].weapons // Inherit weapons for now
    };

    // Save to Server
    fetch('/api/save_suit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suitPayload)
    })
    .then(res => res.json())
    .then(data => {
        alert("Suit Saved to Server! You can now select it in the Lobby.");
    })
    .catch(err => alert("Save Failed: " + err));
}

function buildUI() {
    const container = document.getElementById('controls');
    container.innerHTML = '';
    
    let addBtn = document.createElement('button');
    addBtn.innerText = "ADD BLOCK";
    addBtn.onclick = () => {
        shapes.push({
            pos: createVector(0, 0, 0),
            size: createVector(10, 10, 10),
            color: [200, 200, 200],
            group: 'none'
        });
    };
    container.appendChild(addBtn);
    
    let saveBtn = document.createElement('button');
    saveBtn.innerText = "SAVE SUIT";
    saveBtn.onclick = saveSuit;
    container.appendChild(saveBtn);
    
    let cancelBtn = document.createElement('button');
    cancelBtn.className = 'secondary';
    cancelBtn.innerText = "EXIT";
    cancelBtn.onclick = () => window.location.href = 'index.html';
    container.appendChild(cancelBtn);
    
    // Properties Panel
    let props = document.createElement('div');
    props.id = 'properties-panel';
    props.style.marginTop = '20px';
    container.appendChild(props);
    
    updateUI();
}

function updateUI() {
    const panel = document.getElementById('properties-panel');
    if (!panel) return;
    panel.innerHTML = '';
    
    if (selectedIdx === -1 || !shapes[selectedIdx]) {
        panel.innerHTML = '<p>Select a block to edit</p>';
        return;
    }
    
    let s = shapes[selectedIdx];
    
    const addSlider = (label, val, min, max, cb) => {
        let div = document.createElement('div');
        div.innerHTML = `<label>${label}: ${Math.round(val)}</label>`;
        let inp = document.createElement('input');
        inp.type = 'range'; inp.min = min; inp.max = max; inp.value = val;
        inp.oninput = (e) => {
            cb(parseFloat(e.target.value));
            div.querySelector('label').innerText = `${label}: ${Math.round(e.target.value)}`;
        };
        div.appendChild(inp);
        panel.appendChild(div);
    };
    
    panel.innerHTML += '<strong>Position</strong>';
    addSlider('X', s.pos.x, -100, 100, v => s.pos.x = v);
    addSlider('Y', s.pos.y, -100, 100, v => s.pos.y = v);
    addSlider('Z', s.pos.z, -100, 100, v => s.pos.z = v);
    
    panel.innerHTML += '<strong>Size</strong>';
    addSlider('W', s.size.x, 1, 100, v => s.size.x = v);
    addSlider('H', s.size.y, 1, 100, v => s.size.y = v);
    addSlider('D', s.size.z, 1, 100, v => s.size.z = v);
    
    panel.innerHTML += '<strong>Color</strong>';
    addSlider('R', s.color[0], 0, 255, v => s.color[0] = v);
    addSlider('G', s.color[1], 0, 255, v => s.color[1] = v);
    addSlider('B', s.color[2], 0, 255, v => s.color[2] = v);
}