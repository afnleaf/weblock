// map.js

// content elements
const container = document.querySelector('.canvas-container');
const dragLayer = document.getElementById('dragLayer');
const mapCanvas = document.getElementById('mapCanvas');
const mapLayer = document.getElementById('mapLayer');
const iconLayer = document.getElementById('iconLayer');
const drawingCanvas = document.getElementById('drawingCanvas');
const mapCtx = mapCanvas.getContext('2d');
const drawCtx = drawingCanvas.getContext('2d');
const bgImage = new Image();
let currentMode = 'pen';
// drawing
let paths = [];
let currentPath = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let lineWidth = 5;
let lineColor = "#FFFFFF";
let penType = "opaque";
// icons
let icons = [];
let draggedIcon = null;
let isDragging = false;
// zoom
let zoomLevel = 0.7;
let mapOffsetX = 0;
let mapOffsetY = 0;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
// move map
let isDraggingMap = false;
let lastMouseX = 0;
let lastMouseY = 0;
let initialDistance = 0;

/* all layers ---------------------------------------------------- */
function resizeCanvas() {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    //const containerWidth = window.innerWidth;
    //const containerHeight = window.innerHeight;

    dragLayer.width = containerWidth;
    dragLayer.height = containerHeight;
    dragLayer.style.width = `${containerWidth}px`;
    dragLayer.style.height = `${containerHeight}px`;
    
    mapLayer.width = containerWidth;
    mapLayer.height = containerHeight;
    mapLayer.style.width = `${mapLayer.width}px`;
    mapLayer.style.height = `${mapLayer.height}px`;
    
    mapCanvas.width = bgImage.width * zoomLevel;
    mapCanvas.height = bgImage.height * zoomLevel;
    mapCanvas.style.width = `${mapCanvas.width}px`;
    mapCanvas.style.height = `${mapCanvas.height}px`;
   
    iconLayer.width = containerWidth * 4 * zoomLevel;
    iconLayer.height = containerHeight * 4 * zoomLevel;
    iconLayer.style.width = `${iconLayer.width}px`;
    iconLayer.style.height = `${iconLayer.height}px`;

    drawingCanvas.width = containerWidth * 8 * zoomLevel;
    drawingCanvas.height = containerHeight * 8 * zoomLevel;
    drawingCanvas.style.width = `${drawingCanvas.width}px`;
    drawingCanvas.style.height = `${drawingCanvas.width}px`;
   
    dragLayer.width = containerWidth * zoomLevel;
    dragLayer.height = containerHeight * zoomLevel;
    dragLayer.style.width = `${dragLayer.width}px`;
    dragLayer.style.height = `${dragLayer.height}px`;

    // Store original map dimensions
    const originalMapWidth = iconLayer.width;
    const originalMapHeight = iconLayer.height;
    /*
    icons.forEach(icon => {
        // Get the icon's position as a percentage of the original map size
        const originalLeft = parseInt(icon.style.left);
        const originalTop = parseInt(icon.style.top);
        
        // Calculate position as a percentage of original map size
        const leftPercent = originalLeft / originalMapWidth;
        const topPercent = originalTop / originalMapHeight;
        
        // Update icon position based on new zoom level
        const newLeft = leftPercent * (originalMapWidth);
        const newTop = topPercent * (originalMapHeight);
        
        icon.style.left = `${newLeft}px`;
        icon.style.top = `${newTop}px`;     
    });
    */
    drawBackground();
    redrawCanvas();
    updateMapPosition();
}

function updateMapPosition() {
    mapCanvas.style.transform = `translate(${mapOffsetX}px, ${mapOffsetY}px)`;
    //mapLayer.style.transform = `translate(${mapOffsetX}px, ${mapOffsetY}px)`;
    iconLayer.style.transform = `translate(${mapOffsetX}px, ${mapOffsetY}px)`;
    //dragLayer.style.transform = `translate(${mapOffsetX}px, ${mapOffsetY}px)`;
    drawingCanvas.style.transform = `translate(${mapOffsetX}px, ${mapOffsetY}px)`;
    // we might implement this in the future but it needs other fixes
    //iconLayer.style.transform = `translate(${mapOffsetX}px, ${mapOffsetY}px)`;
}


function getEventPos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    // Adjust for map offset and zoom
    const x = (clientX - rect.left - mapOffsetX) / (canvas.width * zoomLevel);
    const y = (clientY - rect.top - mapOffsetY) / (canvas.height * zoomLevel);
    return [x, y];
    //const x = (clientX - rect.left) / rect.width;
    //const y = (clientY - rect.top) / rect.height;
    //return [x, y];
}

