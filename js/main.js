import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── CONFIG & STATE ───────────────────────────────────────────
let isDocIntro = true, introIndex = 0;
let prevTime = performance.now();
const mouse = new THREE.Vector2(), raycaster = new THREE.Raycaster();

const MATS = {
    clay: new THREE.MeshStandardMaterial({ color: 0xcc7a5c, roughness: 0.9 }),
    clayDark: new THREE.MeshStandardMaterial({ color: 0x9c5a4a, roughness: 0.9 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 1.0 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x543a2a, roughness: 0.9 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.7, roughness: 0.2 }),
    moon: new THREE.MeshStandardMaterial({ color: 0xe0eaff, emissive: 0xe0eaff, emissiveIntensity: 2 }),
    white: new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 1.0 }),
    carpet: new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 1.0 }),
    kaftan: new THREE.MeshStandardMaterial({ color: 0x0044aa, roughness: 0.8 }),
    skin: new THREE.MeshStandardMaterial({ color: 0x8a5a4a, roughness: 0.6 }),
    water: new THREE.MeshPhysicalMaterial({
        color: 0x88ccff,
        transmission: 0.9,
        thickness: 0.5,
        roughness: 0.1,
        metalness: 0,
        ior: 1.33,
        transparent: true
    }),
    metal: new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 })
};
const waterfallMeshes = [];
let waterTex; // Animated texture

const NARRATION = [
    "Marrakech... The Red City under the silver crescent.",
    "Behold the Medina in miniature—a toy-box of trade and ancient code.",
    "In the quiet shadows, legends come to life. Observe the Merchants and the Spirits of the night.",
    "Engage with the silence. Step into the Moroccan Protocol."
];

// ─── RENDERER & SCENE ─────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050810);
scene.fog = new THREE.Fog(0x050810, 20, 110);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(30, 18, 55); // Cinematic Hero Shot

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Capped for perf
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // Faster than soft
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3; // Very slow cinematic rotation
controls.maxDistance = 70;
controls.minDistance = 15;
controls.target.set(0, 4, 0);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.4, 0.85);
composer.addPass(bloom);

// ─── REALISTIC WATER TEXTURE ──────────────────────────────
function createWaterTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#55aaff');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, '#55aaff');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 512);
    // Add white streaks for foam
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 40; i++) {
        ctx.fillRect(Math.random() * 128, Math.random() * 512, 2, Math.random() * 50);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}
waterTex = createWaterTexture();
MATS.water.map = waterTex;

// ─── STARS (DENSE NIGHT SKY) ──────────────────────────────────
const starG = new THREE.Group();
const starGeo = new THREE.SphereGeometry(0.1, 8, 8);
const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
for (let i = 0; i < 500; i++) {
    const s = new THREE.Mesh(starGeo, starMat);
    const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(250));
    if (y > 5) { // Keep stars above the horizon
        s.position.set(x, y, z);
        starG.add(s);

        // Add "Hero Stars" with a little bit of light
        if (Math.random() > 0.97) {
            const glow = new THREE.PointLight(0xffffff, 20, 30);
            glow.position.copy(s.position);
            starG.add(glow);
        }
    }
}
scene.add(starG);

// ─── CLOUDS (NIGHT ATMOSPHERE) ────────────────────────────────
function buildClouds() {
    const cloudG = new THREE.Group();
    // Lighter, more reactive cloud material
    const cloudMat = new THREE.MeshPhongMaterial({
        color: 0x8899aa,
        transparent: true,
        opacity: 0.35,
        shininess: 0
    });
    const cloudGeo = new THREE.SphereGeometry(4, 16, 16);

    for (let i = 0; i < 12; i++) {
        const cloud = new THREE.Group();
        const numBlobs = 6 + Math.floor(Math.random() * 4);
        for (let j = 0; j < numBlobs; j++) {
            const blob = new THREE.Mesh(cloudGeo, cloudMat);
            blob.position.set(j * 3, Math.sin(j) * 2, (Math.random() - 0.5) * 4);
            blob.scale.set(1.5, 0.8, 1);
            cloud.add(blob);
        }
        cloud.position.set(
            THREE.MathUtils.randFloatSpread(150),
            20 + Math.random() * 15,
            THREE.MathUtils.randFloatSpread(150)
        );
        cloudG.add(cloud);
    }
    scene.add(cloudG);
}
buildClouds();

