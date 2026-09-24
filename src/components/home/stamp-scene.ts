/**
 * Three.js scene for the home-page hero: a self-inking stamp that explodes into
 * its parts on scroll, gets the customer's design on its rubber plate,
 * re-assembles and stamps an impression onto paper.
 *
 * Framework-free on purpose: it is dynamically imported only after the page is
 * interactive, and driven by a single `progress` number (0..1).
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export { PART_LABELS, type PartLabel } from './stamp-labels';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (p: number, a: number, b: number) => ease(clamp((p - a) / (b - a)));

function plateTexture(lines: string[], round = false) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d')!;
  // Laser-engraved red rubber: raised text is the lighter surface.
  const bg = g.createLinearGradient(0, 0, c.width, c.height);
  bg.addColorStop(0, '#7e2f29');
  bg.addColorStop(1, '#6a2621');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  // Text on a rubber plate is mirrored.
  g.translate(c.width, 0);
  g.scale(-1, 1);
  g.fillStyle = '#e7b7a8';
  g.strokeStyle = '#e7b7a8';
  g.lineWidth = 14;
  if (round) {
    g.beginPath();
    g.arc(512, 256, 220, 0, Math.PI * 2);
    g.stroke();
  } else g.strokeRect(40, 40, c.width - 80, c.height - 80);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.direction = 'rtl';
  const sizes = [92, 64, 58, 58];
  const total = lines.reduce((s, _, i) => s + sizes[i] * 1.25, 0);
  let y = 256 - total / 2;
  lines.forEach((l, i) => {
    g.font = `${i === 0 ? 800 : 500} ${sizes[i]}px Heebo, Arial, sans-serif`;
    y += (sizes[i] * 1.25) / 2;
    g.fillText(l, 512, y);
    y += (sizes[i] * 1.25) / 2;
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function impressionTexture(lines: string[]) {
  // 2× resolution + crisp ink: the impression is the payoff shot, it must read.
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 1024;
  const g = c.getContext('2d')!;
  g.scale(2, 2);
  g.fillStyle = '#1d44e0';
  g.strokeStyle = '#1d44e0';
  g.lineWidth = 16;
  g.lineJoin = 'round';
  g.strokeRect(36, 36, 1024 - 72, 512 - 72);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.direction = 'rtl';
  const sizes = [104, 70, 64, 64];
  const total = lines.reduce((s, _, i) => s + sizes[i] * 1.22, 0);
  let y = 256 - total / 2;
  lines.forEach((l, i) => {
    g.font = `${i === 0 ? 800 : 600} ${sizes[i]}px Heebo, Arial, sans-serif`;
    y += (sizes[i] * 1.22) / 2;
    g.fillText(l, 512, y);
    y += (sizes[i] * 1.22) / 2;
  });
  // Very light ink grain – enough to feel stamped, not enough to blur the text.
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 500; i++) {
    g.globalAlpha = Math.random() * 0.25;
    g.fillRect(Math.random() * 1024, Math.random() * 512, 1.5, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function labelTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 380;
  const g = c.getContext('2d')!;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.direction = 'rtl';
  g.font = 'italic 900 150px Heebo, Arial, sans-serif';
  const grad = g.createLinearGradient(0, 80, 0, 260);
  grad.addColorStop(0, '#0b1426');
  grad.addColorStop(1, '#1c2a44');
  g.fillStyle = grad;
  g.fillText('חותמות 2 דקות', 512, 160);
  g.fillStyle = '#2457ff';
  g.beginPath();
  g.moveTo(170, 262);
  g.quadraticCurveTo(512, 236, 860, 232);
  g.lineTo(860, 244);
  g.quadraticCurveTo(512, 252, 170, 276);
  g.fill();
  g.font = '600 56px Heebo, Arial, sans-serif';
  g.fillStyle = '#5b6678';
  g.fillText('SELF-INKING · PRINT 40', 512, 330);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function contactShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  r.addColorStop(0, 'rgba(11,20,38,0.55)');
  r.addColorStop(0.5, 'rgba(11,20,38,0.18)');
  r.addColorStop(1, 'rgba(11,20,38,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function springGeometry(radius: number, height: number, turns: number, wire: number, segments: number) {
  const pts: THREE.Vector3[] = [];
  const n = turns * 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * Math.PI * 2 * turns;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, t * height - height / 2, Math.sin(a) * radius));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segments, wire, 6, false);
}

export interface StampScene {
  setProgress(p: number): void;
  resize(w: number, h: number): void;
  /** Shift the rendered image down (fraction of height) and scale it – used for the mobile intro. */
  setFraming(shiftY: number, zoom: number): void;
  /** Screen positions (px) of each part, for the HTML labels. */
  labelPositions(): { id: string; x: number; y: number; visible: number }[];
  dispose(): void;
}

