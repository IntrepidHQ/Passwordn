// Passwordn — "Enter the Vault" scroll experience
// Pinned scroll sequence: intro copy → particle vault builds → wheel spins →
// door swings open (with true occlusion fills so the interior only shows
// through the widening doorway) → camera dollies inside → deposit-box walls
// with feature cards → dissolve. Plus: hero ring-wheel teaser and
// "deposit boxes open" doors on the #features grid.
(function () {
  "use strict";
  const section = document.getElementById("vault-xp");
  if (!section || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  if (window.ScrollToPlugin) gsap.registerPlugin(ScrollToPlugin);

  const stage    = section.querySelector(".vx-stage");
  const canvas   = section.querySelector(".vx-canvas");
  const ctx      = canvas.getContext("2d", { alpha: true });
  const overlays = {
    intro:  section.querySelector(".vx-intro"),
    unlock: section.querySelector(".vx-unlock"),
    cards:  section.querySelector(".vx-cards"),
  };

  const reduced   = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const staticReq = new URLSearchParams(location.search).get("vault"); // ?vault=view|open
  const STATIC    = reduced || staticReq === "view" || staticReq === "open";
  const isMobile  = window.innerWidth < 720;
  const DENSITY   = isMobile ? 0.62 : 1;

  // ── Colors from theme tokens ──────────────────────────────────────────────
  function themeColors() {
    const cs = getComputedStyle(document.documentElement);
    return {
      ink:   "#4A5160",                                      // lighter than text — overlaps build the depth
      navy:  (cs.getPropertyValue("--primary") || "#1E3A8A").trim(),
      green: "#059669",
      bg:    (cs.getPropertyValue("--bg") || "#F2F3F5").trim(),
    };
  }

  // ── Particle model ───────────────────────────────────────────────────────
  // Groups: 0 wallFace, 1 doorDisc, 2 wheel, 3 bolts, 4 interior, 5 handles
  const P = { x: [], y: [], z: [], sx: [], sy: [], sz: [], g: [], c: [], st: [], m: [] };
  let N = 0;
  const rand = (a, b) => a + Math.random() * (b - a);

  function add(x, y, z, g, c, m = 1) {
    const R = 46;
    P.x.push(x); P.y.push(y); P.z.push(z);
    const th = rand(0, Math.PI * 2), ph = Math.acos(rand(-1, 1));
    P.sx.push(Math.sin(ph) * Math.cos(th) * R);
    P.sy.push(Math.sin(ph) * Math.sin(th) * R * 0.7);
    P.sz.push(Math.cos(ph) * R * 0.6 - 6);
    P.g.push(g); P.c.push(c);
    P.st.push(rand(0, 0.55));
    P.m.push(m);
    N++;
  }

  function ringPoints(r, step, cb) {
    const n = Math.max(6, Math.round((2 * Math.PI * r) / step));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      cb(Math.cos(a) * r, Math.sin(a) * r, a);
    }
  }
  function linePoints(ax, ay, az, bx, by, bz, step, g, c) {
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    const n = Math.max(2, Math.round(len / step));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      add(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t, g, c);
    }
  }

  function build() {
    // 1. Door disc — convex dome: ring spacing tightens and dot size grows
    //    toward the rim, center bulges toward the viewer
    let r = 0.55;
    while (r <= 8.4) {
      const f = r / 8.4;                       // 0 center → 1 rim
      const domeZ = -0.28 * (1 - f * f);       // bulge toward camera
      const m = 0.82 + 0.42 * f;               // rim dots read bigger/closer
      ringPoints(r, (0.34 - 0.10 * f) / DENSITY, (x, y) => {
        add(x, y, domeZ + rand(-0.04, 0.04), 1, Math.random() < 0.16 ? 1 : 0, m);
      });
      r += (0.36 - 0.11 * f) / DENSITY * (DENSITY < 1 ? 1.35 : 1);
    }
    for (const rr of [8.7, 8.95, 9.2]) {
      ringPoints(rr, 0.20 / DENSITY, (x, y) => add(x, y, rand(-0.15, 0.15), 1, 1, 1.28));
    }
    // 2. Wheel — real vault mechanism: hub cap, 8 spokes passing THROUGH the
    //    rim into handle grips (ship's-wheel style), dotted rim bolts.
    //    The whole group spins as one unit.
    const WZ = -0.7;
    for (const [r, st] of [[0.35, 0.12], [0.7, 0.13], [1.05, 0.14], [1.35, 0.15]]) {
      ringPoints(r, st, (x, y) => add(x, y, WZ - 0.06, 2, 1, 1.22));
    }
    ringPoints(5.45, 0.16 / DENSITY, (x, y) => add(x, y, WZ, 2, 1, 1.12));
    ringPoints(5.75, 0.16 / DENSITY, (x, y) => add(x, y, WZ, 2, 0, 1.12));
    for (let d = 0; d < 16; d++) {
      const a = (d / 16) * Math.PI * 2 + Math.PI / 16;
      add(Math.cos(a) * 5.6, Math.sin(a) * 5.6, WZ - 0.08, 2, 2, 1.3);
    }
    for (let arm = 0; arm < 8; arm++) {
      const a = arm * (Math.PI / 4);
      const ca = Math.cos(a), sa = Math.sin(a);
      for (let t = 1.35; t <= 6.9; t += 0.15) {
        for (const off of [-0.13, 0.13]) {
          add(ca * t - sa * off, sa * t + ca * off, WZ, 2, 1, 1.08);
        }
      }
      // handle grip: dense capsule beyond the rim + accent tip
      for (let t = 6.9; t <= 7.7; t += 0.11) {
        for (const off of [-0.24, -0.08, 0.08, 0.24]) {
          add(ca * t - sa * off, sa * t + ca * off, WZ - 0.04, 2, 0, 1.42);
        }
      }
      add(ca * 7.85, sa * 7.85, WZ - 0.05, 2, 2, 1.5);
    }
    // 6. Collar — the ringed mounting plate the wheel spins inside (door-fixed)
    ringPoints(6.15, 0.15 / DENSITY, (x, y) => add(x, y, -0.32, 6, 0, 1.05));
    ringPoints(6.4,  0.15 / DENSITY, (x, y) => add(x, y, -0.32, 6, 1, 1.05));
    for (let d = 0; d < 16; d++) {
      const a = (d / 16) * Math.PI * 2;
      add(Math.cos(a) * 6.28, Math.sin(a) * 6.28, -0.36, 6, 2, 1.18);
    }
    // 7. Bolt-work — four diagonal rods running from the collar to the door
    //    edge, ending in bolt blocks that protrude into the frame while
    //    locked and RETRACT inward as the wheel spins (the unlock).
    for (let arm = 0; arm < 4; arm++) {
      const a = Math.PI / 4 + arm * (Math.PI / 2);
      const ca = Math.cos(a), sa = Math.sin(a);
      for (let t = 6.5; t <= 8.3; t += 0.14) {
        for (const off of [-0.1, 0.1]) {
          add(ca * t - sa * off, sa * t + ca * off, -0.45, 7, 1, 1.05);
        }
      }
      for (let t = 8.3; t <= 9.4; t += 0.12) {
        for (const off of [-0.34, -0.17, 0, 0.17, 0.34]) {
          add(ca * t - sa * off, sa * t + ca * off, -0.4, 7, 0, 1.3);
        }
      }
    }
    // 3. Door rivets — dotted ring around the door face
    for (let b = 0; b < 18; b++) {
      const a = (b / 18) * Math.PI * 2 + Math.PI / 18;
      const bx = Math.cos(a) * 8.15, by = Math.sin(a) * 8.15;
      ringPoints(0.2, 0.12, (x, y) => add(bx + x, by + y, -0.12, 3, 2, 1.15));
    }
    // 4. Front wall — full-bleed around the door
    const stepW = 0.60 / DENSITY;
    for (let x = -27; x <= 27; x += stepW) {
      for (let y = -15; y <= 15; y += stepW) {
        const d = Math.hypot(x, y);
        if (d < 9.9) continue;
        if (Math.random() < 0.45) continue;
        add(x + rand(-0.1, 0.1), y + rand(-0.1, 0.1), 0.55, 0, 0, 0.8);
      }
    }
    // 5. Interior — deposit-box walls + explicit room edges so the three walls read as one room
    const boxOutline = (cb, w, h) => {
      const s = 0.30 / DENSITY;
      for (let t = 0; t <= w; t += s) { cb(t, 0); cb(t, h); }
      for (let t = s; t < h; t += s)  { cb(0, t); cb(w, t); }
    };
    const wallBoxes = (side) => {
      const X = side * 10.5;
      for (let zi = 0; zi < 7; zi++) {
        for (let yi = 0; yi < 5; yi++) {
          const z0 = 2.2 + zi * 3.4;
          const y0 = -6.1 + yi * 2.55;
          boxOutline((u, v) => add(X, y0 + v, z0 + u, 4, 0), 2.9, 2.1);
          add(X, y0 + 1.05, z0 + 2.35, 5, 2, 1.35);
          add(X, y0 + 1.05, z0 + 2.62, 5, 2, 1.35);
          ringPoints(0.16, 0.09, (a, b) => add(X, y0 + 1.05 + b, z0 + 2.48 + a, 5, 2));
        }
      }
    };
    wallBoxes(-1); wallBoxes(1);
    // back wall boxes
    for (let xi = 0; xi < 6; xi++) {
      for (let yi = 0; yi < 5; yi++) {
        const x0 = -9.2 + xi * 3.15;
        const y0 = -6.1 + yi * 2.55;
        boxOutline((u, v) => add(x0 + u, y0 + v, 26.5, 4, 0), 2.75, 2.1);
        add(x0 + 2.28, y0 + 1.05, 26.45, 5, 2);
      }
    }
    // room edges: wall↔wall corners and wall↔floor/ceiling junctions (crisp double lines)
    for (const s of [-1, 1]) {
      // vertical corners where side walls meet the back wall
      linePoints(s * 10.5, -6.55, 26.5, s * 10.5, 6.55, 26.5, 0.2, 4, 1);
      linePoints(s * 10.44, -6.55, 26.44, s * 10.44, 6.55, 26.44, 0.2, 4, 0);
      // floor + ceiling junctions along the side walls
      for (const y of [-6.55, 6.55]) {
        linePoints(s * 10.5, y, 1.5, s * 10.5, y, 26.5, 0.2, 4, 1);
        linePoints(s * 10.42, y * 0.985, 1.5, s * 10.42, y * 0.985, 26.5, 0.2, 4, 0);
      }
    }
    // floor + ceiling junctions along the back wall
    for (const y of [-6.55, 6.55]) {
      linePoints(-10.5, y, 26.5, 10.5, y, 26.5, 0.2, 4, 1);
    }
    // sparse floor/ceiling rails for depth
    for (let z = 1.5; z <= 26; z += 0.55) {
      for (const x of [-5.1, 0, 5.1]) {
        add(x + rand(-0.04, 0.04), 6.55, z, 4, 0);
        add(x + rand(-0.04, 0.04), -6.55, z, 4, 1);
      }
    }
  }
  build();

  const TX = Float32Array.from(P.x), TY = Float32Array.from(P.y), TZ = Float32Array.from(P.z);
  const SX = Float32Array.from(P.sx), SY = Float32Array.from(P.sy), SZ = Float32Array.from(P.sz);
  const G = Uint8Array.from(P.g), C = Uint8Array.from(P.c), ST = Float32Array.from(P.st);
  const SM = Float32Array.from(P.m);

  // ── Canvas sizing ────────────────────────────────────────────────────────
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
  }
  resize();
  window.addEventListener("resize", () => { resize(); draw(prog); });

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const phase = (p, a, b) => clamp01((p - a) / (b - a));
  const easeIO = (t) => t * t * (3 - 2 * t);
  const easeOut = (t) => 1 - (1 - t) * (1 - t);

  let colors = themeColors();
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-theme-toggle]")) setTimeout(() => { colors = themeColors(); draw(prog); }, 30);
  });

  // ── Render ───────────────────────────────────────────────────────────────
  let prog = 0;

  function draw(p) {
    if (stage.clientWidth !== W || stage.clientHeight !== H) resize();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const buildP   = easeIO(phase(p, 0.10, 0.30));
    const spinP    = easeIO(phase(p, 0.33, 0.47));
    const openP    = easeIO(phase(p, 0.50, 0.64));
    const enterP   = phase(p, 0.52, 0.74);
    const fadeP    = phase(p, 0.90, 0.995);
    const scatterP = easeIO(phase(p, 0.90, 1.0));

    if (buildP <= 0 || fadeP >= 1) return;

    let camZ = -34 + 8 * easeIO(phase(p, 0.06, 0.33));
    camZ += 4 * easeIO(phase(p, 0.33, 0.5));
    camZ += 26 * easeIO(enterP);          // → +4, just inside the door
    camZ += 2.5 * phase(p, 0.74, 0.9);    // slow dwell drift

    const FOV = Math.min(W, H) * 0.92;
    const cx = W / 2, cy = H / 2;
    const doorAngle = openP * 1.9;
    const hingeX = -9.3;
    const cosA = Math.cos(doorAngle), sinA = Math.sin(doorAngle);
    const wheelA = spinP * Math.PI * 2.2;
    const cw = Math.cos(wheelA), sw = Math.sin(wheelA);
    const globalAlpha = 1 - easeIO(fadeP);
    const LUT = [colors.ink, colors.navy, colors.green];
    const showInterior = openP > 0.02;

    // world-space transform for particle i (build lerp + group motion)
    function world(i) {
      const stg = ST[i];
      const bp = clamp01((buildP - stg * 0.5) / (1 - stg * 0.5));
      if (bp <= 0) return null;
      const e = easeOut(bp);
      let x = SX[i] + (TX[i] - SX[i]) * e;
      let y = SY[i] + (TY[i] - SY[i]) * e;
      let z = SZ[i] + (TZ[i] - SZ[i]) * e;
      const g = G[i];
      if (g === 2 && spinP > 0) {
        const rx = x, ry = y;
        x = rx * cw - ry * sw;
        y = rx * sw + ry * cw;
      }
      if (g === 7 && spinP > 0) {
        // bolt-work slides toward the hub as the wheel turns — the unlock
        const len = Math.hypot(TX[i], TY[i]) || 1;
        const pull = 1.05 * spinP;
        x -= (TX[i] / len) * pull;
        y -= (TY[i] / len) * pull;
      }
      if ((g === 1 || g === 2 || g === 3 || g === 6 || g === 7) && openP > 0) {
        const dx = x - hingeX;
        x = hingeX + dx * cosA;
        z = z - dx * sinA;
      }
      if (scatterP > 0) {
        x += (SX[i] * 0.3) * scatterP;
        y += (SY[i] * 0.3) * scatterP;
        z += 4 * scatterP;
      }
      return { x, y, z, e };
    }

    function plot(i, w) {
      const dz = w.z - camZ;
      if (dz < 0.5) return;
      const s = FOV / dz;
      const px = cx + w.x * s;
      const py = cy + w.y * s;
      if (px < -8 || px > W + 8 || py < -8 || py > H + 8) return;
      const g = G[i];
      let size = s * 0.048 * SM[i] * (g === 5 ? 1.25 : 1);
      if (size > 3.4) size = 3.4;
      if (size < 0.45) size = 0.45;
      // lighter, uniform alpha — overlaps stack up to model the form;
      // bigger (closer) dots are slightly more opaque for depth
      let a = (1.45 - dz * 0.024) * globalAlpha * (0.22 + 0.78 * w.e) * (0.68 + 0.13 * Math.min(size, 2));
      if (a <= 0.02) return;
      if (a > 0.92) a = 0.92;
      ctx.globalAlpha = a;
      ctx.fillStyle = LUT[C[i]];
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    }

    // helper: project an arbitrary world point (returns null when behind camera)
    function proj(x, y, z) {
      const dz = z - camZ;
      if (dz < 0.35) return null;
      const s = FOV / dz;
      return [cx + x * s, cy + y * s];
    }

    // ── PASS 1: interior (drawn first so exterior fills occlude it) ────────
    if (showInterior) {
      for (let i = 0; i < N; i++) {
        if (G[i] < 4) continue;
        const w = world(i);
        if (w) plot(i, w);
      }
    }

    // ── Occlusion fills: solid front wall (with doorway hole) + solid door ─
    if (showInterior && globalAlpha > 0.01) {
      ctx.globalAlpha = globalAlpha;
      ctx.fillStyle = colors.bg;

      // Front wall slab — only while the camera is still outside it
      if (camZ < 0.2) {
        const corners = [proj(-27, -15, 0.55), proj(27, -15, 0.55), proj(27, 15, 0.55), proj(-27, 15, 0.55)];
        if (corners.every(Boolean)) {
          ctx.beginPath();
          ctx.moveTo(corners[0][0], corners[0][1]);
          for (let k = 1; k < 4; k++) ctx.lineTo(corners[k][0], corners[k][1]);
          ctx.closePath();
          // doorway hole (counter-wound via evenodd)
          let first = true;
          for (let k = 0; k <= 28; k++) {
            const a = (k / 28) * Math.PI * 2;
            const pt = proj(Math.cos(a) * 9.55, Math.sin(a) * 9.55, 0.55);
            if (!pt) { first = true; continue; }
            if (first) { ctx.moveTo(pt[0], pt[1]); first = false; }
            else ctx.lineTo(pt[0], pt[1]);
          }
          ctx.fill("evenodd");
        }
      }

      // Door slab — blocks the doorway while swinging until it clears the opening
      if (doorAngle < 1.72) {
        ctx.beginPath();
        let first = true;
        for (let k = 0; k <= 30; k++) {
          const a = (k / 30) * Math.PI * 2;
          let x = Math.cos(a) * 9.3, z = 0.12;
          const dx = x - hingeX;
          x = hingeX + dx * cosA;
          z = z - dx * sinA;
          const pt = proj(x, Math.sin(a) * 9.3, z);
          if (!pt) { first = true; continue; }
          if (first) { ctx.moveTo(pt[0], pt[1]); first = false; }
          else ctx.lineTo(pt[0], pt[1]);
        }
        if (!first) { ctx.closePath(); ctx.fill(); }
      }
    }

    // ── PASS 2: exterior (wall face, door, wheel, bolts) ───────────────────
    for (let i = 0; i < N; i++) {
      if (G[i] >= 4) continue;
      const w = world(i);
      if (w) plot(i, w);
    }
    ctx.globalAlpha = 1;
  }

  // ── HTML overlay timeline ────────────────────────────────────────────────
  function overlayUpdate(p) {
    const io = (el, from, to, feather = 0.045) => {
      if (!el) return;
      const inn  = phase(p, from - feather, from);
      const outt = 1 - phase(p, to, to + feather);
      const a = Math.min(inn, outt);
      el.style.opacity = a.toFixed(3);
      el.style.visibility = a <= 0 ? "hidden" : "visible";
      el.style.transform = `translateY(${(1 - inn) * 18 - (1 - outt) * 12}px)`;
    };
    io(overlays.intro, 0.015, 0.115);
    io(overlays.unlock, 0.34, 0.475);
    if (overlays.cards) {
      const cardEls = overlays.cards.querySelectorAll(".vx-card");
      const base = 0.645, span = 0.02;
      const out = 1 - phase(p, 0.875, 0.93);
      cardEls.forEach((el, i) => {
        const inn = easeIO(phase(p, base + i * span, base + i * span + 0.045));
        const a = Math.min(inn, out);
        el.style.opacity = a.toFixed(3);
        el.style.visibility = a <= 0 ? "hidden" : "visible";
      });
      overlays.cards.style.pointerEvents = p > 0.64 && p < 0.9 ? "auto" : "none";
    }
  }

  // Tap/click a card to flatten its 3D warp for reading; tap again to restore
  section.querySelectorAll(".vx-card").forEach((card) => {
    card.addEventListener("click", () => {
      const was = card.classList.contains("vx-flat");
      section.querySelectorAll(".vx-card.vx-flat").forEach((c) => c.classList.remove("vx-flat"));
      if (!was) card.classList.add("vx-flat");
    });
  });

  // ── Static mode (?vault=view, reduced motion) ────────────────────────────
  if (STATIC) {
    section.classList.add("vx-static");
    const p = staticReq === "open" ? 0.56 : 0.78;
    resize();
    prog = p;
    draw(p);
    overlayUpdate(p);
    if (overlays.intro) { overlays.intro.style.opacity = 0; overlays.intro.style.visibility = "hidden"; }
    return;
  }

  // ── ScrollTrigger ────────────────────────────────────────────────────────
  const st = ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "+=350%",
    pin: stage,
    scrub: 0.55,
    anticipatePin: 1,
    onUpdate(self) {
      prog = self.progress;
      draw(prog);
      overlayUpdate(prog);
    },
  });

  draw(0);
  overlayUpdate(0);

  const enterBtn = section.querySelector("[data-enter-vault]");
  if (enterBtn) {
    enterBtn.addEventListener("click", () => {
      const target = st.start + (st.end - st.start) * 0.74;
      if (window.ScrollToPlugin) {
        gsap.to(window, { scrollTo: target, duration: 2.6, ease: "power2.inOut" });
      } else {
        window.scrollTo({ top: target, behavior: "smooth" });
      }
    });
  }
})();

