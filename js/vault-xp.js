// Passwordn — "Enter the Vault" scroll experience
// Apple-style pinned scroll sequence: intro copy → particle vault builds →
// wheel spins to unlock → door swings open → camera dollies inside →
// deposit-box walls + feature cards → dissolve into the next section.
// Canvas 2D, ~11k particles projected with simple perspective; GSAP ScrollTrigger scrub.
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
      ink:   (cs.getPropertyValue("--text") || "#0B0C0E").trim(),
      navy:  (cs.getPropertyValue("--primary") || "#1E3A8A").trim(),
      green: "#059669",
    };
  }

  // ── Particle model ───────────────────────────────────────────────────────
  // Each particle: target (x,y,z), scatter start (sx,sy,sz), group, color idx, stagger.
  // Groups: 0 wallFace, 1 doorDisc, 2 wheel, 3 bolts, 4 interior, 5 handleGlow
  const P = { x: [], y: [], z: [], sx: [], sy: [], sz: [], g: [], c: [], st: [] };
  let N = 0;
  const rand = (a, b) => a + Math.random() * (b - a);

  function add(x, y, z, g, c) {
    const R = 46;
    P.x.push(x); P.y.push(y); P.z.push(z);
    // scatter: random shell around origin, biased toward viewer
    const th = rand(0, Math.PI * 2), ph = Math.acos(rand(-1, 1));
    P.sx.push(Math.sin(ph) * Math.cos(th) * R);
    P.sy.push(Math.sin(ph) * Math.sin(th) * R * 0.7);
    P.sz.push(Math.cos(ph) * R * 0.6 - 6);
    P.g.push(g); P.c.push(c);
    P.st.push(rand(0, 0.55)); // build stagger
    N++;
  }

  function ringPoints(r, step, cb) {
    const n = Math.max(6, Math.round((2 * Math.PI * r) / step));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      cb(Math.cos(a) * r, Math.sin(a) * r, a);
    }
  }

  function build() {
    // 1. Door disc — dense concentric rings (the vault door face), z=0
    for (let r = 0.55; r <= 8.4; r += 0.30 / DENSITY * (DENSITY < 1 ? 1.35 : 1)) {
      ringPoints(r, 0.30 / DENSITY, (x, y) => {
        add(x, y, rand(-0.05, 0.05), 1, Math.random() < 0.16 ? 1 : 0);
      });
    }
    // door rim — thicker double ring
    for (const r of [8.7, 8.95, 9.2]) {
      ringPoints(r, 0.22 / DENSITY, (x, y) => add(x, y, rand(-0.2, 0.2), 1, 1));
    }
    // 2. Wheel — hub, 4 spokes, outer wheel ring; z proud of the door
    ringPoints(1.15, 0.20, (x, y) => add(x, y, -0.65, 2, 1));
    ringPoints(5.6, 0.20 / DENSITY, (x, y) => add(x, y, -0.65, 2, 1));
    ringPoints(5.85, 0.22 / DENSITY, (x, y) => add(x, y, -0.65, 2, 0));
    for (let arm = 0; arm < 4; arm++) {
      const a = arm * (Math.PI / 2);
      for (let t = 1.2; t <= 5.55; t += 0.17) {
        for (const off of [-0.14, 0.14]) {
          add(Math.cos(a) * t - Math.sin(a) * off, Math.sin(a) * t + Math.cos(a) * off, -0.7, 2, 1);
        }
      }
      // spoke knobs
      add(Math.cos(a) * 6.35, Math.sin(a) * 6.35, -0.75, 2, 2);
    }
    // 3. Bolts around the frame
    for (let b = 0; b < 12; b++) {
      const a = (b / 12) * Math.PI * 2 + Math.PI / 12;
      const bx = Math.cos(a) * 7.5, by = Math.sin(a) * 7.5;
      ringPoints(0.28, 0.14, (x, y) => add(bx + x, by + y, -0.15, 3, 2));
    }
    // 4. Wall face around the door (the vault's front wall) z≈0.5
    const stepW = 0.62 / DENSITY;
    for (let x = -19; x <= 19; x += stepW) {
      for (let y = -11; y <= 11; y += stepW) {
        const d = Math.hypot(x, y);
        if (d < 9.9) continue;
        if (Math.random() < 0.42) continue; // sparse texture
        add(x + rand(-0.1, 0.1), y + rand(-0.1, 0.1), 0.55, 0, 0);
      }
    }
    // 5. Interior — deposit-box walls (left, right, back) + floor/ceiling rails
    const boxOutline = (cb, w, h) => {
      const s = 0.30 / DENSITY;
      for (let t = 0; t <= w; t += s) { cb(t, 0); cb(t, h); }
      for (let t = s; t < h; t += s)  { cb(0, t); cb(w, t); }
    };
    const wallBoxes = (side) => {
      // side: -1 left (x=-10.5), +1 right (x=+10.5); boxes tile along z (depth) & y
      const X = side * 10.5;
      for (let zi = 0; zi < 7; zi++) {
        for (let yi = 0; yi < 5; yi++) {
          const z0 = 2.2 + zi * 3.4;
          const y0 = -6.1 + yi * 2.55;
          boxOutline((u, v) => add(X, y0 + v, z0 + u, 4, 0), 2.9, 2.1);
          // handle + keyhole (green accents = locked tight)
          add(X, y0 + 1.05, z0 + 2.35, 5, 2);
          add(X, y0 + 1.05, z0 + 2.62, 5, 2);
          ringPoints(0.16, 0.09, (a, b) => add(X, y0 + 1.05 + b, z0 + 2.48 + a, 5, 2));
        }
      }
    };
    wallBoxes(-1); wallBoxes(1);
    // back wall
    for (let xi = 0; xi < 6; xi++) {
      for (let yi = 0; yi < 5; yi++) {
        const x0 = -9.2 + xi * 3.15;
        const y0 = -6.1 + yi * 2.55;
        boxOutline((u, v) => add(x0 + u, y0 + v, 26.5, 4, 0), 2.75, 2.1);
        add(x0 + 2.28, y0 + 1.05, 26.45, 5, 2);
      }
    }
    // floor + ceiling rails
    for (let z = 1.5; z <= 26; z += 0.55) {
      for (const x of [-10.2, -5.1, 0, 5.1, 10.2]) {
        add(x + rand(-0.04, 0.04), 6.55, z, 4, 0);
        add(x + rand(-0.04, 0.04), -6.55, z, 4, 1);
      }
    }
  }
  build();

  // typed views for speed
  const TX = Float32Array.from(P.x), TY = Float32Array.from(P.y), TZ = Float32Array.from(P.z);
  const SX = Float32Array.from(P.sx), SY = Float32Array.from(P.sy), SZ = Float32Array.from(P.sz);
  const G = Uint8Array.from(P.g), C = Uint8Array.from(P.c), ST = Float32Array.from(P.st);

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

  // ── Phase helpers ────────────────────────────────────────────────────────
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const phase = (p, a, b) => clamp01((p - a) / (b - a));
  const easeIO = (t) => t * t * (3 - 2 * t);
  const easeOut = (t) => 1 - (1 - t) * (1 - t);

  // ── Render ───────────────────────────────────────────────────────────────
  let colors = themeColors();
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-theme-toggle]")) setTimeout(() => { colors = themeColors(); draw(prog); }, 30);
  });

  let prog = 0;
  function draw(p) {
    // self-heal: pin-spacer/layout shifts can change stage size without a window resize
    if (stage.clientWidth !== W || stage.clientHeight !== H) resize();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const buildP  = easeIO(phase(p, 0.10, 0.30));   // scatter → formed
    const spinP   = easeIO(phase(p, 0.33, 0.47));   // wheel rotation
    const openP   = easeIO(phase(p, 0.50, 0.64));   // door swings on hinge
    const enterP  = phase(p, 0.52, 0.74);           // camera dolly inside
    const fadeP   = phase(p, 0.90, 0.995);          // global dissolve
    const scatterP = easeIO(phase(p, 0.90, 1.0));   // particles drift on dissolve

    if (buildP <= 0 || fadeP >= 1) return;

    // camera: pull in during build, hold, then dolly through the door
    let camZ = -34 + 8 * easeIO(phase(p, 0.06, 0.33));      // -34 → -26
    camZ += 4 * easeIO(phase(p, 0.33, 0.5));                 // → -22
    camZ += 26 * easeIO(enterP);                             // → +4 (just inside the door)
    camZ += 2.5 * phase(p, 0.74, 0.9);                       // slow drift deeper while dwelling
    const FOV = Math.min(W, H) * 0.92;
    const cx = W / 2, cy = H / 2;
    const doorAngle = openP * 1.9;  // ~109° swing
    const hingeX = -9.3;
    const cosA = Math.cos(doorAngle), sinA = Math.sin(doorAngle);
    const wheelA = spinP * Math.PI * 2.2; // ~2 full turns + latch
    const cw = Math.cos(wheelA), sw = Math.sin(wheelA);
    const globalAlpha = 1 - easeIO(fadeP);

    // color LUT
    const LUT = [colors.ink, colors.navy, colors.green];

    ctx.globalAlpha = 1;
    for (let i = 0; i < N; i++) {
      const g = G[i];
      const stg = ST[i];
      // per-particle build progress with stagger
      const bp = clamp01((buildP - stg * 0.5) / (1 - stg * 0.5));
      if (bp <= 0) continue;
      const e = easeOut(bp);

      let x = SX[i] + (TX[i] - SX[i]) * e;
      let y = SY[i] + (TY[i] - SY[i]) * e;
      let z = SZ[i] + (TZ[i] - SZ[i]) * e;

      // wheel spin (rotate around door center in XY)
      if (g === 2 && spinP > 0) {
        const rx = x, ry = y;
        x = rx * cw - ry * sw;
        y = rx * sw + ry * cw;
      }
      // door open: disc + wheel + bolts swing around vertical hinge at hingeX
      if ((g === 1 || g === 2 || g === 3) && openP > 0) {
        const dx = x - hingeX;
        x = hingeX + dx * cosA;
        z = z - dx * sinA; // swings toward viewer
      }
      // dissolve scatter
      if (scatterP > 0) {
        x += (SX[i] * 0.3) * scatterP;
        y += (SY[i] * 0.3) * scatterP;
        z += 4 * scatterP;
      }

      const dz = z - camZ;
      if (dz < 0.5) continue;
      const s = FOV / dz;
      const px = cx + x * s;
      const py = cy + y * s;
      if (px < -8 || px > W + 8 || py < -8 || py > H + 8) continue;

      // interior stays hidden until the door actually cracks open —
      // otherwise the boxes X-ray through the closed door
      if ((g === 4 || g === 5) && openP <= 0.02) continue;

      let size = s * 0.055;
      if (g === 2) size = s * 0.075;
      if (g === 5) size = s * 0.085;
      if (size > 3.2) size = 3.2;
      if (size < 0.5) size = 0.5;

      // depth fog + build fade-in
      let a = (1.55 - dz * 0.028) * globalAlpha * (0.25 + 0.75 * e);
      if (a <= 0.02) continue;
      if (a > 1) a = 1;

      ctx.globalAlpha = a;
      ctx.fillStyle = LUT[C[i]];
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
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
    // cards: staggered in during interior phase
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

  // ── Static mode (?vault=view, reduced motion) ────────────────────────────
  if (STATIC) {
    section.classList.add("vx-static");
    const p = staticReq === "open" ? 0.52 : 0.78; // open = door mid-swing, view = interior
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

  // initial paint
  draw(0);
  overlayUpdate(0);

  // "Enter the Vault" — kick-start: smooth-scroll through unlock into the interior
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
