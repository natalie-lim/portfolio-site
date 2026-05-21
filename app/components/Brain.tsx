"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface RegionInfo {
  id: string;
  name: string;
  description: string;
  color: number;
}

const REGIONS: RegionInfo[] = [
  { id: "frontal",    name: "Frontal Lobe",       description: "Decision-making, personality, planning, and voluntary movement.", color: 0x00e5ff },
  { id: "parietal",   name: "Parietal Lobe",       description: "Sensory integration, spatial awareness, and body coordination.",   color: 0xdd44ff },
  { id: "temporal_l", name: "Left Temporal Lobe",  description: "Language comprehension, memory formation, and auditory processing.", color: 0x4488ff },
  { id: "temporal_r", name: "Right Temporal Lobe", description: "Facial recognition, music processing, and emotional memory.",       color: 0x4488ff },
  { id: "occipital",  name: "Occipital Lobe",      description: "Visual processing, color perception, and pattern recognition.",    color: 0x44ff88 },
  { id: "cerebellum", name: "Cerebellum",          description: "Balance, fine motor coordination, and movement timing.",           color: 0xff8844 },
  { id: "brainstem",  name: "Brain Stem",          description: "Breathing, heart rate, sleep cycles, and vital reflexes.",         color: 0xff44aa },
];

const REGION_COLORS: Record<string, THREE.Color> = Object.fromEntries(
  REGIONS.map(r => [r.id, new THREE.Color(r.color)])
);

// Map a normalised sphere position → brain region id
function regionAt(nx: number, ny: number, nz: number): string {
  // Brainstem: bottom centre stalk
  if (ny < -0.62 && nx * nx + nz * nz < 0.18) return "brainstem";
  // Cerebellum: back-bottom mass
  if (ny < -0.18 && nz < -0.38) return "cerebellum";
  // Occipital: rear pole
  if (nz < -0.52 && ny > -0.22) return "occipital";
  // Temporal: side lobes (lateral)
  if (Math.abs(nx) > 0.52 && ny < 0.22) return nx < 0 ? "temporal_l" : "temporal_r";
  // Parietal: superior centre (behind central sulcus ~nz=0.1)
  if (ny > 0.28 && nz < 0.12) return "parietal";
  // Frontal: everything else (anterior)
  return "frontal";
}

// Build a displaced brain geometry with per-vertex region colours
function createBrainGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 72, 48);
  const src = geo.attributes.position as THREE.BufferAttribute;
  const clr = new Float32Array(src.count * 3);

  for (let i = 0; i < src.count; i++) {
    const x = src.getX(i), y = src.getY(i), z = src.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / len, ny = y / len, nz = z / len;

    // ---- Gyri folds (abs-sine ridge pattern) ----
    const g1 = Math.abs(Math.sin(nx * Math.PI * 7.0 + ny * 1.7 + 0.3)) * 0.13;
    const g2 = Math.abs(Math.sin(ny * Math.PI * 5.5 + nz * 2.3 + 1.1)) * 0.10;
    const g3 = Math.abs(Math.cos(nz * Math.PI * 4.2 + nx * 2.1 + 0.8)) * 0.07;

    // ---- Major sulci (grooves) ----
    // Longitudinal fissure – deep midline groove between hemispheres
    const longi = Math.exp(-nx * nx * 70) * Math.max(0, ny) * -0.18;
    // Sylvian fissure – lateral sulcus separating temporal from frontal/parietal
    const sylvDist = ny - (-0.04 + nz * 0.32);
    const sylvian  = Math.exp(-sylvDist * sylvDist * 42) * -0.13;
    // Central sulcus – divides frontal from parietal
    const centDist = nz - (0.08 - ny * 0.22);
    const central  = Math.exp(-centDist * centDist * 52) * Math.max(0, ny) * -0.10;
    // Parieto-occipital sulcus – separates parietal from occipital
    const parOccDist = nz - (-0.45 + ny * 0.15);
    const parOcc  = Math.exp(-parOccDist * parOccDist * 40) * Math.max(0, ny) * -0.08;

    // Fine cortical texture
    const detail = Math.sin(nx * 22 + ny * 16) * Math.cos(nz * 19 + ny * 10) * 0.014;

    const d = g1 + g2 + g3 + longi + sylvian + central + parOcc + detail;

    // Temporal-lobe lateral bulge
    const tBulge = Math.exp(-ny * ny * 3.5) * Math.exp(-Math.pow(Math.abs(nx) - 0.55, 2) * 14) * 0.14;

    src.setXYZ(i,
      x * (1.07 + tBulge) * (1 + d * 0.86),
      y * 0.81               * (1 + d * 0.62),
      z * 1.10               * (1 + d),
    );

    // Per-vertex colour from anatomical region
    const c = REGION_COLORS[regionAt(nx, ny, nz)];
    clr[i * 3] = c.r; clr[i * 3 + 1] = c.g; clr[i * 3 + 2] = c.b;
  }

  geo.setAttribute("color", new THREE.Float32BufferAttribute(clr, 3));
  geo.computeVertexNormals();
  return geo;
}