// ── Hero ring-wheel: particle vault wheel locked to the dashed hero rings ──
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const hstage = document.querySelector(".hero-stage");
  const ring1  = document.querySelector(".hero-stage .ring-1");
  if (!hstage || !ring1) return;

  const cv = document.createElement("canvas");
  cv.className = "hero-wheel";
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
  ring1.after(cv); // above the rings, below the chips + browser card
  const c2 = cv.getContext("2d");

  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = hstage.clientWidth; H = hstage.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
  }
  resize();
  window.addEventListener("resize", () => { resize(); render(); });

  function cs(varName, fb) {
    return (getComputedStyle(document.documentElement).getPropertyValue(varName) || fb).trim();
  }

  function dotRing(cx, cy, r, count, size, color, alpha, theta) {
    c2.fillStyle = color;
    c2.globalAlpha = alpha;
    for (let i = 0; i < count; i++) {
      const a = theta + (i / count) * Math.PI * 2;
      c2.fillRect(cx + Math.cos(a) * r - size / 2, cy + Math.sin(a) * r - size / 2, size, size);
    }
  }

  let theta = 0;
  function render() {
    c2.setTransform(DPR, 0, 0, DPR, 0, 0);
    c2.clearRect(0, 0, W, H);
    // center + radius from the actual ring-1 element so alignment is exact
    const sr = hstage.getBoundingClientRect();
    const rr = ring1.getBoundingClientRect();
    const cx = (rr.left - sr.left + rr.width / 2) / (sr.width / W);
    const cy = (rr.top - sr.top + rr.height / 2) / (sr.height / H);
    const R = (rr.width / 2) / (sr.width / W);

    const navy = cs("--primary", "#1E3A8A");
    const ink  = "#4A5160";
    // bolts sitting exactly ON ring-1's dashed stroke
    dotRing(cx, cy, R, 12, 3.2, navy, 0.5, theta * 0.5);
    // outer wheel ring
    dotRing(cx, cy, R * 0.78, 90, 1.8, navy, 0.4, theta);
    dotRing(cx, cy, R * 0.74, 80, 1.5, ink, 0.3, theta);
    // hub
    dotRing(cx, cy, R * 0.14, 26, 1.8, navy, 0.45, -theta);
    // 4 spokes
    c2.globalAlpha = 0.38;
    c2.fillStyle = navy;
    for (let arm = 0; arm < 4; arm++) {
      const a = theta + arm * Math.PI / 2;
      for (let t = R * 0.17; t <= R * 0.72; t += 5) {
        for (const off of [-2, 2]) {
          const px = cx + Math.cos(a) * t - Math.sin(a) * off;
          const py = cy + Math.sin(a) * t + Math.cos(a) * off;
          c2.fillRect(px - 0.9, py - 0.9, 1.8, 1.8);
        }
      }
    }
    c2.globalAlpha = 1;
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const r = hstage.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return; // off-screen
      theta = window.scrollY * 0.0028;
      render();
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  render();
})();

// ── "Everything in its place": #features cards as opening deposit boxes ────
(function () {
  "use strict";
  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const grid = document.querySelector("#features .features");
  if (!grid) return;

  const doors = [];
  grid.querySelectorAll(".feature").forEach((card) => {
    card.classList.add("fbox");
    const door = document.createElement("div");
    door.className = "fbox-door";
    door.setAttribute("aria-hidden", "true");
    door.innerHTML = '<span class="fbox-lock"></span><span class="fbox-handle"></span>';
    card.appendChild(door);
    doors.push(door);
  });
  if (!doors.length) return;

  gsap.to(doors, {
    rotationY: -104,
    ease: "none",
    stagger: 0.16,
    scrollTrigger: {
      trigger: grid,          // the card grid itself, so doors open while cards are on screen
      start: "top 88%",
      end: "center 42%",
      scrub: 0.6,
    },
  });
})();