/* map layer ----------------------------------------------------- */

// load map image
bgImage.onload = () => {
    resizeCanvas()
};
//bgImage.src = '/public/images/DeadlockMiniMap.png';
//bgImage.src = '/public/images/Map.png';
bgImage.src = '/public/images/UpscaledMap.png';

function handleWheelZoom(e) {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    //const mouseX = (e.clientX - rect.left) / rect.width;
    //const mouseY = (e.clientY - rect.top) / rect.height;
    const [mouseX, mouseY] = getEventPos(dragLayer, e);

    // Store icon positions relative to map before zoom
    const iconPositions = icons.map(icon => ({
        icon: icon,
        relX: (parseInt(icon.style.left) + 25) / (bgImage.width * zoomLevel),
        relY: (parseInt(icon.style.top) + 25) / (bgImage.height * zoomLevel)
    }));

    // mouse pos relative to map content
    const mapMouseX = (mouseX - mapOffsetX) / zoomLevel;
    const mapMouseY = (mouseY - mapOffsetY) / zoomLevel;

    const delta = Math.sign(e.deltaY);
    const zoomFactor = 0.02;

    const prevZoom = zoomLevel;
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel - delta * zoomFactor));

    mapOffsetX = mouseX - mapMouseX * zoomLevel;
    mapOffsetY = mouseY - mapMouseY * zoomLevel;

    // Update icon positions using their relative coordinates
    iconPositions.forEach(({icon, relX, relY}) => {
        const newX = (relX * bgImage.width * zoomLevel) - 25;
        const newY = (relY * bgImage.height * zoomLevel) - 25;
        icon.style.left = `${newX}px`;
        icon.style.top = `${newY}px`;
    });

    resizeCanvas();
    switchToMoveMapMode();
}

function handleTouchZoom(e) {
    e.preventDefault();
    
    // for pinch zoom we want 2 fingers
    if(e.touches.length !== 2) return;

    // distance between fingers
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const distance = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY
    );

    if(initialDistance === 0) {
        initialDistance = distance;
        return;
    }
    
    const zoomDamp = 0.05;
    const zoomFactor = Math.pow(distance / initialDistance, zoomDamp);
    //const zoomFactor = distance / initialDistance;
    
    // get midpoint
    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;
    // convert to map coords
    const rect = container.getBoundingClientRect();
    const normalizedX = (midX - rect.left) / rect.width;
    const normalizedY = (midY - rect.top) / rect.height; 
    const mapMouseX = (normalizedX - mapOffsetX) / zoomLevel;
    const mapMouseY = (normalizedY - mapOffsetY) / zoomLevel;
    const prevZoom = zoomLevel;
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * zoomFactor));
    //zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel - zoomFactor * zoomDamp));
    mapOffsetX = normalizedX - mapMouseX * zoomLevel;
    mapOffsetY = normalizedY - mapMouseX * zoomLevel;
    
    resizeCanvas();
    switchToMoveMapMode();
}

function handleTouchStart(e) {
    if (e.touches.length === 2) {
        // Reset initial distance when a new pinch gesture starts
        initialDistance = 0;
    }
}

function handleTouchEnd(e) {
    if (e.touches.length < 2) {
        // Reset initial distance when pinch gesture ends
        initialDistance = 0;
    }
}

function drawBackground() {
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.drawImage(bgImage, 0, 0, mapCanvas.width, mapCanvas.height);
}

function startDraggingMap(e) {
    if(currentMode !== 'map') return;
    isDraggingMap = true;
    lastMouseX = e.clientX || (e.touches && e.touches[0].clientX);
    lastMouseY = e.clientY || (e.touches && e.touches[0].clientY);
}

function dragMap(e) {
    if(!isDraggingMap || currentMode !== 'map') return;
    e.preventDefault();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const deltaX = clientX - lastMouseX;
    const deltaY = clientY - lastMouseY;
    mapOffsetX += deltaX;
    mapOffsetY += deltaY;
    //const maxOffsetX = container.clientWidth - mapCanvas.width;
    //const maxOffsetY = container.clientHeight - mapCanvas.height;
    //mapOffsetX = Math.min(0, Math.max(mapOffsetX, maxOffsetX));
    //mapOffsetY = Math.min(0, Math.max(mapOffsetY, maxOffsetY));
    lastMouseX = clientX;
    lastMouseY = clientY;
    resizeCanvas();
}