export function createStampScene(canvas: HTMLCanvasElement, opts: { lowPower: boolean; lines: string[] }): StampScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.lowPower ? 1.6 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !opts.lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(7.5, 5.5, 9.5);
  camera.lookAt(0, 1.3, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe6f2, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(5, 10, 6);
  key.castShadow = !opts.lowPower;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb0ff, 0.9);
  rim.position.set(-6, 4, -5);
  scene.add(rim);

  // Studio reflections – what makes plastic and chrome read as real.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmrem.dispose();

  const navy = new THREE.MeshPhysicalMaterial({ color: 0x14213d, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xf3f5f9, roughness: 0.32, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const smoke = new THREE.MeshPhysicalMaterial({ color: 0x2a3140, roughness: 0.45, metalness: 0.1, clearcoat: 0.4 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xdfe3ea, roughness: 0.16, metalness: 1 });
  const blue = new THREE.MeshPhysicalMaterial({ color: 0x2457ff, roughness: 0.28, metalness: 0.1, clearcoat: 0.7 });
  const ink = new THREE.MeshStandardMaterial({ color: 0x172554, roughness: 0.95 });
  const SEG = opts.lowPower ? 12 : 32;
  const RS = opts.lowPower ? 2 : 4; // rounded-box smoothness

  const W = 2.6;
  const D = 1.3;
  const root = new THREE.Group();
  scene.add(root);

  const parts: Record<string, { obj: THREE.Object3D; home: THREE.Vector3; exploded: THREE.Vector3 }> = {};
  const add = (id: string, obj: THREE.Object3D, y: number, ey: number, ex = 0) => {
    obj.position.set(0, y, 0);
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    root.add(obj);
    parts[id] = { obj, home: new THREE.Vector3(0, y, 0), exploded: new THREE.Vector3(ex, ey, 0) };
  };
  const rbox = (w: number, h: number, d: number, r: number, mat: THREE.Material) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, RS, r), mat);

  // Handle: ergonomic knob with a coloured ink-indicator insert and a neck.
  const handle = new THREE.Group();
  const knob = rbox(W * 0.82, 0.72, D * 1.04, 0.3, navy);
  handle.add(knob);
  const insert = rbox(W * 0.46, 0.08, D * 0.52, 0.035, blue);
  insert.position.y = 0.36;
  handle.add(insert);
  const neck = rbox(W * 0.58, 0.4, D * 0.72, 0.08, navy);
  neck.position.y = -0.5;
  handle.add(neck);
  add('handle', handle, 3.35, 6.6, 0);

  // Frame: hollow housing with rounded corners (extruded ring) + brand label.
  const ringShape = (w: number, d: number, r: number) => {
    const sh = new THREE.Shape();
    const x = -w / 2;
    const y = -d / 2;
    sh.moveTo(x + r, y);
    sh.lineTo(x + w - r, y);
    sh.quadraticCurveTo(x + w, y, x + w, y + r);
    sh.lineTo(x + w, y + d - r);
    sh.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    sh.lineTo(x + r, y + d);
    sh.quadraticCurveTo(x, y + d, x, y + d - r);
    sh.lineTo(x, y + r);
    sh.quadraticCurveTo(x, y, x + r, y);
    return sh;
  };
  const wallH = 1.9;
  const t = 0.09;
  const outer = ringShape(W, D, 0.22);
  outer.holes.push(ringShape(W - 2 * t, D - 2 * t, 0.16) as unknown as THREE.Path);
  const frameGeo = new THREE.ExtrudeGeometry(outer, { depth: wallH, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: opts.lowPower ? 1 : 3, curveSegments: opts.lowPower ? 6 : 14 });
  frameGeo.rotateX(-Math.PI / 2);
  frameGeo.translate(0, -wallH / 2, 0);
  const frame = new THREE.Group();
  frame.add(new THREE.Mesh(frameGeo, shell));
  const label = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.62, 0.46), new THREE.MeshStandardMaterial({ map: labelTexture(), transparent: true, roughness: 0.4 }));
  label.position.set(0, 0.25, D / 2 + 0.035);
  frame.add(label);
  // Accent band following the housing's rounded corners.
  const band = ringShape(W + 0.1, D + 0.1, 0.26);
  band.holes.push(ringShape(W - 0.02, D - 0.02, 0.2) as unknown as THREE.Path);
  const bandGeo = new THREE.ExtrudeGeometry(band, { depth: 0.07, bevelEnabled: false, curveSegments: opts.lowPower ? 6 : 14 });
  bandGeo.rotateX(-Math.PI / 2);
  const stripe = new THREE.Mesh(bandGeo, blue);
  stripe.position.y = -wallH / 2 + 0.1;
  frame.add(stripe);
  add('frame', frame, 1.95, 4.9, 0);

  // Springs
  const springs = new THREE.Group();
  const sg = springGeometry(0.16, 1.5, 9, 0.025, opts.lowPower ? 90 : 240);
  for (const x of [-0.8, 0.8]) {
    const s = new THREE.Mesh(sg, metal);
    s.position.x = x;
    springs.add(s);
  }
  add('springs', springs, 2.05, 3.55, 0);

  // Mechanism: chrome axle + rounded side arms
  const mech = new THREE.Group();
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, W + 0.1, SEG), metal);
  axle.rotation.z = Math.PI / 2;
  mech.add(axle);
  for (const x of [-W / 2 + 0.2, W / 2 - 0.2]) {
    const arm = rbox(0.13, 1.1, 0.5, 0.05, blue);
    arm.position.set(x, -0.3, 0);
    mech.add(arm);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, SEG), metal);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(x + Math.sign(x) * 0.09, 0, 0);
    mech.add(cap);
  }
  add('mechanism', mech, 1.45, 2.45, 0);

  // Ink cartridge: tray + saturated foam + pull tab
  const inkPad = new THREE.Group();
  inkPad.add(rbox(W - 0.3, 0.18, D - 0.25, 0.05, smoke));
  const foam = rbox(W - 0.45, 0.06, D - 0.4, 0.02, ink);
  foam.position.y = 0.09;
  inkPad.add(foam);
  const tab = rbox(0.34, 0.06, 0.22, 0.02, smoke);
  tab.position.set(0, 0, (D - 0.25) / 2 + 0.1);
  inkPad.add(tab);
  add('pad', inkPad, 1.1, 1.5, 0);

  // Rubber plate with the design (raised text via bump map, faces down)
  const plateGroup = new THREE.Group();
  plateGroup.add(rbox(W - 0.3, 0.12, D - 0.3, 0.03, navy));
  const blankTex = plateTexture(['חותמות 2 דקות', 'חותמת אישית'], false);
  const designTex = plateTexture(opts.lines, false);
  const plateFaceMat = new THREE.MeshStandardMaterial({ map: blankTex, bumpMap: blankTex, bumpScale: 3, roughness: 0.8 });
  const plateFace = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.34, D - 0.34), plateFaceMat);
  plateFace.rotation.x = Math.PI / 2; // facing down
  plateFace.position.y = -0.065;
  plateGroup.add(plateFace);
  // A second, face-up copy while exploded so the design is visible to the camera.
  const plateTopMat = new THREE.MeshStandardMaterial({ map: blankTex, bumpMap: blankTex, bumpScale: 3, roughness: 0.8, transparent: true, opacity: 0 });
  const plateTop = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.34, D - 0.34), plateTopMat);
  plateTop.rotation.x = -Math.PI / 2;
  plateTop.position.y = 0.065;
  plateGroup.add(plateTop);
  add('plate', plateGroup, 0.72, 0.55, 0);

  // Base: the housing's foot
  const base = rbox(W + 0.2, 0.14, D + 0.2, 0.06, smoke);
  add('base', base, 0.55, -0.45, 0);

  // Soft contact shadow that follows the stamp (cheap, works without shadow maps).
  const contactMat = new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false, opacity: 0.55 });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.1, D * 2.6), contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.001;
  scene.add(contact);

  // Paper + impression (unlit white paper so it reads as a sheet, not a grey slab)
  const paperMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, toneMapped: false });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.2), paperMat);
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(-1.4, 0, 0.5);
  scene.add(paper);
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0 });
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.002;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);
  const impTex = impressionTexture(opts.lines);
  impTex.anisotropy = renderer.capabilities.getMaxAnisotropy(); // sharp at a grazing angle
  const impMat = new THREE.MeshBasicMaterial({ map: impTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const impression = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.34, D - 0.34), impMat);
  impression.rotation.x = -Math.PI / 2;
  impression.position.set(-1.4, 0.006, 0.5);
  scene.add(impression);

  let progress = 0;
  let size = { w: 1, h: 1 };
  let framing = { shiftY: 0, zoom: 1 };
  const tmp = new THREE.Vector3();

  function update() {
    const p = progress;
    const explode = seg(p, 0.08, 0.32) * (1 - seg(p, 0.62, 0.76));
    const spin = seg(p, 0.0, 0.62);
    const toSpot = seg(p, 0.76, 0.84); // move over the paper
    const press = seg(p, 0.84, 0.88) * (1 - seg(p, 0.89, 0.93)); // down… up
    const away = seg(p, 0.92, 1); // lift away to reveal the print
    const reveal = seg(p, 0.87, 0.91);
    const designSwap = seg(p, 0.45, 0.55);

    root.rotation.y = -0.55 + spin * Math.PI * 0.9 - toSpot * 0.25;
    for (const { obj, home, exploded } of Object.values(parts)) {
      tmp.copy(home).lerp(exploded, explode);
      obj.position.copy(tmp);
    }
    // The design plate turns face-up while exploded so the customer sees it.
    plateTopMat.opacity = explode;
    plateFaceMat.map = designSwap > 0.5 ? designTex : blankTex;
    plateFaceMat.bumpMap = plateFaceMat.map;
    plateTopMat.map = plateFaceMat.map;
    plateTopMat.bumpMap = plateFaceMat.map;

    // Lift off and leave the frame entirely, so only the impression remains.
    root.position.x = -1.4 * toSpot + 11 * away * away + 2 * away;
    root.position.z = 0.5 * toSpot - 3 * away * away;
    root.position.y = (1 - toSpot) * 0.25 + toSpot * (0.9 * (1 - press) - 0.53 * press) + away * 1.4;
    root.visible = away < 0.96;
    impMat.opacity = reveal;
    contact.position.x = root.position.x;
    contact.position.z = root.position.z;
    contact.scale.setScalar(1 + 0.35 * explode);
    contactMat.opacity = 0.55 * (1 - 0.5 * explode) * (1 - seg(p, 0.7, 0.78)) * (1 - away);
    paperMat.opacity = seg(p, 0.68, 0.78);
    shadowMat.opacity = 0.12 * seg(p, 0.68, 0.78);

    const cam = toSpot;
    // Finale: rise above the paper so the impression is seen almost top-down.
    const top = seg(p, 0.9, 1);
    camera.position.set(
      (7.5 - 3.3 * cam) * (1 - top) + -0.9 * top,
      (5.5 + 1.2 * explode + 2.2 * cam) * (1 - top) + 7.6 * top,
      (9.5 - 1.8 * cam) * (1 - top) + 4.6 * top,
    );
    // While exploded, aim at the middle of the stack (base ≈ -0.5 … handle ≈ 7.3).
    camera.lookAt(-0.9 * cam * (1 - top) + -1.4 * top, (1.3 + 2.1 * explode - 1.0 * cam) * (1 - top), 0.3 * cam * (1 - top) + 0.5 * top);
    // Desktop: pull back while exploded / over the paper so nothing is cropped.
    const desktop = framing.shiftY === 0 && framing.zoom === 1;
    const zoom = desktop ? 1 - 0.26 * explode - 0.15 * cam : framing.zoom;
    if (framing.shiftY || zoom !== 1) {
      camera.zoom = zoom;
      camera.setViewOffset(size.w, size.h, 0, -framing.shiftY * size.h, size.w, size.h);
    } else if (camera.view) {
      camera.zoom = 1;
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  return {
    setProgress(p: number) {
      progress = clamp(p);
      update();
    },
    resize(w: number, h: number) {
      renderer.setSize(w, h, false);
      size = { w, h };
      const aspect = w / h;
      camera.aspect = aspect;
      // Portrait screens: widen the vertical FOV so the stamp (and the exploded
      // stack) keeps a comfortable horizontal margin.
      camera.fov = aspect < 1 ? Math.min(50, Math.max(34, (2 * Math.atan(0.19 / aspect) * 180) / Math.PI)) : w < 640 ? 38 : 30;
      camera.updateProjectionMatrix();
      update();
    },
    setFraming(shiftY: number, zoom: number) {
      framing = { shiftY, zoom };
    },
    labelPositions() {
      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;
      const explode = seg(progress, 0.12, 0.3) * (1 - seg(progress, 0.58, 0.66));
      return Object.entries(parts).map(([id, { obj }]) => {
        obj.getWorldPosition(tmp);
        tmp.x += 1.5;
        tmp.project(camera);
        return { id, x: ((tmp.x + 1) / 2) * w, y: ((1 - tmp.y) / 2) * h, visible: explode };
      });
    },
    dispose() {
      envTex.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
    },
  };
}
