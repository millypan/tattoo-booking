"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// 模型面向鏡頭（+z）。本人的左邊在畫面右側（+x）。
const BASE = 0x8f8377; // 骨白偏暖的亮灰
const JOINT = 0x7a6f64; // 關節稍深，做出結構感
const PICK = 0xc7472e;

const Q = Math.PI / 2;

function quadAngles(side) {
  // 回傳四個象限殼的 thetaStart（象限中心 = thetaStart + 45°）
  // θ=0 朝 +z（前）；+x 是本人左側
  if (side === "左") {
    return { 前側: -Q / 2, 外側: Q / 2, 後側: (3 * Q) / 2, 內側: (5 * Q) / 2 };
  }
  return { 前側: -Q / 2, 內側: Q / 2, 後側: (3 * Q) / 2, 外側: (5 * Q) / 2 };
}

function buildBody(group) {
  const meshes = [];
  const add = (label, geom, x, y, z, color = BASE) => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.userData.label = label;
    group.add(mesh);
    meshes.push(mesh);
    return mesh;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const sph = (r) => new THREE.SphereGeometry(r, 22, 18);

  // 四肢：一段肢體 = 四片象限殼（前側／後側／內側／外側）
  const limb = (name, side, r, h, x, y) => {
    const angles = quadAngles(side);
    for (const [part, theta] of Object.entries(angles)) {
      const geom = new THREE.CylinderGeometry(r, r * 0.9, h, 12, 1, false, theta, Q);
      add(`${side}${name}${part}`, geom, x, y, 0);
    }
  };

  // 頭頸
  add("頭部", sph(0.3), 0, 3.28, 0);
  add("頸部", new THREE.CylinderGeometry(0.1, 0.12, 0.22, 16), 0, 2.97, 0);

  // 軀幹（前後半）＋肋側
  add("胸口", box(0.74, 0.52, 0.19), 0, 2.62, 0.1);
  add("上背", box(0.74, 0.52, 0.19), 0, 2.62, -0.1);
  add("腹部", box(0.68, 0.64, 0.18), 0, 2.05, 0.1);
  add("下背腰", box(0.68, 0.36, 0.18), 0, 2.19, -0.1);
  add("臀部", box(0.74, 0.4, 0.22), 0, 1.79, -0.08);
  add("左肋側", box(0.1, 0.72, 0.34), 0.4, 2.34, 0);
  add("右肋側", box(0.1, 0.72, 0.34), -0.4, 2.34, 0);

  // 肩・肘・腕（關節）
  add("左肩", sph(0.15), 0.51, 2.84, 0, JOINT);
  add("右肩", sph(0.15), -0.51, 2.84, 0, JOINT);
  add("左手肘", sph(0.1), 0.66, 2.23, 0, JOINT);
  add("右手肘", sph(0.1), -0.66, 2.23, 0, JOINT);
  add("左手腕手背", sph(0.11), 0.7, 1.6, 0, JOINT);
  add("右手腕手背", sph(0.11), -0.7, 1.6, 0, JOINT);

  // 手臂（內外前後）
  limb("上臂", "左", 0.11, 0.46, 0.64, 2.55);
  limb("上臂", "右", 0.11, 0.46, -0.64, 2.55);
  limb("前臂", "左", 0.1, 0.46, 0.68, 1.94);
  limb("前臂", "右", 0.1, 0.46, -0.68, 1.94);

  // 膝（關節）
  add("左膝蓋", sph(0.13), 0.22, 0.97, 0.02, JOINT);
  add("右膝蓋", sph(0.13), -0.22, 0.97, 0.02, JOINT);

  // 腿（內外前後）
  limb("大腿", "左", 0.16, 0.68, 0.22, 1.34);
  limb("大腿", "右", 0.16, 0.68, -0.22, 1.34);
  limb("小腿", "左", 0.12, 0.6, 0.21, 0.58);
  limb("小腿", "右", 0.12, 0.6, -0.21, 0.58);

  // 腳
  add("左腳踝腳背", box(0.22, 0.16, 0.38), 0.21, 0.12, 0.05);
  add("右腳踝腳背", box(0.22, 0.16, 0.38), -0.21, 0.12, 0.05);

  return meshes;
}

export default function Body3D({ value, onChange }) {
  const holder = useRef(null);
  const picked = useRef(null);
  const [note, setNote] = useState("");
  const [label, setLabel] = useState(value?.region || null);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0.6, 2.0, 5.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // 打亮：半球光＋主燈＋硃砂輪廓光
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a322c, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(2.5, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd8cbb8, 0.5);
    fill.position.set(-3, 1.5, 2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xc7472e, 0.45);
    rim.position.set(0, 2, -5);
    scene.add(rim);

    const body = new THREE.Group();
    const meshes = buildBody(body);
    body.position.y = -1.7;
    scene.add(body);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.05, 0);
    controls.enablePan = false;
    controls.minDistance = 2.6;
    controls.maxDistance = 8;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.78;
    controls.update();

    function paint() {
      for (const m of meshes) {
        const on = m.userData.label === picked.current;
        m.material.color.setHex(on ? PICK : m.userData.base ?? BASE);
        m.material.emissive = new THREE.Color(on ? 0x521c10 : 0x000000);
      }
    }
    for (const m of meshes) m.userData.base = m.material.color.getHex();
    paint();

    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    let down = null;

    function onDown(e) {
      down = [e.clientX, e.clientY];
    }
    function onUp(e) {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]);
      down = null;
      if (moved > 6) return; // 拖曳旋轉，不是點選
      const rect = renderer.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      const hits = ray.intersectObjects(body.children, false);
      if (hits.length) {
        const l = hits[0].object.userData.label;
        picked.current = picked.current === l ? null : l;
        setLabel(picked.current);
        paint();
      }
    }
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    let raf;
    function loop() {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    }

    function resize() {
      const w = el.clientWidth;
      const h = Math.min(460, Math.max(340, w * 0.95));
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    loop();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onChange(label ? { region: label, note } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, note]);

  return (
    <div>
      <div
        ref={holder}
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 35%, #2b2622 0%, #1c1917 75%)",
          border: "1px solid #332d29",
          borderRadius: 2,
          touchAction: "none",
        }}
      />
      <p className="hint" style={{ marginTop: 8 }}>
        拖曳旋轉、點一下部位選取——手臂和腿可以選到前側／後側／內側／外側
        （左右以<b>你自己身體</b>的左右為準）
        {label ? (
          <>
            ・已選：<b style={{ color: "#EAE3D6" }}>{label}</b>
          </>
        ) : null}
      </p>
      <input
        type="text"
        placeholder="補充說明（選填）：更精確的位置描述…"
        value={note}
        maxLength={60}
        onChange={(e) => setNote(e.target.value)}
        aria-label="部位補充說明"
      />
    </div>
  );
}