function stopDraggingMap() {
    isDraggingMap = false;
}


/* icon layer ---------------------------------------------------- */

function addIcon(iconName, side, x = 100, y = 100) {
    let teamColor = '';
    if(side === 'amber') {
        teamColor = 'rgba(221, 179, 92, 0.8)';
    } else if(side === 'sapphire') {
        teamColor = 'rgba(95, 118, 227, 0.8)'
    }
    const icon = document.createElement('img');
    //icon.src = `public/images/hero_icons/pixel/${iconName}.png`;
    //icon.src = `public/images/hero_icons/emoji/${iconName}.png`;
    icon.src = `public/images/hero_icons/default/${iconName}.png`;
    icon.className = 'draggable-icon';
    icon.style.position = 'absolute';
    

    // Position relative to map size and zoom level
    const mapRelativeX = x / (bgImage.width * zoomLevel);
    const mapRelativeY = y / (bgImage.height * zoomLevel);
    
    icon.style.left = `${(mapRelativeX * bgImage.width * zoomLevel) - 25}px`;
    icon.style.top = `${(mapRelativeY * bgImage.height * zoomLevel) - 25}px`;
    //icon.style.left = `${x-25}px`;
    //icon.style.top = `${y-25}px`;
    

    icon.style.width = '50px';
    icon.style.height = '50px';
    //icon.style.zIndex = '100';
    // team style
    icon.style.borderRadius = '50%';
    icon.style.display = 'block';
    icon.style.background = teamColor;
    icon.style.border = '2px solid black';
    // event listeners
    icon.addEventListener('mousedown', (e) => {
        if(currentMode === 'map') {
            switchToMoveIconMode();
        } 
        if(currentMode === 'move') {
            startDraggingIcon(e);
        } else if(currentMode === 'del') {
            deleteIcon(e);
        }
    });
    icon.addEventListener('touchstart', (e) => {
        if(currentMode === 'map') {
            switchToMoveIconMode();
        } 
        if(currentMode === 'move') {
            startDraggingIcon(e);
        } else if(currentMode === 'del') {
            deleteIcon(e);
        }
    }); 
    // add to layer
    iconLayer.appendChild(icon);
    icons.push(icon);
    switchToMoveIconMode();
}

function deleteIcon(e) {
    if(currentMode !== 'del') return;
    if(e.target.classList.contains('draggable-icon')) {
        const icon = e.target;
        icon.remove();
        icons = icons.filter(i => i !== icon);
    }
}

function startDraggingIcon(e) {
    if(currentMode !== 'move') return;
    e.preventDefault();
    e.stopPropagation(); // testing this
    isDragging = true;
    draggedIcon = e.target;

    const rect = iconLayer.getBoundingClientRect();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    draggedIcon.dataset.offsetX = clientX - rect.left - draggedIcon.offsetLeft;
    draggedIcon.dataset.offsetY = clientY - rect.top - draggedIcon.offsetTop;
    //draggedIcon.dataset.offsetX = clientX - rect.left;
    //draggedIcon.dataset.offsetY = clientY - rect.top;
    
    draggedIcon.style.cursor = 'grabbing';
}

function stopDraggingIcon() {
    if(draggedIcon) {
        draggedIcon.style.cursor = 'grab';
    }
    isDragging = false;
    draggedIcon = null;
}

function dragIcon(e) {
    if(!isDragging || currentMode !== 'move' || !draggedIcon) return;
    e.preventDefault();
    const rect = iconLayer.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.clientX !== undefined && e.clientY !== undefined) {
        clientX = e.clientX;
        clientY = e.clientY;
    } else {
        return;
    }

    let newX = clientX - rect.left - parseInt(draggedIcon.dataset.offsetX);
    let newY = clientY - rect.top - parseInt(draggedIcon.dataset.offsetY);

    // Constrain within map bounds
    //const mapWidth = bgImage.width * zoomLevel;
    //const mapHeight = bgImage.height * zoomLevel;
    
    //newX = Math.max(0, Math.min(newX, mapWidth - draggedIcon.clientWidth));
    //newY = Math.max(0, Math.min(newY, mapHeight - draggedIcon.clientHeight));
    
    // constrain the icon within the map layer
    newX = Math.max(0, Math.min(newX, iconLayer.clientWidth - draggedIcon.clientWidth));
    newY = Math.max(0, Math.min(newY, iconLayer.clientHeight - draggedIcon.clientHeight));
    
    draggedIcon.style.left = `${newX}px`;
    draggedIcon.style.top = `${newY}px`;
}

