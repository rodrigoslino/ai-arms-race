"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WIDTH = 960;
const HEIGHT = 600;
const MAX_HEALTH = 100;

type Screen = "title" | "playing" | "gameover" | "victory";
type EnemyKind =
  | "EMPLOYEE"
  | "JUNIOR"
  | "ARTIST"
  | "SUPPORT"
  | "REGULATION"
  | "ETHICS"
  | "UNION"
  | "REALITY";
type PickupKind =
  | "LAYOFFS"
  | "SILICON"
  | "RARE EARTHS"
  | "VC FUNDING"
  | "GPU"
  | "RAM"
  | "WATER";

interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

interface Bullet extends Body {
  hostile?: boolean;
  damage: number;
}

interface Enemy extends Body {
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  phase: number;
  fireIn: number;
  formation?: boolean;
  variant: number;
}

interface Pickup extends Body {
  kind: PickupKind;
  spin: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface GameWorld {
  player: Body;
  bullets: Bullet[];
  enemyBullets: Bullet[];
  enemies: Enemy[];
  pickups: Pickup[];
  particles: Particle[];
  texts: FloatText[];
  stars: Array<{ x: number; y: number; speed: number; size: number }>;
  score: number;
  health: number;
  employees: number;
  meetings: number;
  elapsed: number;
  spawnIn: number;
  pickupIn: number;
  shotIn: number;
  rapidFire: number;
  shield: number;
  weaponLevel: number;
  bossSpawned: boolean;
  bossDefeated: boolean;
  layoffWaveSpawned: boolean;
  layoffWaveTotal: number;
  shake: number;
  banner: string;
  bannerTime: number;
}

const enemyStats: Record<
  EnemyKind,
  { w: number; h: number; hp: number; speed: number; value: number; color: string }
> = {
  EMPLOYEE: { w: 34, h: 44, hp: 1, speed: 68, value: 100, color: "#f7cf9a" },
  JUNIOR: { w: 36, h: 44, hp: 1, speed: 82, value: 140, color: "#8de8ff" },
  ARTIST: { w: 38, h: 48, hp: 2, speed: 58, value: 220, color: "#ff8ac7" },
  SUPPORT: { w: 38, h: 44, hp: 2, speed: 72, value: 180, color: "#ffe26e" },
  REGULATION: { w: 52, h: 36, hp: 4, speed: 56, value: 320, color: "#ff5364" },
  ETHICS: { w: 50, h: 36, hp: 3, speed: 74, value: 280, color: "#a996ff" },
  UNION: { w: 50, h: 38, hp: 5, speed: 48, value: 420, color: "#ff8b4d" },
  REALITY: { w: 260, h: 92, hp: 180, speed: 0, value: 10000, color: "#ff435f" },
};

const pickupColors: Record<PickupKind, string> = {
  LAYOFFS: "#ff5364",
  SILICON: "#67f5c1",
  "RARE EARTHS": "#ffcf54",
  "VC FUNDING": "#8cff66",
  GPU: "#a996ff",
  RAM: "#67f5c1",
  WATER: "#59c9ff",
};

const satiricalLines = [
  "+1.2% STOCK",
  "SYNERGY!",
  "EFFICIENCY!",
  "AUTOMATED!",
  "HEADCOUNT ↓",
  "MARGIN ↑",
];

const bossLines = [
  "SHOW ME THE REVENUE",
  "WHERE IS THE MOAT?",
  "WHAT IS THE BUSINESS MODEL?",
  "YOUR BURN RATE IS SHOWING",
];

function makeWorld(): GameWorld {
  return {
    player: { x: WIDTH / 2 - 36, y: HEIGHT - 105, w: 72, h: 48, vx: 0, vy: 0 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    pickups: [],
    particles: [],
    texts: [],
    stars: Array.from({ length: 90 }, () => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      speed: 25 + Math.random() * 90,
      size: Math.random() > 0.82 ? 2 : 1,
    })),
    score: 0,
    health: 72,
    employees: 0,
    meetings: 0,
    elapsed: 0,
    spawnIn: 0.45,
    pickupIn: 3.5,
    shotIn: 0,
    rapidFire: 0,
    shield: 0,
    weaponLevel: 1,
    bossSpawned: false,
    bossDefeated: false,
    layoffWaveSpawned: false,
    layoffWaveTotal: 0,
    shake: 0,
    banner: "Q3 GROWTH INITIATIVE",
    bannerTime: 2.4,
  };
}