// ─── DUST PARTICLES (ATMOSPHERE) ──────────────────────────────
const dustG = new THREE.Group();
const dustMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
const dustGeo = new THREE.SphereGeometry(0.02, 4, 4);
for (let i = 0; i < 200; i++) {
    const d = new THREE.Mesh(dustGeo, dustMat);
    d.position.set(THREE.MathUtils.randFloatSpread(60), Math.random() * 30, THREE.MathUtils.randFloatSpread(60));
    d.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02) };
    dustG.add(d);
}
scene.add(dustG);

// ─── LIGHTING (MOONLIGHT) ─────────────────────────────────────
const ambient = new THREE.AmbientLight(0x223344, 1.2);
scene.add(ambient);

const moonlight = new THREE.DirectionalLight(0x4488ff, 2.0);
moonlight.position.set(20, 50, 20);
moonlight.castShadow = true;
moonlight.shadow.mapSize.set(1024, 1024); // Lowered for performance
scene.add(moonlight);

// ─── DYNAMIC HUD ──────────────────────────────────────────────
function updateHUD() {
    if (Math.random() > 0.05) return;
    const codes = ["SYNC_STABLE", "EXHIBITION_READY", "NODE_01_AUTH", "ARCHIVE_LINKED"];
    document.querySelector('.hud-tr').innerHTML = `DAYLIGHT: 100%<br>STATUS: ${codes[Math.floor(Math.random() * codes.length)]}`;
    const bl = document.querySelector('.hud-bl');
    if (bl) bl.style.opacity = Math.random() > 0.1 ? "1" : "0.4"; // Flicker
}

// ─── PROCEDURAL LUNAR TEXTURE ──────────────────────────────
function createMoonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f0f4ff'; ctx.fillRect(0, 0, 512, 512);
    // Add "Craters" and noise for realism
    for (let i = 0; i < 150; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 25, 0, Math.PI * 2);
        ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}
const moonTex = createMoonTexture();
MATS.moon.map = moonTex;
MATS.moon.emissiveIntensity = 8;
MATS.moon.roughness = 0.5;

// ─── PROCEDURAL MOROCCAN CARPET TEXTURE ──────────────────────
function createCarpetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    // Base Deep Red
    ctx.fillStyle = '#8b0000'; ctx.fillRect(0, 0, 1024, 1024);

    // Draw Geometric Diamonds (Traditional Berber Style) with Gold and Green
    for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
            // Gold Outer Diamond
            ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 4;
            ctx.strokeRect(x * 64 + 16, y * 64 + 16, 32, 32);

            // Emerald Green Center Motif
            ctx.fillStyle = '#006400';
            ctx.beginPath();
            ctx.arc(x * 64 + 32, y * 64 + 32, 8, 0, Math.PI * 2);
            ctx.fill();

            // Central Gold Sparkle
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(x * 64 + 30, y * 64 + 30, 4, 4);
        }
    }

    // Traditional Ornate Borders (Gold and Green)
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 15;
    ctx.strokeRect(10, 10, 1004, 1004);

    ctx.strokeStyle = '#004d00'; ctx.lineWidth = 10; // Dark Green inner border
    ctx.strokeRect(25, 25, 974, 974);

    ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 8; // Gold final border
    ctx.strokeRect(40, 40, 944, 944);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 4);
    return tex;
}
const carpetTex = createCarpetTexture();
MATS.carpet.map = carpetTex;

// ─── MOROCCAN FLAG CARPET TEXTURE ────────────────────────────
function createFlagTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 342; // Flag proportions
    const ctx = canvas.getContext('2d');
    // Moroccan Red
    ctx.fillStyle = '#c1272d'; ctx.fillRect(0, 0, 512, 342);
    // Green Pentagram (Star)
    ctx.strokeStyle = '#006233'; ctx.lineWidth = 12;
    const cx = 256, cy = 171, r = 70;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI * 0.8);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
    return new THREE.CanvasTexture(canvas);
}
const flagTex = createFlagTexture();
const flagMat = new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide });

// ─── TAJINE MATERIAL (GLAZED CLAY) ──────────────────────────
MATS.tajine = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.3, metalness: 0.1 }); // Rich terracotta glaze

// ─── THE FULL MOON (REPLACING HILAL) ───────────────────────
function buildMoon() {
    const moonGeo = new THREE.SphereGeometry(4, 32, 32); // Lowered segments
    const moonMesh = new THREE.Mesh(moonGeo, MATS.moon);
    moonMesh.position.set(-15, 35, -30); // Pushed higher
    moonMesh.rotation.y = Math.PI;
    scene.add(moonMesh);

    // Realistic Atmospheric Halo
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = haloCanvas.height = 256;
    const hCtx = haloCanvas.getContext('2d');
    const hGrad = hCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    hGrad.addColorStop(0, 'rgba(255, 250, 240, 0.45)');
    hGrad.addColorStop(1, 'rgba(255, 250, 240, 0)');
    hCtx.fillStyle = hGrad; hCtx.fillRect(0, 0, 256, 256);
    const haloTex = new THREE.CanvasTexture(haloCanvas);
    const haloSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, blending: THREE.AdditiveBlending }));
    haloSprite.scale.set(25, 25, 1);
    haloSprite.position.copy(moonMesh.position);
    scene.add(haloSprite);

    // Powerful Moon Glow that reaches the clouds
    const moonPoint = new THREE.PointLight(0xffffee, 1500, 400);
    moonPoint.position.copy(moonMesh.position);
    scene.add(moonPoint);
}
buildMoon();

// ─── DIORAMA ASSEMBLY ────────────────────────────────────────
const diorama = new THREE.Group();

function buildDiorama() {
    // 1. Foundation Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(15, 16, 5, 32), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 }));
    base.position.y = -2.5; diorama.add(base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 0.2, 32), MATS.carpet);
    top.receiveShadow = true; diorama.add(top);

    // 2. Landmarks
    buildMinaret(-8, 0, -8); // Koutoubia style
    buildBabGate(0, 0, -14); // Grand Entrance

    // 3. Dense Riad Cityscape
    createComplexRiad(-12, 0, 0, 15, 8, 10);
    createComplexRiad(5, 0, -5, 10, 6, 6);
    createComplexRiad(-2, 0, 8, 8, 12, 8);

    // 4. Life & Clutter
    addVegetationAndBazaar();
    addWiresAndLamps();
    buildWaterfall(0, 0, 0);

    // 5. Realistic Person: Merchant
    buildMerchantStall(8, 0, 8);

    // 6. Ground Details (Amber Lights)
    addGroundDetails();

    // 7. Flag Carpet on Roof
    const flagCarpet = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.7), flagMat);
    flagCarpet.position.set(-12, 15.1, 0); flagCarpet.rotation.x = -Math.PI / 2;
    diorama.add(flagCarpet);

    // 8. Scattered Tajines
    buildTajine(7, 0.2, 7, 1);
    buildTajine(6.5, 0.2, 9, 0.82);
    buildTajine(-2, 0.2, 4, 1.15);
    buildTajine(0, 0, -12.5, 0.95);
}

function addGroundDetails() {
    // Elegant Golden Ground Light System
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const l = new THREE.PointLight(0xffd700, 5, 15);
        l.position.set(Math.cos(angle) * 11, 0.8, Math.sin(angle) * 11);
        diorama.add(l);
    }
}