// WireframeGeometry strips custom attributes, so build edges manually to keep colours
function buildColoredWireframe(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = geo.attributes.color    as THREE.BufferAttribute;
  const idx = geo.index!;

  const seen    = new Set<string>();
  const outPos: number[] = [];
  const outCol: number[] = [];

  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
    for (const [p, q] of [[a, b], [b, c], [c, a]] as [number, number][]) {
      const key = p < q ? `${p},${q}` : `${q},${p}`;
      if (seen.has(key)) continue;
      seen.add(key);
      outPos.push(
        pos.getX(p), pos.getY(p), pos.getZ(p),
        pos.getX(q), pos.getY(q), pos.getZ(q),
      );
      outCol.push(
        col.getX(p), col.getY(p), col.getZ(p),
        col.getX(q), col.getY(q), col.getZ(q),
      );
    }
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(outPos, 3));
  out.setAttribute("color",    new THREE.Float32BufferAttribute(outCol, 3));
  return out;
}

// Click-target sphere parts (invisible, for raycasting)
type Part = [number, number, number, number, number, number];
const PARTS: Record<string, Part[]> = {
  frontal:    [[-0.28,0.22,0.44,0.56,0.52,0.60],[0.28,0.22,0.44,0.56,0.52,0.60],[0.00,0.40,0.28,0.28,0.28,0.28],[-0.12,0.02,0.56,0.32,0.30,0.30],[0.12,0.02,0.56,0.32,0.30,0.30]],
  parietal:   [[-0.30,0.62,-0.04,0.44,0.40,0.44],[0.30,0.62,-0.04,0.44,0.40,0.44],[0.00,0.66,0.12,0.22,0.22,0.22]],
  temporal_l: [[-0.65,0.05,0.15,0.36,0.32,0.50],[-0.62,-0.12,-0.10,0.30,0.28,0.38],[-0.58,0.18,0.30,0.28,0.25,0.28]],
  temporal_r: [[0.65,0.05,0.15,0.36,0.32,0.50],[0.62,-0.12,-0.10,0.30,0.28,0.38],[0.58,0.18,0.30,0.28,0.25,0.28]],
  occipital:  [[-0.22,0.28,-0.58,0.40,0.38,0.38],[0.22,0.28,-0.58,0.40,0.38,0.38],[0.00,0.32,-0.52,0.20,0.20,0.20]],
  cerebellum: [[0.00,-0.28,-0.46,0.54,0.30,0.44],[-0.25,-0.32,-0.40,0.28,0.22,0.28],[0.25,-0.32,-0.40,0.28,0.22,0.28]],
  brainstem:  [[0.00,-0.55,0.08,0.18,0.38,0.20],[0.00,-0.40,0.12,0.20,0.22,0.22]],
};