function overlap(a: Body, b: Body) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = "#fff",
  align: CanvasTextAlign = "left",
) {
  ctx.save();
  ctx.font = `900 ${size}px "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#05060c";
  ctx.fillText(text, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawPlane(ctx: CanvasRenderingContext2D, p: Body, shield: number) {
  ctx.save();
  ctx.translate(Math.round(p.x), Math.round(p.y));
  if (shield > 0) {
    ctx.strokeStyle = shield % 0.3 > 0.14 ? "#67f5c1" : "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(-9, -8, p.w + 18, p.h + 16);
  }
  // Exhaust and twin engines.
  ctx.fillStyle = "#ff435f";
  ctx.fillRect(13, 38, 10, 5);
  ctx.fillRect(49, 38, 10, 5);
  ctx.fillStyle = "#ffcf54";
  ctx.fillRect(15, 43, 6, 4);
  ctx.fillRect(51, 43, 6, 4);
  ctx.fillStyle = "#ff8b4d";
  ctx.fillRect(17, 47, 2, 3);
  ctx.fillRect(53, 47, 2, 3);

  // Wings, tail, and shaded fuselage.
  ctx.fillStyle = "#151927";
  ctx.fillRect(0, 25, 72, 12);
  ctx.fillRect(8, 20, 56, 7);
  ctx.fillStyle = "#343b50";
  ctx.fillRect(5, 28, 62, 5);
  ctx.fillStyle = "#ff435f";
  ctx.fillRect(2, 33, 18, 4);
  ctx.fillRect(52, 33, 18, 4);
  ctx.fillRect(31, 0, 10, 44);
  ctx.fillStyle = "#f3f6e8";
  ctx.fillRect(27, 9, 18, 31);
  ctx.fillRect(24, 18, 24, 17);
  ctx.fillStyle = "#b8c2c8";
  ctx.fillRect(29, 5, 14, 9);
  ctx.fillRect(27, 35, 18, 5);
  ctx.fillStyle = "#8de8ff";
  ctx.fillRect(30, 10, 12, 8);
  ctx.fillStyle = "#d8fbff";
  ctx.fillRect(31, 11, 4, 3);
  ctx.fillStyle = "#ffcf54";
  ctx.fillRect(5, 29, 62, 3);
  ctx.fillRect(34, 1, 4, 5);
  ctx.fillStyle = "#05060c";
  ctx.fillRect(18, 34, 8, 4);
  ctx.fillRect(46, 34, 8, 4);
  ctx.fillStyle = "#fff";
  ctx.font = '900 7px "Courier New", monospace';
  ctx.textAlign = "center";
  ctx.fillText("BIG TECH", 36, 32);
  ctx.restore();
}

function drawWorker(ctx: CanvasRenderingContext2D, e: Enemy) {
  const skinTones = ["#f1c7a2", "#c9875d", "#8f573d", "#f4d7bd", "#b86f4c", "#6f4232"];
  const hairColors = ["#291d1a", "#f1c45b", "#5a3528", "#141722", "#a64d2e", "#dad5cb"];
  const shirtColors = ["#4f8cff", "#f06482", "#56b88b", "#d39b45", "#8e73dc", "#e7e9ed"];
  const pantsColors = ["#27314a", "#312c3f", "#1d4251", "#443124", "#222632", "#30405a"];
  const variant = e.variant % skinTones.length;
  const skin = skinTones[variant];
  const hair = hairColors[variant];
  const roleColor =
    e.kind === "ARTIST"
      ? "#ff8ac7"
      : e.kind === "JUNIOR"
        ? "#479cff"
        : e.kind === "SUPPORT"
          ? "#ffe26e"
          : shirtColors[variant];
  const pants = pantsColors[variant];
  ctx.save();
  ctx.translate(Math.round(e.x), Math.round(e.y));
  const bob = Math.round(Math.sin(e.phase) * 2);

  // A stepped, rounded head with distinct hair and facial features.
  ctx.fillStyle = skin;
  ctx.fillRect(11, bob + 1, 14, 2);
  ctx.fillRect(8, bob + 3, 20, 10);
  ctx.fillRect(11, bob + 13, 14, 3);
  ctx.fillStyle = hair;
  ctx.fillRect(9, bob + 1, 18, 4);
  ctx.fillRect(8, bob + 4, variant % 2 === 0 ? 5 : 3, 5);
  if (variant === 3) ctx.fillRect(25, bob + 3, 4, 8);
  if (variant === 4) {
    ctx.fillRect(6, bob + 4, 3, 10);
    ctx.fillRect(27, bob + 4, 3, 10);
  }
  ctx.fillStyle = "#171a26";
  ctx.fillRect(12, bob + 7, 2, 2);
  ctx.fillRect(22, bob + 7, 2, 2);
  ctx.fillStyle = "#a9544f";
  ctx.fillRect(16, bob + 12, 5, 1);

  // Neck, shirt, collar, and human-proportioned arms.
  ctx.fillStyle = skin;
  ctx.fillRect(15, bob + 15, 6, 4);
  ctx.fillStyle = roleColor;
  ctx.fillRect(8, bob + 18, 20, 16);
  ctx.fillRect(5, bob + 20, 4, 13);
  ctx.fillRect(28, bob + 20, 4, 13);
  ctx.fillStyle = skin;
  ctx.fillRect(4, bob + 31, 5, 4);
  ctx.fillRect(28, bob + 31, 5, 4);
  ctx.fillStyle = "#f3f6e8";
  ctx.fillRect(14, bob + 18, 8, 3);
  ctx.fillRect(17, bob + 21, 2, 7);
  if (e.kind === "SUPPORT") {
    ctx.fillStyle = "#171a26";
    ctx.fillRect(7, bob + 4, 2, 7);
    ctx.fillRect(27, bob + 4, 2, 7);
    ctx.fillRect(27, bob + 10, 5, 2);
  }

  // Separated trousers and shoes remove the old robot silhouette.
  ctx.fillStyle = pants;
  ctx.fillRect(9, bob + 34, 8, 8);
  ctx.fillRect(20, bob + 34, 8, 8);
  ctx.fillStyle = "#05060c";
  ctx.fillRect(7, bob + 41, 10, 3);
  ctx.fillRect(20, bob + 41, 10, 3);
  ctx.restore();
}

function drawConcept(ctx: CanvasRenderingContext2D, e: Enemy) {
  const color = enemyStats[e.kind].color;
  ctx.save();
  ctx.translate(Math.round(e.x), Math.round(e.y));
  ctx.fillStyle = color;
  ctx.fillRect(0, 6, e.w, e.h - 12);
  ctx.fillStyle = "#05060c";
  ctx.fillRect(4, 10, e.w - 8, e.h - 20);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 0, e.w - 16, e.h);
  ctx.fillStyle = color;
  if (e.kind === "REGULATION") {
    ctx.fillRect(13, 11, 17, 4);
    ctx.fillRect(25, 14, 5, 12);
    ctx.fillRect(29, 24, 12, 4);
  } else if (e.kind === "ETHICS") {
    ctx.fillRect(24, 9, 3, 18);
    ctx.fillRect(15, 12, 21, 3);
    ctx.fillRect(14, 15, 3, 7);
    ctx.fillRect(34, 15, 3, 7);
    ctx.fillRect(10, 22, 11, 3);
    ctx.fillRect(30, 22, 11, 3);
  } else {
    ctx.fillRect(13, 18, 24, 8);
    ctx.fillRect(16, 12, 6, 8);
    ctx.fillRect(22, 10, 6, 10);
    ctx.fillRect(28, 13, 6, 7);
  }
  ctx.restore();
}

function drawBoss(ctx: CanvasRenderingContext2D, e: Enemy) {
  ctx.save();
  ctx.translate(Math.round(e.x), Math.round(e.y));
  ctx.fillStyle = "#ff435f";
  ctx.fillRect(0, 18, e.w, 58);
  ctx.fillStyle = "#171a26";
  ctx.fillRect(10, 8, e.w - 20, 76);
  ctx.fillStyle = "#f3f6e8";
  ctx.fillRect(22, 18, e.w - 44, 48);
  ctx.fillStyle = "#05060c";
  ctx.fillRect(32, 28, e.w - 64, 28);
  pixelText(ctx, "REALITY", e.w / 2, 43, 25, "#ff435f", "center");
  ctx.fillStyle = "#ffcf54";
  for (let i = 0; i < 7; i += 1) ctx.fillRect(14 + i * 38, 78, 18, 8);
  ctx.restore();
}

function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup) {
  const color = pickupColors[p.kind];
  ctx.save();
  ctx.translate(Math.round(p.x + p.w / 2), Math.round(p.y + p.h / 2));
  const scale = 1 + Math.sin(p.spin) * 0.08;
  ctx.scale(scale, scale);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = color;
  ctx.fillRect(-25, -25, 50, 50);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(-22, -22, 44, 44);
  ctx.fillStyle = color;
  ctx.fillRect(-25, -25, 8, 3);
  ctx.fillRect(17, -25, 8, 3);
  ctx.fillRect(-25, 22, 8, 3);
  ctx.fillRect(17, 22, 8, 3);

  if (p.kind === "SILICON") {
    ctx.fillStyle = "#173f37";
    ctx.fillRect(-14, -14, 28, 28);
    ctx.fillStyle = color;
    for (let i = -12; i <= 8; i += 5) {
      ctx.fillRect(i, -19, 3, 5);
      ctx.fillRect(i, 14, 3, 5);
      ctx.fillRect(-19, i, 5, 3);
      ctx.fillRect(14, i, 5, 3);
    }
    ctx.strokeStyle = "#a8ffe3";
    ctx.strokeRect(-9, -9, 18, 18);
    pixelText(ctx, "Si", 0, 1, 12, "#a8ffe3", "center");
  } else if (p.kind === "GPU") {
    ctx.fillStyle = "#302550";
    ctx.fillRect(-20, -13, 38, 26);
    ctx.fillStyle = "#7160c9";
    ctx.fillRect(-17, -10, 32, 20);
    ctx.fillStyle = "#111521";
    ctx.fillRect(-12, -7, 13, 14);
    ctx.fillRect(3, -7, 10, 14);
    ctx.fillStyle = "#a996ff";
    ctx.fillRect(-9, -4, 7, 8);
    ctx.fillRect(5, -4, 6, 8);
    ctx.fillStyle = "#ffcf54";
    for (let x = -14; x < 13; x += 5) ctx.fillRect(x, 13, 3, 5);
    ctx.fillStyle = "#d9d3ff";
    ctx.fillRect(18, -9, 3, 18);
  } else if (p.kind === "RARE EARTHS") {
    ctx.fillStyle = "#6c3f2c";
    ctx.fillRect(-18, 8, 36, 10);
    ctx.fillRect(-13, 2, 27, 8);
    ctx.fillRect(-7, -4, 15, 7);
    ctx.fillStyle = "#b86f42";
    ctx.fillRect(-10, 3, 7, 5);
    ctx.fillRect(5, 9, 9, 5);
    ctx.fillStyle = "#ffcf54";
    ctx.fillRect(-3, -15, 6, 14);
    ctx.fillRect(-6, -10, 12, 5);
    ctx.fillStyle = "#fff0a8";
    ctx.fillRect(-1, -13, 2, 6);
  } else if (p.kind === "RAM") {
    ctx.fillStyle = "#174735";
    ctx.fillRect(-20, -11, 40, 22);
    ctx.fillStyle = "#59d9a5";
    ctx.fillRect(-18, -9, 36, 17);
    ctx.fillStyle = "#111521";
    for (let x = -15; x < 14; x += 9) ctx.fillRect(x, -5, 7, 9);
    ctx.fillStyle = "#ffcf54";
    for (let x = -17; x < 18; x += 5) ctx.fillRect(x, 9, 3, 5);
    ctx.fillStyle = "#d4fff0";
    ctx.fillRect(-18, -9, 5, 2);
  } else if (p.kind === "WATER") {
    ctx.fillStyle = "#59c9ff";
    ctx.fillRect(-4, -17, 8, 5);
    ctx.fillRect(-8, -12, 16, 6);
    ctx.fillRect(-12, -6, 24, 13);
    ctx.fillRect(-8, 7, 16, 6);
    ctx.fillRect(-4, 13, 8, 4);
    ctx.fillStyle = "#d9f7ff";
    ctx.fillRect(-6, -6, 5, 7);
    ctx.fillStyle = "#2283bd";
    ctx.fillRect(4, 4, 5, 5);
  } else if (p.kind === "VC FUNDING") {
    ctx.fillStyle = "#164428";
    ctx.fillRect(-18, -12, 36, 24);
    ctx.fillStyle = "#8cff66";
    ctx.fillRect(-15, -9, 30, 18);
    ctx.fillStyle = "#164428";
    ctx.fillRect(-12, -6, 24, 12);
    pixelText(ctx, "$", 0, 1, 17, "#8cff66", "center");
  } else {
    ctx.fillStyle = "#6e1e2c";
    ctx.fillRect(-17, -13, 34, 27);
    ctx.fillStyle = "#ff5364";
    ctx.fillRect(-14, -10, 28, 20);
    ctx.fillStyle = "#f3f6e8";
    ctx.fillRect(-10, -6, 20, 13);
    ctx.fillStyle = "#ff5364";
    ctx.fillRect(-9, -5, 18, 2);
    ctx.fillRect(-2, -3, 4, 7);
  }
  ctx.restore();
  pixelText(ctx, p.kind, p.x + p.w / 2, p.y + p.h + 13, 9, color, "center");
}

function drawScene(ctx: CanvasRenderingContext2D, w: GameWorld) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#05060c";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#13172b");
  sky.addColorStop(0.62, "#0a0c18");
  sky.addColorStop(1, "#16111f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#8de8ff";
  for (const star of w.stars) {
    ctx.globalAlpha = 0.45 + star.speed / 180;
    ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size * 2);
  }
  ctx.globalAlpha = 1;

  ctx.save();
  if (w.shake > 0) ctx.translate((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);

  for (const p of w.pickups) drawPickup(ctx, p);
  for (const e of w.enemies) {
    if (e.kind === "REALITY") drawBoss(ctx, e);
    else if (["EMPLOYEE", "JUNIOR", "ARTIST", "SUPPORT"].includes(e.kind)) drawWorker(ctx, e);
    else drawConcept(ctx, e);
    if (e.formation) {
      ctx.fillStyle = "#2b3046";
      ctx.fillRect(Math.round(e.x + 7), Math.round(e.y - 6), e.w - 14, 3);
      ctx.fillStyle = e.hp === e.maxHp ? "#67f5c1" : "#ffcf54";
      ctx.fillRect(
        Math.round(e.x + 7),
        Math.round(e.y - 6),
        (e.w - 14) * (e.hp / e.maxHp),
        3,
      );
    } else if (e.kind !== "REALITY") {
      pixelText(ctx, e.kind, e.x + e.w / 2, e.y - 10, 9, enemyStats[e.kind].color, "center");
    }
  }

  ctx.fillStyle = "#ffcf54";
  for (const b of w.bullets) {
    ctx.fillRect(Math.round(b.x), Math.round(b.y), b.w, b.h);
    ctx.fillStyle = "#fff";
    ctx.fillRect(Math.round(b.x + 2), Math.round(b.y), Math.max(2, b.w - 4), 4);
    ctx.fillStyle = "#ffcf54";
  }
  ctx.fillStyle = "#ff435f";
  for (const b of w.enemyBullets) {
    ctx.fillRect(Math.round(b.x), Math.round(b.y), b.w, b.h);
    ctx.fillStyle = "#ff8b4d";
    ctx.fillRect(Math.round(b.x + 2), Math.round(b.y + 2), Math.max(2, b.w - 4), Math.max(2, b.h - 4));
    ctx.fillStyle = "#ff435f";
  }

  drawPlane(ctx, w.player, w.shield);

  for (const p of w.particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;

  for (const t of w.texts) {
    ctx.globalAlpha = clamp(t.life * 1.8, 0, 1);
    pixelText(ctx, t.text, t.x, t.y, 13, t.color, "center");
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.fillStyle = "rgba(5,6,12,.92)";
  ctx.fillRect(0, 0, WIDTH, 66);
  ctx.fillStyle = "#2b3046";
  ctx.fillRect(0, 64, WIDTH, 2);
  pixelText(ctx, "MARKET CAP", 22, 18, 11, "#83909d");
  pixelText(ctx, `$${(w.score * 0.12 + 42).toFixed(1)}B`, 22, 42, 21, "#8cff66");
  pixelText(ctx, "SHAREHOLDER CONFIDENCE", 220, 18, 11, "#83909d");
  ctx.fillStyle = "#2b3046";
  ctx.fillRect(220, 36, 260, 14);
  ctx.fillStyle = w.health > 35 ? "#67f5c1" : "#ff435f";
  ctx.fillRect(222, 38, 256 * (w.health / MAX_HEALTH), 10);
  pixelText(ctx, `${Math.ceil(w.health)}%`, 490, 43, 13, "#f3f6e8");
  pixelText(ctx, "EMPLOYEES", 580, 18, 11, "#83909d");
  pixelText(ctx, `-${w.employees}`, 580, 42, 21, "#ff8ac7");
  pixelText(ctx, "INFERENCE COST", 755, 18, 11, "#83909d");
  pixelText(ctx, `$${Math.max(0.02, 0.14 - w.weaponLevel * 0.02).toFixed(2)}/SHOT`, 755, 42, 18, "#ffcf54");

  const boss = w.enemies.find((enemy) => enemy.kind === "REALITY");
  if (boss) {
    ctx.fillStyle = "#05060c";
    ctx.fillRect(220, 76, 520, 36);
    pixelText(ctx, "REALITY", 235, 88, 12, "#ff435f");
    ctx.fillStyle = "#3a1720";
    ctx.fillRect(320, 82, 398, 14);
    ctx.fillStyle = "#ff435f";
    ctx.fillRect(322, 84, 394 * (boss.hp / boss.maxHp), 10);
  }

  const formationRemaining = w.enemies.filter((enemy) => enemy.formation).length;
  if (formationRemaining > 0) {
    const processed = w.layoffWaveTotal - formationRemaining;
    ctx.fillStyle = "rgba(5,6,12,.94)";
    ctx.fillRect(304, 76, 352, 36);
    ctx.strokeStyle = "#ffcf54";
    ctx.lineWidth = 2;
    ctx.strokeRect(304, 76, 352, 36);
    pixelText(ctx, "MASS LAYOFF", 320, 88, 11, "#ff435f");
    pixelText(
      ctx,
      `${processed.toString().padStart(2, "0")} / ${w.layoffWaveTotal}`,
      638,
      94,
      16,
      "#ffcf54",
      "right",
    );
  }

  if (w.bannerTime > 0) {
    ctx.fillStyle = "rgba(5,6,12,.88)";
    ctx.fillRect(190, 252, 580, 72);
    ctx.strokeStyle = "#ffcf54";
    ctx.lineWidth = 3;
    ctx.strokeRect(195, 257, 570, 62);
    pixelText(ctx, w.banner, WIDTH / 2, 288, w.banner.length > 28 ? 19 : 26, "#ffcf54", "center");
  }
}

function burst(w: GameWorld, x: number, y: number, color: string, amount = 14) {
  for (let i = 0; i < amount; i += 1) {
    const life = 0.3 + Math.random() * 0.7;
    w.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 190,
      vy: (Math.random() - 0.5) * 190,
      life,
      maxLife: life,
      size: 2 + Math.floor(Math.random() * 5),
      color,
    });
  }
}

function spawnEnemy(w: GameWorld) {
  const roll = Math.random();
  const pool: EnemyKind[] =
    w.elapsed < 12
      ? ["EMPLOYEE", "JUNIOR", "SUPPORT"]
      : roll > 0.72
        ? ["REGULATION", "ETHICS", "UNION"]
        : ["EMPLOYEE", "JUNIOR", "ARTIST", "SUPPORT"];
  const kind = pool[Math.floor(Math.random() * pool.length)];
  const stats = enemyStats[kind];
  w.enemies.push({
    x: 30 + Math.random() * (WIDTH - stats.w - 60),
    y: -stats.h - 10,
    w: stats.w,
    h: stats.h,
    vx: (Math.random() - 0.5) * 45,
    vy: stats.speed + Math.min(58, w.elapsed * 1.1),
    kind,
    hp: stats.hp,
    maxHp: stats.hp,
    phase: Math.random() * Math.PI * 2,
    fireIn: 0.8 + Math.random() * 2.8,
    variant: Math.floor(Math.random() * 6),
  });
}

function spawnLayoffFormation(w: GameWorld) {
  const columns = 10;
  const rows = 4;
  const gapX = 8;
  const gapY = 8;
  const stats = enemyStats.EMPLOYEE;
  const formationWidth = columns * stats.w + (columns - 1) * gapX;
  const startX = (WIDTH - formationWidth) / 2;
  const startY = 126;
  const sharedPhase = Math.random() * Math.PI * 2;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      w.enemies.push({
        x: startX + column * (stats.w + gapX),
        y: startY + row * (stats.h + gapY),
        w: stats.w,
        h: stats.h,
        vx: 0,
        vy: 9,
        kind: "EMPLOYEE",
        hp: 2,
        maxHp: 2,
        phase: sharedPhase,
        fireIn: 99,
        formation: true,
        variant: (row * columns + column) % 6,
      });
    }
  }

  w.layoffWaveSpawned = true;
  w.layoffWaveTotal = columns * rows;
  w.banner = "ALL-HANDS RESTRUCTURING";
  w.bannerTime = 2.2;
  w.shake = 0.8;
}

function spawnPickup(w: GameWorld) {
  const kinds: PickupKind[] = [
    "LAYOFFS",
    "SILICON",
    "RARE EARTHS",
    "VC FUNDING",
    "GPU",
    "RAM",
    "WATER",
  ];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  w.pickups.push({
    x: 45 + Math.random() * (WIDTH - 90),
    y: -70,
    w: 50,
    h: 50,
    vx: (Math.random() - 0.5) * 20,
    vy: 74,
    kind,
    spin: 0,
  });
}

function spawnBoss(w: GameWorld) {
  const stats = enemyStats.REALITY;
  w.enemies = w.enemies.filter((enemy) => enemy.kind === "REALITY");
  w.enemies.push({
    x: WIDTH / 2 - stats.w / 2,
    y: -120,
    w: stats.w,
    h: stats.h,
    vx: 90,
    vy: 42,
    kind: "REALITY",
    hp: stats.hp,
    maxHp: stats.hp,
    phase: 0,
    fireIn: 1,
    variant: 0,
  });
  w.bossSpawned = true;
  w.banner = "FINAL REVIEW: REALITY";
  w.bannerTime = 2.8;
}

function shoot(w: GameWorld) {
  const p = w.player;
  const damage = w.weaponLevel >= 3 ? 2 : 1;
  w.bullets.push({ x: p.x + p.w / 2 - 3, y: p.y - 14, w: 6, h: 18, vx: 0, vy: -530, damage });
  if (w.weaponLevel >= 2) {
    w.bullets.push({ x: p.x + 10, y: p.y, w: 5, h: 15, vx: -65, vy: -500, damage: 1 });
    w.bullets.push({ x: p.x + p.w - 15, y: p.y, w: 5, h: 15, vx: 65, vy: -500, damage: 1 });
  }
}

function applyPickup(w: GameWorld, pickup: Pickup) {
  const color = pickupColors[pickup.kind];
  burst(w, pickup.x + 20, pickup.y + 20, color, 24);
  w.shake = 0.25;
  if (pickup.kind === "LAYOFFS") {
    w.health = clamp(w.health + 24, 0, MAX_HEALTH);
    w.employees += 25;
    w.score += 850;
    w.banner = "LAYOFFS: CONFIDENCE +24%";
  } else if (pickup.kind === "VC FUNDING") {
    w.score += 1300;
    w.health = clamp(w.health + 10, 0, MAX_HEALTH);
    w.banner = "$100M SEED ROUND";
  } else if (pickup.kind === "GPU") {
    w.rapidFire = 9;
    w.weaponLevel = Math.min(3, w.weaponLevel + 1);
    w.banner = "GPU CLUSTER: SHIP FASTER";
  } else if (pickup.kind === "SILICON") {
    w.weaponLevel = Math.min(3, w.weaponLevel + 1);
    w.score += 500;
    w.banner = "SILICON CHIP: MORE COMPUTE";
  } else if (pickup.kind === "RAM") {
    w.rapidFire = 12;
    w.score += 700;
    w.banner = "RAM UPGRADE: CONTEXT +32GB";
  } else if (pickup.kind === "WATER") {
    w.health = clamp(w.health + 18, 0, MAX_HEALTH);
    w.shield = Math.max(w.shield, 4);
    w.score += 450;
    w.banner = "DATA CENTER COOLING ONLINE";
  } else {
    w.shield = 9;
    w.score += 650;
    w.banner = "RARE EARTH SUPPLY SECURED";
  }
  w.bannerTime = 1.5;
}

function updateWorld(
  w: GameWorld,
  dt: number,
  keys: Set<string>,
  pointer: { active: boolean; x: number; y: number },
  endGame: (screen: Screen) => void,
  playSound: (frequency: number, duration?: number, volume?: number) => void,
) {
  w.elapsed += dt;
  w.spawnIn -= dt;
  w.pickupIn -= dt;
  w.shotIn -= dt;
  w.rapidFire = Math.max(0, w.rapidFire - dt);
  w.shield = Math.max(0, w.shield - dt);
  w.shake = Math.max(0, w.shake - dt);
  w.bannerTime = Math.max(0, w.bannerTime - dt);

  for (const star of w.stars) {
    star.y += star.speed * dt;
    if (star.y > HEIGHT) {
      star.y = -4;
      star.x = Math.random() * WIDTH;
    }
  }

  const p = w.player;
  let dx = 0;
  let dy = 0;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;
  if (pointer.active) {
    const targetX = pointer.x - p.w / 2;
    const targetY = pointer.y - p.h / 2;
    p.x += (targetX - p.x) * Math.min(1, dt * 12);
    p.y += (targetY - p.y) * Math.min(1, dt * 12);
  } else {
    const length = Math.hypot(dx, dy) || 1;
    p.x += (dx / length) * 285 * dt;
    p.y += (dy / length) * 285 * dt;
  }
  p.x = clamp(p.x, 10, WIDTH - p.w - 10);
  p.y = clamp(p.y, 82, HEIGHT - p.h - 12);

  if (w.shotIn <= 0) {
    shoot(w);
    w.shotIn = w.rapidFire > 0 ? 0.09 : 0.18;
    playSound(360, 0.025, 0.018);
  }

  const formationRemaining = w.enemies.some((enemy) => enemy.formation);
  if (!w.layoffWaveSpawned && w.elapsed >= 9) spawnLayoffFormation(w);
  if (!w.bossSpawned && w.elapsed >= 38 && !formationRemaining) spawnBoss(w);
  if (!w.bossSpawned && !formationRemaining && w.spawnIn <= 0) {
    spawnEnemy(w);
    w.spawnIn = Math.max(0.28, 0.88 - w.elapsed * 0.012) * (0.75 + Math.random() * 0.55);
  }
  if (!w.bossSpawned && w.pickupIn <= 0) {
    spawnPickup(w);
    w.pickupIn = 5.2 + Math.random() * 3.2;
  }

  for (const b of w.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  for (const b of w.enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }

  for (const enemy of w.enemies) {
    enemy.phase += dt * 3;
    if (enemy.kind === "REALITY") {
      if (enemy.y < 122) enemy.y += enemy.vy * dt;
      else {
        enemy.x += enemy.vx * dt;
        if (enemy.x < 25 || enemy.x + enemy.w > WIDTH - 25) enemy.vx *= -1;
      }
      enemy.fireIn -= dt;
      if (enemy.fireIn <= 0 && enemy.y > 40) {
        for (let i = -2; i <= 2; i += 1) {
          w.enemyBullets.push({
            x: enemy.x + enemy.w / 2 - 7,
            y: enemy.y + enemy.h,
            w: 14,
            h: 14,
            vx: i * 72,
            vy: 190 + Math.abs(i) * 16,
            damage: 13,
            hostile: true,
          });
        }
        enemy.fireIn = 1.05;
        w.banner = bossLines[Math.floor(Math.random() * bossLines.length)];
        w.bannerTime = 0.8;
      }
    } else {
      enemy.y += enemy.vy * dt;
      enemy.x += (enemy.vx + Math.sin(enemy.phase) * (enemy.formation ? 42 : 30)) * dt;
      enemy.fireIn -= dt;
      if (["REGULATION", "ETHICS", "UNION"].includes(enemy.kind) && enemy.fireIn <= 0) {
        w.enemyBullets.push({
          x: enemy.x + enemy.w / 2 - 6,
          y: enemy.y + enemy.h,
          w: 12,
          h: 12,
          vx: 0,
          vy: 180,
          damage: 10,
          hostile: true,
        });
        enemy.fireIn = 1.8 + Math.random() * 1.5;
      }
    }
  }

  for (const pickup of w.pickups) {
    pickup.x += pickup.vx * dt;
    pickup.y += pickup.vy * dt;
    pickup.spin += dt * 4;
  }

  for (let bi = w.bullets.length - 1; bi >= 0; bi -= 1) {
    const bullet = w.bullets[bi];
    let hit = false;
    for (let ei = w.enemies.length - 1; ei >= 0; ei -= 1) {
      const enemy = w.enemies[ei];
      if (!overlap(bullet, enemy)) continue;
      enemy.hp -= bullet.damage;
      hit = true;
      burst(w, bullet.x, bullet.y, enemyStats[enemy.kind].color, 4);
      if (enemy.hp <= 0) {
        const stats = enemyStats[enemy.kind];
        burst(w, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, stats.color, enemy.kind === "REALITY" ? 70 : 18);
        w.score += stats.value;
        w.shake = enemy.kind === "REALITY" ? 1.2 : 0.18;
        if (["EMPLOYEE", "JUNIOR", "ARTIST", "SUPPORT"].includes(enemy.kind)) {
          w.employees += 1;
          w.health = clamp(w.health + 1.8, 0, MAX_HEALTH);
          w.texts.push({
            x: enemy.x + enemy.w / 2,
            y: enemy.y,
            text: satiricalLines[Math.floor(Math.random() * satiricalLines.length)],
            color: "#8cff66",
            life: 0.9,
          });
        }
        if (enemy.kind === "REALITY") {
          w.bossDefeated = true;
          w.meetings = 12 + Math.floor(w.employees / 4);
          playSound(110, 0.5, 0.08);
          endGame("victory");
        }
        w.enemies.splice(ei, 1);
        playSound(enemy.kind === "REALITY" ? 95 : 120, enemy.kind === "REALITY" ? 0.5 : 0.06, 0.035);
      }
      break;
    }
    if (hit) w.bullets.splice(bi, 1);
  }

  for (let i = w.enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = w.enemyBullets[i];
    if (overlap(bullet, p)) {
      w.enemyBullets.splice(i, 1);
      if (w.shield <= 0) {
        w.health -= bullet.damage;
        w.shake = 0.5;
        burst(w, p.x + p.w / 2, p.y + p.h / 2, "#ff435f", 16);
        playSound(75, 0.12, 0.06);
      } else {
        burst(w, bullet.x, bullet.y, "#67f5c1", 10);
      }
    }
  }

  for (let i = w.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = w.enemies[i];
    if (enemy.kind !== "REALITY" && overlap(enemy, p)) {
      if (w.shield <= 0) w.health -= ["REGULATION", "ETHICS", "UNION"].includes(enemy.kind) ? 22 : 9;
      burst(w, enemy.x, enemy.y, enemyStats[enemy.kind].color, 18);
      w.enemies.splice(i, 1);
      w.shake = 0.6;
    } else if (enemy.y > HEIGHT + 80) {
      w.enemies.splice(i, 1);
      if (["EMPLOYEE", "JUNIOR", "ARTIST", "SUPPORT"].includes(enemy.kind)) {
        w.score = Math.max(0, w.score - 50);
      }
    }
  }

  for (let i = w.pickups.length - 1; i >= 0; i -= 1) {
    const pickup = w.pickups[i];
    if (overlap(pickup, p)) {
      applyPickup(w, pickup);
      playSound(680, 0.11, 0.04);
      w.pickups.splice(i, 1);
    } else if (pickup.y > HEIGHT + 80) w.pickups.splice(i, 1);
  }

  for (const particle of w.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 70 * dt;
    particle.life -= dt;
  }
  for (const text of w.texts) {
    text.y -= 30 * dt;
    text.life -= dt;
  }

  w.bullets = w.bullets.filter((b) => b.y > -40 && b.x > -40 && b.x < WIDTH + 40);
  w.enemyBullets = w.enemyBullets.filter((b) => b.y < HEIGHT + 40 && b.x > -40 && b.x < WIDTH + 40);
  w.particles = w.particles.filter((particle) => particle.life > 0);
  w.texts = w.texts.filter((text) => text.life > 0);

  if (w.health <= 0) {
    w.health = 0;
    w.meetings = 8 + Math.floor(w.employees / 3);
    endGame("gameover");
  }
}

export function ArmsRaceGame() {
  const gamePageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<GameWorld>(makeWorld());
  const screenRef = useRef<Screen>("title");
  const keysRef = useRef(new Set<string>());
  const pointerRef = useRef({ active: false, x: WIDTH / 2, y: HEIGHT - 100 });
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [screen, setScreen] = useState<Screen>("title");
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const mutedRef = useRef(false);
  const [result, setResult] = useState({ score: 0, employees: 0, meetings: 0 });

  const playSound = useCallback((frequency: number, duration = 0.05, volume = 0.03) => {
    if (mutedRef.current || !audioRef.current) return;
    const context = audioRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, []);

  const endGame = useCallback((next: Screen) => {
    screenRef.current = next;
    setScreen(next);
    const w = worldRef.current;
    setResult({ score: w.score, employees: w.employees, meetings: w.meetings });
  }, []);

  const startGame = useCallback(() => {
    if (!audioRef.current && typeof window !== "undefined") {
      const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor) audioRef.current = new AudioCtor();
    }
    void audioRef.current?.resume();
    worldRef.current = makeWorld();
    screenRef.current = "playing";
    setScreen("playing");
    playSound(220, 0.08, 0.04);
    window.setTimeout(() => playSound(440, 0.08, 0.04), 90);
  }, [playSound]);

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      mutedRef.current = !current;
      return !current;
    });
  }, []);

  const toggleExpanded = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setExpanded(false);
      return;
    }

    const gamePage = gamePageRef.current;
    if (gamePage?.requestFullscreen) {
      try {
        await gamePage.requestFullscreen();
        setExpanded(true);
        return;
      } catch {
        // iOS and embedded browsers may reject native fullscreen.
      }
    }

    setExpanded((current) => !current);
  }, []);

  const setVirtualKey = useCallback((key: string, active: boolean) => {
    pointerRef.current.active = false;
    if (active) keysRef.current.add(key);
    else keysRef.current.delete(key);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("game-expanded", expanded);
    return () => document.documentElement.classList.remove("game-expanded");
  }, [expanded]);

  useEffect(() => {
    const syncFullscreenState = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
      }
      keysRef.current.add(key);
      if ((key === "enter" || key === " ") && screenRef.current !== "playing") startGame();
      if (key === "m") toggleMute();
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    const onBlur = () => {
      keysRef.current.clear();
      pointerRef.current.active = false;
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.034, (now - last) / 1000);
      last = now;
      const world = worldRef.current;
      if (screenRef.current === "playing") {
        updateWorld(world, dt, keysRef.current, pointerRef.current, endGame, playSound);
      } else {
        for (const star of world.stars) {
          star.y += star.speed * dt * 0.3;
          if (star.y > HEIGHT) star.y = 0;
        }
      }
      drawScene(ctx, world);
      animationRef.current = requestAnimationFrame(frame);
    };
    animationRef.current = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [endGame, playSound, startGame, toggleMute]);

  const updatePointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    pointerRef.current.x = ((clientX - rect.left) / rect.width) * WIDTH;
    pointerRef.current.y = ((clientY - rect.top) / rect.height) * HEIGHT;
  };

  return (
    <main ref={gamePageRef} className={`game-page${expanded ? " expanded" : ""}`}>
      <header className="topbar">
        <a className="brand" href="#" aria-label="AI Arms Race home">
          <span className="brand-mark" aria-hidden="true">▲</span>
          <span>AI ARMS RACE</span>
        </a>
        <p className="tagline">A SHAREHOLDER VALUE SIMULATOR</p>
        <div className="header-actions">
          <button className="icon-button" onClick={toggleMute} aria-label={muted ? "Turn sound on" : "Mute sound"}>
            {muted ? "SOUND OFF" : "SOUND ON"}
          </button>
          <button
            className="icon-button expand-button"
            onClick={toggleExpanded}
            aria-label={expanded ? "Exit fullscreen game" : "Open game in fullscreen"}
            aria-pressed={expanded}
          >
            {expanded ? "EXIT FULLSCREEN" : "FULLSCREEN"}
          </button>
        </div>
      </header>

      <section className="game-shell" aria-label="AI Arms Race game">
        <div className="corner corner-tl" />
        <div className="corner corner-tr" />
        <div className="corner corner-bl" />
        <div className="corner corner-br" />
        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            className="game-canvas"
            aria-label="Arcade game area. Move with arrow keys, WASD, touch controls, or by dragging. Firing is automatic."
            onPointerDown={(event) => {
              event.preventDefault();
              pointerRef.current.active = true;
              updatePointer(event.clientX, event.clientY);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (pointerRef.current.active) updatePointer(event.clientX, event.clientY);
            }}
            onPointerUp={() => {
              pointerRef.current.active = false;
            }}
            onPointerCancel={() => {
              pointerRef.current.active = false;
            }}
          />
          <div className="scanlines" aria-hidden="true" />
          <div className="screen-glow" aria-hidden="true" />

          {screen === "playing" && (
            <>
              <div className="mobile-controls" aria-label="Touch movement controls">
                <button
                  className="touch-key touch-up"
                  aria-label="Move up"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setVirtualKey("arrowup", true);
                  }}
                  onPointerUp={() => setVirtualKey("arrowup", false)}
                  onPointerCancel={() => setVirtualKey("arrowup", false)}
                  onPointerLeave={() => setVirtualKey("arrowup", false)}
                >
                  ▲
                </button>
                <button
                  className="touch-key touch-left"
                  aria-label="Move left"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setVirtualKey("arrowleft", true);
                  }}
                  onPointerUp={() => setVirtualKey("arrowleft", false)}
                  onPointerCancel={() => setVirtualKey("arrowleft", false)}
                  onPointerLeave={() => setVirtualKey("arrowleft", false)}
                >
                  ◀
                </button>
                <button
                  className="touch-key touch-down"
                  aria-label="Move down"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setVirtualKey("arrowdown", true);
                  }}
                  onPointerUp={() => setVirtualKey("arrowdown", false)}
                  onPointerCancel={() => setVirtualKey("arrowdown", false)}
                  onPointerLeave={() => setVirtualKey("arrowdown", false)}
                >
                  ▼
                </button>
                <button
                  className="touch-key touch-right"
                  aria-label="Move right"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setVirtualKey("arrowright", true);
                  }}
                  onPointerUp={() => setVirtualKey("arrowright", false)}
                  onPointerCancel={() => setVirtualKey("arrowright", false)}
                  onPointerLeave={() => setVirtualKey("arrowright", false)}
                >
                  ▶
                </button>
              </div>
              <p className="rotate-hint">ROTATE FOR A BIGGER VIEW • DRAG OR USE THE D-PAD</p>
            </>
          )}

          {screen === "title" && (
            <div className="overlay title-screen">
              <p className="eyebrow">PRESENTED BY QUARTERLY CAPITAL™</p>
              <h1>
                AI <span>ARMS RACE</span>
              </h1>
              <p className="deck">
                Automate the workforce. Collect the resources.
                <br />
                Survive long enough to face <strong>Reality.</strong>
              </p>
              <button className="start-button" onClick={startGame} data-testid="start-game">
                <span>START DISRUPTING</span>
                <small>ENTER / SPACE</small>
              </button>
              <div className="title-controls">
                <span><kbd>WASD</kbd> / <kbd>ARROWS</kbd> MOVE</span>
                <span><kbd>AUTO</kbd> FIRE</span>
                <span><kbd>DRAG</kbd> / <kbd>D-PAD</kbd> TOUCH</span>
              </div>
              <p className="disclaimer">THIS GAME IS SATIRE. THE INCENTIVES ARE REAL.</p>
            </div>
          )}

          {screen === "gameover" && (
            <div className="overlay end-screen">
              <p className="eyebrow red">EARNINGS MISS</p>
              <h2>OUT OF RUNWAY.</h2>
              <p>The hype cooled before the margins improved.</p>
              <div className="results">
                <div><span>MARKET CAP</span><strong>${(result.score * 0.12 + 42).toFixed(1)}B</strong></div>
                <div><span>EMPLOYEES REPLACED</span><strong>{result.employees}</strong></div>
                <div><span>NEW MEETINGS</span><strong>{result.meetings}</strong></div>
              </div>
              <button className="start-button" onClick={startGame}>
                <span>RESTRUCTURE AGAIN</span>
                <small>ENTER / SPACE</small>
              </button>
            </div>
          )}

          {screen === "victory" && (
            <div className="overlay end-screen victory">
              <p className="eyebrow green">CONGRATULATIONS, VISIONARY</p>
              <h2>REALITY DISRUPTED.</h2>
              <p>You replaced {result.employees} employees and created {result.meetings} new meetings.</p>
              <div className="results">
                <div><span>MARKET CAP</span><strong>${(result.score * 0.12 + 42).toFixed(1)}B</strong></div>
                <div><span>PROFIT</span><strong>STILL TBD</strong></div>
                <div><span>VALUATION</span><strong>UP ONLY</strong></div>
              </div>
              <button className="start-button" onClick={startGame}>
                <span>RUN ANOTHER QUARTER</span>
                <small>ENTER / SPACE</small>
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="game-footer">
        <p><span className="live-dot" /> CURRENT QUARTER: EXTREME OPTIMISM</p>
        <p className="ticker">
          <span>LAYOFFS +24% CONFIDENCE</span>
          <span>GPU SHORTAGE</span>
          <span>AGI RUMOR +8%</span>
          <span>REVENUE: NOT FOUND</span>
        </p>
        <p>BUILD 0.2.0</p>
      </footer>
    </main>
  );
}