function buildWaterfall(x, y, z) {
    const group = new THREE.Group();
    // Rock Pool (Circle of stones)
    const pool = new THREE.Group();
    for (let i = 0; i < 12; i++) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.4), MATS.stone);
        rock.position.set(Math.cos(i / 12 * Math.PI * 2) * 1.8, 0, Math.sin(i / 12 * Math.PI * 2) * 1.8);
        pool.add(rock);
    }
    group.add(pool);

    const poolWater = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), MATS.water);
    poolWater.rotation.x = -Math.PI / 2; poolWater.position.y = 0.2; group.add(poolWater);

    // Main Fall (Tapered Cylinder for realism)
    const fallGeo = new THREE.CylinderGeometry(0.6, 0.9, 6, 16, 1, true);
    const fall = new THREE.Mesh(fallGeo, MATS.water);
    fall.position.y = 3;
    group.add(fall);
    waterfallMeshes.push(fall);

    // White Foam Cap (Top)
    const cap = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.15, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    cap.rotation.x = Math.PI / 2; cap.position.y = 6; group.add(cap);

    // Mist / Splash System (Animated particles)
    for (let i = 0; i < 15; i++) {
        const splash = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }));
        splash.position.set((Math.random() - 0.5) * 1.5, 0.4, (Math.random() - 0.5) * 1.5);
        group.add(splash);
        waterfallMeshes.push(splash); // Added to animation loop
    }

    group.position.set(x, y, z); diorama.add(group);
}

function buildMinaret(x, y, z) {
    const minaret = new THREE.Group();
    // Tower body
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 18, 4), MATS.clay);
    tower.position.y = 9; tower.castShadow = true; minaret.add(tower);
    // Ornament bands
    for (let i = 0; i < 3; i++) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 4.2), MATS.clayDark);
        band.position.y = 12 + i * 2; minaret.add(band);
    }
    // Top Dome
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 2.5, 4), MATS.clayDark);
    top.position.y = 19; top.rotation.y = Math.PI / 4; minaret.add(top);
    const goldBall = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 5 }));
    goldBall.position.y = 20.5; minaret.add(goldBall);

    // Mosque Top Light
    const mLight = new THREE.PointLight(0xffd700, 50, 20);
    mLight.position.set(0, 21, 0);
    minaret.add(mLight);

    minaret.position.set(x, y, z); diorama.add(minaret);
}

function buildBabGate(x, y, z) {
    const bab = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(6, 12, 3), MATS.clay);
    wall.position.y = 6; wall.castShadow = true; bab.add(wall);
    // Large Arch
    const arch = new THREE.Mesh(new THREE.TorusGeometry(2, 0.4, 8, 24, Math.PI), MATS.wood);
    arch.position.set(0, 5, 1.55); bab.add(arch);

    bab.position.set(x, y, z); diorama.add(bab);
}

function createComplexRiad(x, y, z, h, w, d) {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MATS.clay);
    mesh.position.y = h / 2; mesh.castShadow = true; mesh.receiveShadow = true;
    g.add(mesh);

    // 1. Structural Cedar Beams (Protruding from walls)
    for (let i = 0; i < 6; i++) {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, d + 1.2), MATS.wood);
        pole.position.set(0, h * 0.85, (i - 2.5) * (d / 6));
        g.add(pole);
    }

    // 2. Crenelated Roofline (Merlons)
    const mSize = 0.4;
    for (let i = 0; i < w / mSize; i += 2) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(mSize, mSize, d + 0.1), MATS.clay);
        m.position.set(-w / 2 + i * mSize, h + mSize / 2, 0);
        g.add(m);
    }

    // 3. Mashrabiya (Wooden Lattice Balcony)
    if (Math.random() > 0.5) {
        const balc = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 3), MATS.wood);
        balc.position.set(w / 2 + 0.6, h * 0.5, 0);
        g.add(balc);
        // Golden trim for the balcony
        const trim = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 3.1), MATS.gold);
        trim.position.set(w / 2 + 0.6, h * 0.5 + 1.25, 0);
        g.add(trim);
    }

    // 4. Modern Realism: AC Unit
    if (Math.random() > 0.3) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.6), MATS.metal);
        ac.position.set(-w / 2 - 0.2, h * 0.4, d / 3);
        g.add(ac);
    }

    // 5. Zellige Decorative Base
    const zBase = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 1.2, d + 0.2), MATS.gold); // Golden base trim
    zBase.position.y = 0.6; g.add(zBase);

    // 6. Windows & Lights
    for (let i = 0; i < 4; i++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.8), MATS.wood);
        win.position.set(w / 2 + 0.05, h * 0.7 - i * 1.8, (i % 2 === 0 ? 1 : -1) * d / 4);
        g.add(win);

        // Add a warm glow inside some windows (Material only for perf)
        if (Math.random() > 0.4) {
            const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), new THREE.MeshBasicMaterial({ color: 0xffaa44 }));
            glow.position.set(w / 2 + 0.06, h * 0.7 - i * 1.8, (i % 2 === 0 ? 1 : -1) * d / 4);
            glow.rotation.y = Math.PI / 2;
            g.add(glow);
        }
    }

    g.position.set(x, y, z); diorama.add(g);
}