const iconMenu = document.getElementById('iconMenu');
const iconNames = ['Abrams', 'Bebop', 'Dynamo', 'GreyTalon', 'Haze', 'Infernus', 'Ivy', 'Kelvin', 'LadyGeist', 'Lash', 'McGinnis', 'Mirage', 'Mo&Krill', 'Paradox', 'Pocket', 'Seven', 'Shiv', 'Vindicta', 'Viscous', 'Warden', 'Wraith', 'Yamato'];
iconNames.forEach(iconName => {
    const draggableIcon = createDraggableIcon(iconName);
    iconMenu.appendChild(draggableIcon);
});

function createDraggableIcon(iconName) {
    const icon = document.createElement('img');
    //icon.src = `/public/images/hero_icons/${iconName}.png`;
    icon.src = `/public/images/hero_icons/default/${iconName}.png`;
    icon.classsName = 'menu-icon';
    icon.style.width = '25px';
    icon.style.height = '25px';
    icon.style.cursor = 'grab';
    icon.draggable = true;
    icon.dataset.icon = iconName;

    icon.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', iconName);
    });

    return icon;
}

container.addEventListener('dragover', (e) => {
    e.preventDefault();
});

container.addEventListener('drop', (e) => {
    e.preventDefault();
    const iconName = e.dataTransfer.getData('text');
    //const [x, y] = getEventPos(iconLayer, e);
    //const rect = container.getBoundingClientRect();
    const rect = iconLayer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const selectedSide = document.querySelector('input[name="sideSwitch"]:checked').value;

    addIcon(iconName, selectedSide, x, y);
});

/* drawing layer ------------------------------------------------- */

function redrawCanvas() {
    drawCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    //drawCtx.save();

    [...paths, currentPath].filter(Boolean).forEach(path => {
        drawCtx.beginPath();
        path.points.forEach((point, index) => {
            const x = point.x * drawingCanvas.width;
            const y = point.y * drawingCanvas.height; 
            if (index === 0) {
                drawCtx.moveTo(x, y);
            } else {
                drawCtx.lineTo(x, y);
            }
        });
        drawCtx.strokeStyle = path.color;
        drawCtx.lineWidth = path.width;
        drawCtx.globalAlpha = path.penType === 'highlighter' ? 0.5 : 1;
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.stroke();
    });

    //drawCtx.restore();
}

function draw(e) {
    if (!isDrawing || (currentMode !== 'pen' && currentMode !== 'eraser')) return;
    e.preventDefault();
    const [x, y] = getEventPos(drawingCanvas, e);
    if(currentMode === 'pen') {
        currentPath.points.push({x, y});
        redrawCanvas();
    } else if(currentMode === 'eraser') {
        eraseAtPoint(x, y);
    }
}

function startDrawing(e) {
    if(currentMode !== 'pen' && currentMode !== 'eraser') return;
    isDrawing = true;
    const [x, y] = getEventPos(drawingCanvas, e);
    if(currentMode === 'pen') {
        currentPath = {
            points: [{x, y}], 
            color: lineColor,
            width: lineWidth,
            penType: penType
        };
    } else if (currentMode === 'eraser'){
        eraseAtPoint(x, y);
    }
}

function stopDrawing() {
    if(isDrawing && currentMode !== 'eraser') {
        if(currentPath != null) {
            paths.push(currentPath);
        }
        currentPath = null;
    }
    isDrawing = false;
}

function eraseAtPoint(x, y) {
    const eraserRadius = lineWidth / (2 * drawingCanvas.width);
    //const eraserRadius = 1 / (2 * drawingCanvas.width); 
    paths = paths.filter(path => !isPathNearPoint(path, x, y, eraserRadius));
    redrawCanvas();
}

function isPathNearPoint(path, x, y, radius) {
    return path.points.some((point, index) => {
        if(index === 0) return false;
        const prevPoint = path.points[index - 1];
        return isLineNearPoint(prevPoint.x, prevPoint.y, point.x, point.y, x, y, radius);
    });
}