export default function Brain() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<RegionInfo | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || 480, h = mount.clientHeight || 500;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0.15, 3.2);
    camera.lookAt(0, 0.1, 0);

    // Transparent canvas so the page bg shows through
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NoToneMapping;
    mount.appendChild(renderer.domElement);

    const brainGroup = new THREE.Group();
    scene.add(brainGroup);

    // ---- Brain geometry ----
    const brainGeo = createBrainGeometry();
    const wireGeo  = buildColoredWireframe(brainGeo);

    // Depth-only solid mesh: hides back-face wires without drawing any colour.
    // Renders before the transparent wireframe (opaque objects go first by default).
    brainGroup.add(new THREE.Mesh(brainGeo, new THREE.MeshBasicMaterial({
      colorWrite: false, depthWrite: true, side: THREE.FrontSide,
    })));

    // Primary wireframe — additive blending gives per-line glow without a bloom pass
    const wireMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    brainGroup.add(new THREE.LineSegments(wireGeo, wireMat));

    // Halo layer — same geometry scaled slightly larger, very dim, mimics bloom radius
    const haloMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.15,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const haloLines = new THREE.LineSegments(wireGeo, haloMat);
    haloLines.scale.setScalar(1.04);
    brainGroup.add(haloLines);

    // ---- Click targets (invisible) + selection overlays ----
    const clickGeo = new THREE.SphereGeometry(1, 12, 8);
    const allClick: THREE.Mesh[] = [];
    const overlays = new Map<string, THREE.Mesh[]>();

    for (const region of REGIONS) {
      const ovList: THREE.Mesh[] = [];
      for (const [x, y, z, sx, sy, sz] of (PARTS[region.id] ?? [])) {
        const ct = new THREE.Mesh(clickGeo,
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
        ct.position.set(x, y, z); ct.scale.set(sx, sy, sz);
        ct.userData.regionId = region.id;
        brainGroup.add(ct); allClick.push(ct);

        const ov = new THREE.Mesh(clickGeo, new THREE.MeshBasicMaterial({
          color: region.color, transparent: true, opacity: 0.22, depthWrite: false,
        }));
        ov.position.set(x, y, z); ov.scale.set(sx * 1.06, sy * 1.06, sz * 1.06);
        ov.visible = false;
        brainGroup.add(ov); ovList.push(ov);
      }
      overlays.set(region.id, ovList);
    }

    const showOverlay = (id: string | null) => {
      for (const [rid, meshes] of overlays)
        meshes.forEach(m => { m.visible = rid === id; });
    };

    // ---- Interaction ----
    const raycaster = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    let activeId: string | null = null;
    let drag = false, prevX = 0;

    const onMove = (e: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ptr.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
      ptr.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
      raycaster.setFromCamera(ptr, camera);
      renderer.domElement.style.cursor =
        raycaster.intersectObjects(allClick).length ? "pointer" : "default";
      if (drag) { brainGroup.rotation.y += (e.clientX - prevX) * 0.012; prevX = e.clientX; }
    };

    const onClick = (e: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ptr.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
      ptr.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
      raycaster.setFromCamera(ptr, camera);
      const hits = raycaster.intersectObjects(allClick);
      if (hits.length) {
        const id = hits[0].object.userData.regionId as string;
        activeId = id === activeId ? null : id;
        showOverlay(activeId);
        setSelected(activeId ? (REGIONS.find(r => r.id === activeId) ?? null) : null);
      } else { activeId = null; showOverlay(null); setSelected(null); }
    };

    const onUp = () => { drag = false; };
    renderer.domElement.addEventListener("mousemove", onMove);
    renderer.domElement.addEventListener("click",     onClick);
    renderer.domElement.addEventListener("mousedown", e => { drag = true; prevX = e.clientX; });
    window.addEventListener("mouseup", onUp);

    const ro = new ResizeObserver(() => {
      const nw = mount.clientWidth, nh = mount.clientHeight;
      camera.aspect = nw / nh; camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(mount);

    // ---- Animate ----
    let animId: number, t = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.016;
      brainGroup.rotation.y += 0.003;
      brainGroup.position.y  = Math.sin(t * 0.7) * 0.03;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener("mousemove", onMove);
      renderer.domElement.removeEventListener("click",     onClick);
      window.removeEventListener("mouseup", onUp);
      ro.disconnect();
      brainGeo.dispose(); wireGeo.dispose(); wireMat.dispose(); haloMat.dispose(); clickGeo.dispose();
      ((brainGroup.children[0] as THREE.Mesh).material as THREE.Material).dispose();
      for (const meshes of overlays.values())
        meshes.forEach(m => (m.material as THREE.Material).dispose());
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full" style={{ height: "500px" }}>
      <div ref={mountRef} className="w-full h-full" />

      {selected && (
        <div
          className="absolute top-4 right-4 max-w-[220px] rounded-xl border border-white/10 bg-black/70 p-4 backdrop-blur-md"
          style={{ boxShadow: `0 0 24px #${selected.color.toString(16).padStart(6, "0")}55` }}
        >
          <p className="mb-1 text-xs font-bold uppercase tracking-widest"
             style={{ color: `#${selected.color.toString(16).padStart(6, "0")}` }}>
            {selected.name}
          </p>
          <p className="text-xs leading-relaxed text-zinc-400">{selected.description}</p>
        </div>
      )}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-zinc-600 pointer-events-none select-none">
        drag to rotate · click a region
      </div>
    </div>
  );
}