function addVegetationAndBazaar() {
    // Palms
    for (let i = 0; i < 4; i++) {
        const palm = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 6), MATS.wood);
        trunk.position.y = 3; palm.add(trunk);
        for (let j = 0; j < 6; j++) {
            const leaf = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x2d4a22 }));
            leaf.position.y = 6; leaf.rotation.y = (j / 6) * Math.PI * 2; leaf.rotation.z = 0.5;
            palm.add(leaf);
        }
        palm.position.set(-10 + i * 5, 0, 10 - i * 2);
        diorama.add(palm);
    }

    // Hanging Rugs
    const rugColors = [0xaa2222, 0x1155aa, 0x998811];
    for (let i = 0; i < 3; i++) {
        const rug = new THREE.Mesh(new THREE.PlaneGeometry(2, 3.5), new THREE.MeshStandardMaterial({ color: rugColors[i], side: THREE.DoubleSide }));
        rug.position.set(-14.8, 6, -2 + i * 3); rug.rotation.y = Math.PI / 2;
        diorama.add(rug);
    }
}

function addWiresAndLamps() {
    const wireCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-8, 14, -6), new THREE.Vector3(0, 10, 0), new THREE.Vector3(8, 12, 8));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(wireCurve, 20, 0.03, 8, false), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    diorama.add(tube);

    // Ramadan Theme: Hanging Stars
    const starShape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.5;
    const innerRadius = 0.2;
    for (let i = 0; i < 2 * points; i++) {
        const angle = (i * Math.PI) / points;
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) starShape.moveTo(x, y);
        else starShape.lineTo(x, y);
    }
    starShape.closePath();
    const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.1, bevelEnabled: false });
    const goldEmissive = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 8 });

    for (let i = 0; i < 3; i++) {
        const star = new THREE.Mesh(starGeo, goldEmissive);

        // Use the mathematical curve to place stars perfectly ON the line
        const t = 0.25 + (i * 0.25); // Places at 25%, 50%, and 75% along the wire
        const pointOnWire = wireCurve.getPoint(t);
        star.position.copy(pointOnWire);

        star.rotation.z = Math.random() * Math.PI;
        diorama.add(star);

        // Subtle Golden Star Glow (Right star light minimized to 0)
        const intensity = (i === 2) ? 0 : 6;
        const l = new THREE.PointLight(0xffd700, intensity, 10);
        l.position.copy(star.position);
        diorama.add(l);
    }
}

function buildTajine(x, y, z, s = 1) {
    const group = new THREE.Group();
    // Base Dish
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.15, 32), MATS.tajine);
    base.position.y = 0.075; group.add(base);
    // Conical Lid
    const lid = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.8, 32), MATS.tajine);
    lid.position.y = 0.55; group.add(lid);
    // Top Knob
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), MATS.tajine);
    knob.position.y = 0.95; group.add(knob);

    group.scale.setScalar(s);
    group.position.set(x, y, z);
    diorama.add(group);
}

