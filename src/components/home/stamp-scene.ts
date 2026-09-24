/**
 * Three.js scene for the home-page hero: a self-inking stamp that explodes into
 * its parts on scroll, gets the customer's design on its rubber plate,
 * re-assembles and stamps an impression onto paper.
 *
 * Framework-free on purpose: it is dynamically imported only after the page is
 * interactive, and driven by a single `progress` number (0..1).
 */
import * as THREE from 'three';

export { PART_LABELS, type PartLabel } from './stamp-labels';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (p: number, a: number, b: number) => ease(clamp((p - a) / (b - a)));

function plateTexture(lines: string[], round = false) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c9ccd3';
  g.fillRect(0, 0, c.width, c.height);
  // Text on a rubber plate is mirrored.
  g.translate(c.width, 0);
  g.scale(-1, 1);
  g.fillStyle = '#23262d';
  g.strokeStyle = '#23262d';
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
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2457ff';
  g.strokeStyle = '#2457ff';
  g.lineWidth = 14;
  g.strokeRect(40, 40, c.width - 80, c.height - 80);
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
  // Ink texture: knock out some speckles.
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1400; i++) {
    g.globalAlpha = Math.random() * 0.5;
    g.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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

  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe6f2, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(5, 10, 6);
  key.castShadow = !opts.lowPower;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb0ff, 1.2);
  rim.position.set(-6, 4, -5);
  scene.add(rim);

  const navy = new THREE.MeshStandardMaterial({ color: 0x0f1b33, roughness: 0.35, metalness: 0.15 });
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xe9edf3, roughness: 0.25, metalness: 0.05, transmission: 0, clearcoat: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, roughness: 0.2, metalness: 0.95 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x2457ff, roughness: 0.4, metalness: 0.1, emissive: 0x0a1f66, emissiveIntensity: 0.25 });
  const pad = new THREE.MeshStandardMaterial({ color: 0x1b2233, roughness: 0.9 });
  const SEG = opts.lowPower ? 12 : 32;

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

  // Handle: rounded cap
  const handle = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, W - 1.1, 8, SEG), navy);
  cap.rotation.z = Math.PI / 2;
  cap.scale.set(1, 1, 0.9);
  handle.add(cap);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.5, 0.06, 0.62), blue);
  grip.position.y = 0.55;
  handle.add(grip);
  add('handle', handle, 3.35, 6.6, 0);

  // Frame: open housing (four walls)
  const frame = new THREE.Group();
  const wallH = 1.9;
  const t = 0.08;
  for (const [x, z, w, d] of [
    [0, D / 2, W, t],
    [0, -D / 2, W, t],
    [W / 2, 0, t, D],
    [-W / 2, 0, t, D],
  ]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w as number, wallH, d as number), shell);
    m.position.set(x as number, 0, z as number);
    frame.add(m);
  }
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

  // Mechanism: axle + side arms
  const mech = new THREE.Group();
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, W + 0.1, SEG), metal);
  axle.rotation.z = Math.PI / 2;
  mech.add(axle);
  for (const x of [-W / 2 + 0.2, W / 2 - 0.2]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.5), blue);
    arm.position.set(x, -0.3, 0);
    mech.add(arm);
  }
  add('mechanism', mech, 1.45, 2.45, 0);

  // Ink pad
  const inkPad = new THREE.Group();
  const tray = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.16, D - 0.25), shell);
  inkPad.add(tray);
  const foam = new THREE.Mesh(new THREE.BoxGeometry(W - 0.45, 0.06, D - 0.4), pad);
  foam.position.y = 0.09;
  inkPad.add(foam);
  add('pad', inkPad, 1.1, 1.5, 0);

  // Rubber plate with design texture (faces down)
  const plateGroup = new THREE.Group();
  const plateMount = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.12, D - 0.3), navy);
  plateGroup.add(plateMount);
  const blankTex = plateTexture(['חותמות 2 דקות', 'חותמת אישית'], false);
  const designTex = plateTexture(opts.lines, false);
  const plateFaceMat = new THREE.MeshStandardMaterial({ map: blankTex, roughness: 0.85 });
  const plateFace = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.34, D - 0.34), plateFaceMat);
  plateFace.rotation.x = Math.PI / 2; // facing down
  plateFace.position.y = -0.065;
  plateGroup.add(plateFace);
  // A second, face-up copy while exploded so the design is visible to the camera.
  const plateTopMat = new THREE.MeshStandardMaterial({ map: blankTex, roughness: 0.85, transparent: true, opacity: 0 });
  const plateTop = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.34, D - 0.34), plateTopMat);
  plateTop.rotation.x = -Math.PI / 2;
  plateTop.position.y = 0.065;
  plateGroup.add(plateTop);
  add('plate', plateGroup, 0.72, 0.55, 0);

  // Base foot
  const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.1, D + 0.2), shell);
  add('base', base, 0.55, -0.45, 0);

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
  const impMat = new THREE.MeshBasicMaterial({ map: impressionTexture(opts.lines), transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
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
    plateTopMat.map = plateFaceMat.map;

    root.position.x = -1.4 * toSpot + 3.2 * away;
    root.position.z = 0.5 * toSpot - 0.5 * away;
    root.position.y = (1 - toSpot) * 0.25 + toSpot * (0.9 * (1 - press) - 0.53 * press) + away * 1.1;
    impMat.opacity = reveal;
    paperMat.opacity = seg(p, 0.68, 0.78);
    shadowMat.opacity = 0.12 * seg(p, 0.68, 0.78);

    const cam = toSpot;
    camera.position.set(7.5 - 3.3 * cam, 5.5 + 1.2 * explode + 2.2 * cam, 9.5 - 1.8 * cam);
    camera.lookAt(-0.9 * cam, 1.3 + 1.1 * explode - 1.0 * cam, 0.3 * cam);
    if (framing.shiftY || framing.zoom !== 1) {
      camera.zoom = framing.zoom;
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