/* x1y1/x2y2 are the start/end of the line, pxpy is the point eraser is at */
function isLineNearPoint(x1, y1, x2, y2, px, py, radius) {
    // vectors
    // (A,B) is from start of line to point
    // (C,D) is from end of line to point
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    // dot product and squared length of the vectors
    const dot = (A * C) + (B * D);
    const len_sq = (C * C) + (D * D);
    // projection parameters
    // find where along the line segment the closest point lies, assign to xx,yy
    let param = -1;
    if(len_sq != 0) {
        param = dot / len_sq;
    }
    let xx, yy;
    if(param < 0) {
        xx = x1;
        yy = y1;
    } else if(param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    // calculate distance between eraser point and closest point
    const dx = px - xx;
    const dy = py - yy;
    const distance = Math.sqrt((dx * dx) + (dy * dy));
    // compare that distance to the radius of our eraser
    return distance <= radius;
}

/* controls ------------------------------------------------------ */

function switchToPenMode() {
    if(currentMode !== 'pen') {
        currentMode = 'pen';
        document.getElementById('penMode').classList.add('active');
        document.getElementById('moveIconMode').classList.remove('active');
        document.getElementById('moveMapMode').classList.remove('active');
        document.getElementById('delMode').classList.remove('active');
        document.getElementById('eraserMode').classList.remove('active');
        drawingCanvas.style.pointerEvents = 'auto';
        dragLayer.style.pointerEvents = 'none';
        mapCanvas.style.pointerEvents = 'none';
        iconLayer.style.pointerEvents = 'none';
    }
}

function switchToEraserMode() {
    if(currentMode !== 'eraser') {
        currentMode = 'eraser';
        document.getElementById('eraserMode').classList.add('active');
        document.getElementById('moveIconMode').classList.remove('active');
        document.getElementById('moveMapMode').classList.remove('active');
        document.getElementById('penMode').classList.remove('active');
        document.getElementById('delMode').classList.remove('active');
        drawingCanvas.style.pointerEvents = 'auto';
        dragLayer.style.pointerEvents = 'none';
        mapCanvas.style.pointerEvents = 'none';
        iconLayer.style.pointerEvents = 'none';
    }
}

function switchToMoveIconMode() {
    if(currentMode !== 'move') {
        currentMode = 'move';
        document.getElementById('moveIconMode').classList.add('active');
        document.getElementById('moveMapMode').classList.remove('active');
        document.getElementById('penMode').classList.remove('active');
        document.getElementById('delMode').classList.remove('active');
        document.getElementById('eraserMode').classList.remove('active');
        drawingCanvas.style.pointerEvents = 'none';
        dragLayer.style.pointerEvents = 'none';
        mapCanvas.style.pointerEvents = 'none';
        iconLayer.style.pointerEvents = 'auto';
    }
}

function switchToMoveMapMode() {
    if(currentMode !== 'map') {
        currentMode = 'map';
        document.getElementById('moveMapMode').classList.add('active');
        document.getElementById('moveIconMode').classList.remove('active');
        document.getElementById('penMode').classList.remove('active');
        document.getElementById('delMode').classList.remove('active');
        document.getElementById('eraserMode').classList.remove('active');
        drawingCanvas.style.pointerEvents = 'none';
        dragLayer.style.pointerEvents = 'auto';
        mapCanvas.style.pointerEvents = 'auto';
        iconLayer.style.pointerEvents = 'none';

    }
}

function switchToDelIconMode() {
    if(currentMode !== 'del') {
        currentMode = 'del';
        document.getElementById('delMode').classList.add('active');
        document.getElementById('penMode').classList.remove('active');
        document.getElementById('moveIconMode').classList.remove('active');
        document.getElementById('moveMapMode').classList.remove('active');
        document.getElementById('eraserMode').classList.remove('active');
        drawingCanvas.style.pointerEvents = 'none';
        dragLayer.style.pointerEvents = 'none';
        mapCanvas.style.pointerEvents = 'none';
        iconLayer.style.pointerEvents = 'auto';
    }
}

/* event listeners ----------------------------------------------- */

// zoom event listener
container.addEventListener('wheel', handleWheelZoom);
container.addEventListener('touchstart', handleTouchStart);
container.addEventListener('touchmove', handleTouchZoom);
container.addEventListener('touchend', handleTouchEnd);

// mouse map drag event listeners
mapCanvas.addEventListener('mousedown', startDraggingMap);
mapCanvas.addEventListener('mousemove', dragMap);
mapCanvas.addEventListener('mouseup', stopDraggingMap);
mapCanvas.addEventListener('mouseout', stopDraggingMap);

// touch map drag event listener
mapCanvas.addEventListener('touchstart', startDraggingMap);
mapCanvas.addEventListener('touchmove', dragMap);
mapCanvas.addEventListener('touchend', stopDraggingMap);
mapCanvas.addEventListener('touchcancel', stopDraggingMap);

// icon event listeners
iconLayer.addEventListener('mousemove', dragIcon);
iconLayer.addEventListener('touchmove', dragIcon)
document.addEventListener('mouseup', stopDraggingIcon);
document.addEventListener('touchend', stopDraggingIcon);

// mouse draw event listeners
drawingCanvas.addEventListener('mousedown', startDrawing);
drawingCanvas.addEventListener('mousemove', draw);
drawingCanvas.addEventListener('mouseup', stopDrawing);
drawingCanvas.addEventListener('mouseout', stopDrawing);

// touch draw event listener
drawingCanvas.addEventListener('touchstart', startDrawing);
drawingCanvas.addEventListener('touchmove', draw);
drawingCanvas.addEventListener('touchend', stopDrawing);
drawingCanvas.addEventListener('touchcancel', stopDrawing);

// drag icon
document.addEventListener('mousemove', dragIcon);
document.addEventListener('mouseup', stopDraggingIcon);

// resize event listeners
window.addEventListener('resize', resizeCanvas);
document.addEventListener('DOMContentLoaded', resizeCanvas);

// delete icon
iconLayer.addEventListener('mousedown', (e) => {
    if(currentMode === 'del' && e.target.classList.contains('draggable-icon')) {
        deleteIcon(e);
    }
});

/* control panel function ---------------------------------------- */

function undoDraw() {
    if(paths.length > 0) {
        paths.pop();
        redrawCanvas();
    }
}

function clearDraw() {
    while(paths.length > 0) {
        paths.pop();
    }
    redrawCanvas();
}

function clearIcons() {
    icons.forEach(icon =>{
        icon.remove();
    });
    icons = [];
}

function addIconGet() {
    const iconSelect = document.getElementById('iconSelect');
    const selectedIcon = iconSelect.value;
    const sideRadio = document.querySelector('input[name="sideSwitch"]:checked');
    const selectedSide = sideRadio.value;
    if(selectedIcon && selectedSide) {
        addIcon(selectedIcon, selectedSide);
    }
}

/* control panel event listeners --------------------------------- */

// left side of menu bar
const deleteIconButton = document.getElementById('delMode');
deleteIconButton.addEventListener('click', switchToDelIconMode);

const moveIconModeButton = document.getElementById('moveIconMode');
moveIconModeButton.addEventListener('click', switchToMoveIconMode);

const moveMapButton = document.getElementById('moveMapMode');
moveMapButton.addEventListener('click', switchToMoveMapMode);

const clearIconsButton = document.getElementById('clearIcons');
clearIconsButton.addEventListener('click', clearIcons);

// right side of menu bar
const penModeButton = document.getElementById('penMode');
penModeButton.addEventListener('click', switchToPenMode);

const eraserButton = document.getElementById('eraserMode');
eraserButton.addEventListener('click', switchToEraserMode);

const undoButton = document.getElementById('undo');
undoButton.addEventListener('click', undoDraw);

const clearPenButton = document.getElementById('clearPen');
clearPenButton.addEventListener('click', clearDraw);

const lineWidthMenu = document.getElementById('lineWidth');
lineWidthMenu.addEventListener('change', (e) => {
    lineWidth = parseInt(e.target.value);
    switchToPenMode();
});

const lineColorMenu = document.getElementById('lineColor'); 
lineColorMenu.addEventListener('change', (e) => {
    lineColor = e.target.value;
    switchToPenMode();
});

const penTypeMenu = document.getElementById('penType');
penTypeMenu.addEventListener('change', (e) => {
    penType = e.target.value;
    switchToPenMode();
});

/* keyboard event listeners */
document.addEventListener('keydown', checkKeydown);

function checkKeydown(e) {
    //console.log(e.key);
    switch(e.key) {
        // delete icon
        case 'f':
            switchToDelIconMode();
            break;
        // move icon
        case 'i':
            switchToMoveIconMode();
            break;
        // move map
        case 'm':
            switchToMoveMapMode();
            break;
        // clear icons
        case 'x':
            clearIcons();
            break;
        // clear draw
        case 'c':
            clearDraw();    
            break;
        // draw
        case 'd':
            switchToPenMode();
            break;
        // eraser
        case 'e':
            switchToEraserMode();
            break;
        // undo
        case 'z':
            undoDraw();
            break;
        default:
            break;
    }
}

/* initial setup defaults ---------------------------------------- */
bgImage.onload = () => {
    resizeCanvas();
};
switchToPenMode();