function buildMerchantStall(x, y, z) {
    const complex = new THREE.Group();
    // Stall with canopy
    const stall = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 2.5), MATS.wood);
    stall.position.y = 0.75; complex.add(stall);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.2, 3), new THREE.MeshStandardMaterial({ color: 0xaa2222 }));
    canopy.position.y = 3.5; complex.add(canopy);

    // Baskets
    for (let i = 0; i < 3; i++) {
        const basket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 1.2), MATS.clayDark);
        basket.position.set(-1.2 + i * 1.2, 1.6, 0.4); complex.add(basket);
        for (let v = 0; v < 6; v++) {
            const veg = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshStandardMaterial({ color: i === 0 ? 0xff3300 : i === 1 ? 0x44aa22 : 0xffaa00 }));
            veg.position.set(basket.position.x + (Math.random() - 0.5) * 0.5, 1.8, 0.4 + (Math.random() - 0.5) * 0.5);
            complex.add(veg);
        }
    }

    // Realistic Person (Human Proportions)
    const person = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.4), MATS.kaftan); // Torso
    body.position.y = 1.6; person.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), MATS.skin);
    head.position.y = 2.6; person.add(head);
    const turban = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.12, 8, 24), MATS.white);
    turban.rotation.x = Math.PI / 2; turban.position.y = 2.9; person.add(turban);
    // Arms
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 0.2), MATS.kaftan);
    arm.position.set(0.45, 1.7, 0); arm.rotation.z = -0.15; person.add(arm);
    const arm2 = arm.clone(); arm2.position.x = -0.45; arm2.rotation.z = 0.15; person.add(arm2);
    // Legs
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.0, 0.28), MATS.white);
    leg.position.set(0.18, 0.5, 0); person.add(leg);
    const leg2 = leg.clone(); leg2.position.x = -0.18; person.add(leg2);

    person.position.set(0, 0, -2.2);
    person.userData = { isMerchant: true, head: head };
    person.traverse(c => { if (c.isMesh) c.userData = { isMerchant: true, head: head }; });
    complex.add(person);

    complex.position.set(x, y, z); diorama.add(complex);
}

buildDiorama();
scene.add(diorama);

// ─── PORTAL CONTENT ──────────────────────────────────────────
const PORTAL_DATA = {
    'OVERVIEW': [
        { h: "Ouassim El Bachiri", p: "Multi-disciplinary developer specializing in high-fidelity 3D and cloud architectures.", t: "PROFILE_V1" },
        { h: "The Ochre Protocol", p: "Marrakech isn't just a place; it's a technical philosophy of layering and complexity.", t: "CORE_MISSION" }
    ],
    'TECHNICAL_STK': [
        { h: "Engine Architecture", p: "Three.js, GLSL, WebGPU and customized post-processing pipelines.", t: "FRONTEND" },
        { h: "Systems Cloud", p: "AWS Solutions Architecture, Terraform, Lambda, and Scalable Node.js clusters.", t: "BACKEND" }
    ],
    'LEGACY_TRD': [
        { h: "Moroccan Zellige", p: "Applying ancient geometric patterns into modern vector-based UI systems.", t: "DESIGN" },
        { h: "The Medina Labyrinth", p: "Architecture as a model for scalable API design—complex yet navigable.", t: "ANALOGY" }
    ]
};

function openPortfolio(target) {
    const head = target.userData.head;
    if (head) { head.rotation.x = 0.3; setTimeout(() => head.rotation.x = 0, 400); }

    // Glitch Flash & Camera Shake
    document.body.style.backgroundColor = "#fff";
    setTimeout(() => document.body.style.backgroundColor = "", 100);

    const ui = document.getElementById('portal-ui');
    const body = document.getElementById('p-body');
    const title = document.getElementById('p-title');
    title.textContent = "THE MERCHANT'S ARCHIVE";

    // Default to Overview
    updateTab('OVERVIEW');
    ui.style.display = 'flex';
    ui.style.opacity = '0';
    setTimeout(() => ui.style.opacity = '1', 50); // Small fade in

    controls.autoRotate = false;
}

window.updateTab = (tab) => {
    const body = document.getElementById('p-body');
    const data = PORTAL_DATA[tab] || [];
    body.innerHTML = data.map((i, idx) => `
        <div class="card" style="animation: cardIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards ${idx * 0.15}s; opacity: 0;">
            <h3>${i.h}</h3>
            <p>${i.p}</p>
            <div class="tag">${i.t}</div>
        </div>
    `).join('');

    // Inject Card Entrance Animation at runtime if not in CSS
    if (!document.getElementById('card-anim')) {
        const style = document.createElement('style');
        style.id = 'card-anim';
        style.textContent = `
            @keyframes cardIn {
                from { opacity: 0; transform: translateY(30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    // Update active state in sidebar
    document.querySelectorAll('.side-item').forEach(el => {
        el.classList.remove('active');
        if (el.textContent.trim() === tab) el.classList.add('active');
    });
};

// ─── CINEMATIC INTRO ──────────────────────────────────────────
function startNarration() {
    if (introIndex >= NARRATION.length) { endIntro(); return; }
    const box = document.getElementById('narration-box');
    const text = document.getElementById('narration-text');
    box.style.display = 'block'; text.textContent = NARRATION[introIndex];
    text.style.opacity = 0;
    let op = 0; const fin = setInterval(() => { op += 0.05; text.style.opacity = op; if (op >= 1) clearInterval(fin); }, 50);
    setTimeout(() => {
        const fout = setInterval(() => { op -= 0.05; text.style.opacity = op; if (op <= 0) { clearInterval(fout); introIndex++; startNarration(); } }, 50);
    }, 4500);
}

function endIntro() {
    isDocIntro = false;
    document.body.classList.remove('cinematic-mode');
    document.getElementById('hud').style.display = 'block';
    document.getElementById('narration-box').style.display = 'none';
}

// ─── INTERACTION & INPUT ─────────────────────────────────────
// ─── START EXPERIENCE AUTOMATICALLY ───────────────────────
window.addEventListener('load', () => {
    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            startNarration();
        }, 800);
    }
});

document.querySelectorAll('.side-item').forEach(item => {
    item.addEventListener('click', () => updateTab(item.textContent.trim()));
});

document.getElementById('close-p').addEventListener('click', () => {
    document.getElementById('portal-ui').style.display = 'none';
    controls.autoRotate = true;
});

window.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (let h of hits) if (h.object.userData.isMerchant) { openPortfolio(h.object); break; }
});

document.addEventListener('mousemove', e => {
    const c = document.getElementById('cursor'), d = document.getElementById('cursor-inner');
    c.style.left = d.style.left = e.clientX + 'px';
    c.style.top = d.style.top = e.clientY + 'px';

    if (!isDocIntro) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(scene.children, true);
        let onM = false; for (let h of hits) if (h.object.userData.isMerchant) onM = true;
        document.getElementById('interact-hint').style.display = onM ? 'block' : 'none';
        c.style.width = onM ? '80px' : '50px';
        c.style.height = onM ? '80px' : '50px';
    }
});

// ─── MAIN LOOP ────────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = (now - prevTime) / 1000;
    prevTime = now;
    const t = now * 0.001;

    if (isDocIntro) {
        camera.position.x = Math.cos(t * 0.1) * 55;
        camera.position.z = Math.sin(t * 0.1) * 55;
        camera.position.y = 20 + Math.sin(t * 0.2) * 8;
        camera.lookAt(0, 5, 0);
    } else {
        controls.update();
    }

    // Subtle diorama vibration
    diorama.position.y = Math.sin(t * 0.8) * 0.08;

    // Realistic Waterfall Animation
    if (waterTex) waterTex.offset.y -= dt * 2.5; // Flow down
    waterfallMeshes.forEach((m, i) => {
        if (m.geometry.type === "SphereGeometry") {
            // Splash animation
            m.position.y = 0.4 + Math.abs(Math.sin(t * 10 + i)) * 0.5;
            m.scale.setScalar(0.8 + Math.sin(t * 12 + i) * 0.2);
        } else {
            // Main fall pulse
            m.scale.x = 1.0 + Math.sin(t * 20) * 0.02;
            m.scale.z = 1.0 + Math.cos(t * 20) * 0.02;
        }
    });

    // Atmosphere: Dust particle movement
    dustG.children.forEach(d => {
        d.position.add(d.userData.vel);
        if (d.position.y > 30) d.position.y = 0;
        if (Math.abs(d.position.x) > 30) d.position.x *= -0.9;
    });

    updateHUD();

    composer.render();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();
