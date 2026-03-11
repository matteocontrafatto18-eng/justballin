// ══════════════════════════════════════════
//   JUST BALLIN — FREE THROW
//   public/game.js
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

// Aspettiamo che il DOM sia pronto prima di toccare qualsiasi elemento
// Senza questo, getElementById restituisce null e il gioco non parte

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ── CONSTANTS ──
const W = 600, H = 580;
const RIM_X = 300, RIM_Y = 148, RIM_W = 64;
const PL_X  = 300, PL_Y  = 415;
const FLOOR_Y = 298;

// ── STATE ──
let gameState  = 'idle';
let score      = 0;
let lives      = 3;
let combo      = 0;
let shotCount  = 0;   // total shots taken this game
let madeCount  = 0;   // total made baskets this game
let newEntryIdx = -1;

// Bar
let needlePos   = 0;
let needleDir   = 1;
let needleSpeed = 0.010;
let greenTop    = 0.35;
let greenSize   = 0.42;   // starts very big (0→1 of bar height)
const GREEN_MIN = 0.055;  // ~3 "tacchette" minimum

// Ball anim
let ball = null; // {x,y,sx,sy,tx,ty,t,phase,made}

// leaderboard
let lb = [];
try { lb = JSON.parse(localStorage.getItem('jb_lb2') || '[]'); } catch(e){}

// Bar DOM refs (cached once)
const barTrack  = document.getElementById('bar-track');
const barGreen  = document.getElementById('bar-green');
const barNeedle = document.getElementById('bar-needle');

// ── BAR UPDATE (rAF driven) ──
function updateBar() {
  if(gameState !== 'playing') return;

  needlePos += needleDir * needleSpeed;
  if(needlePos >= 1){ needlePos = 1; needleDir = -1; }
  if(needlePos <= 0){ needlePos = 0; needleDir =  1; }

  const h  = barTrack.offsetHeight || 400;
  const np = needlePos * (h - 4);
  const gp = greenTop  * h;
  const gh = greenSize * h;

  barNeedle.style.top    = np + 'px';
  barGreen.style.top     = gp + 'px';
  barGreen.style.height  = gh + 'px';
}

// ── DIFFICULTY: called every 3 made baskets ──
function applyDifficulty() {
  const level = Math.floor(madeCount / 3) + 1;
  document.getElementById('diff-val').textContent = level;

  // Shrink green zone every level
  greenSize = Math.max(GREEN_MIN, 0.42 - (level - 1) * 0.065);

  // Speed increases every level regardless of green size
  needleSpeed = 0.010 + (level - 1) * 0.003;
  needleSpeed = Math.min(needleSpeed, 0.038);

  // Randomize green position
  const maxTop = 1 - greenSize - 0.04;
  greenTop = 0.04 + Math.random() * maxTop;
}

// ── SHOT ──
function shoot() {
  if(gameState !== 'playing') return;
  if(ball) return;

  const inGreen = needlePos >= greenTop && needlePos <= (greenTop + greenSize);
  gameState = 'animating';
  shotCount++;

  startBall(inGreen);
}

function startBall(made) {
  ball = {
    sx: PL_X + 14, sy: PL_Y - 18,
    tx: made ? RIM_X : RIM_X + (Math.random() > .5 ? 38 : -38),
    ty: RIM_Y - 6,
    t: 0, made,
    phase: 'fly',  // fly | miss-bounce | done
  };
}

function updateBall() {
  if(!ball) return;

  ball.t += 0.028;
  const t  = Math.min(ball.t, 1);
  const et = t < .5 ? 2*t*t : -1+(4-2*t)*t;

  // Peak of arc
  const mx = (ball.sx + ball.tx) / 2;
  const my = Math.min(ball.sy, ball.ty) - 175;

  ball.x = (1-t)*(1-t)*ball.sx + 2*(1-t)*t*mx + t*t*ball.tx;
  ball.y = (1-t)*(1-t)*ball.sy + 2*(1-t)*t*my + t*t*ball.ty;

  if(ball.t >= 1) {
    if(ball.phase === 'fly') {
      if(ball.made) {
        // Net drop
        ball.phase = 'net';
        ball.t = 0;
        ball.sx = ball.tx; ball.sy = ball.ty;
        ball.tx = ball.sx + (Math.random()*14 - 7);
        ball.ty = ball.sy + 32;
      } else {
        // Miss bounce: fly outward
        ball.phase = 'miss-bounce';
        ball.t = 0;
        ball.sx = ball.tx; ball.sy = ball.ty;
        const side = ball.sx > RIM_X ? 1 : -1;
        ball.tx = ball.sx + side * (60 + Math.random() * 80);
        ball.ty = FLOOR_Y - 10 + Math.random() * 40;
      }
    } else {
      // Animation done
      onAnimEnd(ball.made);
      ball = null;
    }
  }
}

function onAnimEnd(made) {
  if(made) {
    combo++;
    madeCount++;
    score += 3;
    const msg = combo >= 3 ? '🔥 ON FIRE! +3' : combo >= 2 ? '💥 COMBO! +3' : '✓ +3';
    showFeedback(msg, true);
    showComboUI(combo);
  } else {
    combo = 0;
    lives--;
    updateHearts();
    showFeedback('✗ SBAGLIATO!', false);
    showComboUI(0);
    if(lives <= 0) {
      setTimeout(gameOver, 500);
      return;
    }
  }

  // Difficulty increases every 3 made baskets
  if(made && madeCount % 3 === 0) applyDifficulty();
  // Green position changes every single basket
  if(made) {
    const maxTop = 1 - greenSize - 0.04;
    greenTop = 0.04 + Math.random() * maxTop;
  }
  updateHUD();
  // Randomize green after every shot
  if(!made) {
    const maxTop = 1 - greenSize - 0.04;
    greenTop = 0.04 + Math.random() * maxTop;
  }
  gameState = 'playing';
}

// ── GAME FLOW ──
function startGame() {
  // Reset ALL state cleanly
  score      = 0;
  lives      = 3;
  combo      = 0;
  shotCount  = 0;
  madeCount  = 0;
  newEntryIdx = -1;
  ball       = null;
  needlePos  = 0;
  needleDir  = 1;
  needleSpeed = 0.010;
  greenSize  = 0.42;
  greenTop   = 0.35;
  gameState  = 'playing';

  updateHUD();
  updateHearts();
  document.getElementById('diff-val').textContent = '1';
  document.getElementById('combo').classList.remove('show');
  document.getElementById('screen-intro').classList.add('hidden');
  document.getElementById('screen-gameover').classList.add('hidden');
  document.getElementById('screen-leaderboard').classList.add('hidden');
}

function gameOver() {
  gameState = 'idle';
  document.getElementById('go-score-val').textContent = score;

  // Check if player already saved data before
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('jb_player') || 'null'); } catch(e){}

  if(saved) {
    // Returning player — show quick save screen
    document.getElementById('returning-name').textContent = saved.nick;
    document.getElementById('returning-score').textContent = score;
    document.getElementById('screen-returning').classList.remove('hidden');
  } else {
    // New player — show full form
    ['f-name','f-nick','f-email','f-city'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-news').checked = true;
    document.getElementById('screen-gameover').classList.remove('hidden');
    document.getElementById('f-name').focus();
  }
}

function saveAndShowLB() {
  const name  = document.getElementById('f-name').value.trim();
  const nick  = document.getElementById('f-nick').value.trim().toUpperCase() || 'PLAYER';
  const email = document.getElementById('f-email').value.trim();
  const city  = document.getElementById('f-city').value.trim().toUpperCase();
  const news  = document.getElementById('f-news').checked;

  const playerData = { name, nick, email, city, news };

  // Save player data for future sessions
  try { localStorage.setItem('jb_player', JSON.stringify(playerData)); } catch(e){}

  saveEntry(playerData);
}

function saveReturning() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('jb_player') || 'null'); } catch(e){}
  if(saved) saveEntry(saved);
}

function saveEntry(playerData) {
  const { name, nick, email, city, news } = playerData;

  const entry = {
    name, nick, email, city, news,
    score,
    date:  new Date().toLocaleDateString('it-IT', {day:'2-digit',month:'2-digit',year:'2-digit'}),
    month: new Date().toLocaleDateString('it-IT', {month:'long',year:'numeric'})
  };

  lb.push(entry);
  lb.sort((a,b) => b.score - a.score);
  lb = lb.slice(0, 20);
  newEntryIdx = lb.indexOf(entry);

  try { localStorage.setItem('jb_lb2', JSON.stringify(lb)); } catch(e){}

  document.getElementById('screen-gameover').classList.add('hidden');
  document.getElementById('screen-returning').classList.add('hidden');
  showLB();
}

function showLB() {
  document.getElementById('screen-gameover').classList.add('hidden');
  document.getElementById('screen-leaderboard').classList.remove('hidden');

  const now = new Date();
  document.getElementById('lb-month').textContent =
    now.toLocaleDateString('it-IT', {month:'long',year:'numeric'}).toUpperCase();

  // Filter current month
  const monthStr = now.toLocaleDateString('it-IT', {month:'long',year:'numeric'});
  const monthly  = lb.filter(e => e.month === monthStr).slice(0, 10);

  const tbody  = document.getElementById('lb-body');
  tbody.innerHTML = '';

  if(!monthly.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#2a2a2a;text-align:center;font-size:.3rem;padding:20px">NESSUN PUNTEGGIO QUESTO MESE</td></tr>';
    return;
  }

  const medals = ['🥇','🥈','🥉'];
  monthly.forEach((e,i) => {
    const isNew = lb[newEntryIdx] === e;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:#333">${medals[i] || (i+1)}</td>
      <td class="${isNew?'lb-new':''}">${e.nick}${isNew?' ◀':''}</td>
      <td style="color:var(--orange)">${e.score}</td>
      <td style="color:#444;font-size:.3rem">${e.city||'—'}</td>
      <td style="color:#333;font-size:.3rem">${e.date}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── HUD ──
function updateHUD() {
  document.getElementById('hud-score').textContent = score;
}
function updateHearts() {
  for(let i=1;i<=3;i++)
    document.getElementById('h'+i).classList.toggle('lost', i > lives);
}

// ── FEEDBACK ──
function showFeedback(text, good) {
  const el = document.getElementById('feedback');
  el.className = '';
  el.textContent = text;
  el.style.color = good ? '#2ecc40' : '#e8271a';
  void el.offsetWidth;
  el.className = good ? 'fb-score' : 'fb-miss';
}

function showComboUI(c) {
  const el = document.getElementById('combo');
  if(c >= 2){ el.textContent = c+'× COMBO 🔥'; el.classList.add('show'); }
  else       { el.classList.remove('show'); }
}

// ══════════════════════════════════════════════
// DRAW
// ══════════════════════════════════════════════

function drawAll() {
  ctx.clearRect(0, 0, W, H);
  drawScene();
  drawBackboard();
  drawPlayer(!ball);
  if(ball){ updateBall(); if(ball) drawBall(ball.x, ball.y, 17); }
  else { drawBall(PL_X + 14, PL_Y - 18, 17); }
}

function drawScene() {
  // Arena dark bg
  ctx.fillStyle = '#0a0a18';
  ctx.fillRect(0, 0, W, H);

  // Crowd rows
  const rows = [{y:55,h:32,n:26},{y:90,h:28,n:22},{y:120,h:22,n:18}];
  const bodyColors = ['#1e3a8a','#991b1b','#14532d','#78350f'];
  const skinColors = ['#fcd9a8','#c68642','#8B4513','#f5cba0','#e0956b'];
  rows.forEach(row => {
    ctx.fillStyle = '#0d0d20';
    ctx.fillRect(0, row.y, W, row.h);
    const sp = W / row.n;
    for(let i=0;i<row.n;i++){
      const hx = i*sp+sp/2;
      ctx.fillStyle = skinColors[(i*3+row.y)%skinColors.length];
      ctx.fillRect(Math.round(hx-3), row.y+3, 7, 7);
      ctx.fillStyle = bodyColors[(i*5+row.y)%bodyColors.length];
      ctx.fillRect(Math.round(hx-4), row.y+9, 9, row.h-10);
    }
  });

  // Scoreboard
  ctx.fillStyle = '#08080f';
  ctx.fillRect(210, 8, 180, 40);
  ctx.strokeStyle = '#E8621A';
  ctx.lineWidth = 2;
  ctx.strokeRect(210, 8, 180, 40);
  ctx.fillStyle = '#E8621A';
  ctx.font = '9px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText('JUST BALLIN', 300, 24);
  ctx.fillStyle = '#f5f0e8';
  ctx.font = '7px "Press Start 2P"';
  ctx.fillText('FREE THROW', 300, 40);

  // Wall
  ctx.fillStyle = '#0e111e';
  ctx.fillRect(0, 145, W, FLOOR_Y - 145);

  // Wood floor
  const planks = [
    '#d4924e','#c88a45','#d4924e','#be8040',
    '#c88a45','#d4924e','#c88a45','#be8040',
    '#d4924e','#c88a45','#d4924e','#be8040',
    '#c88a45','#d4924e','#c88a45','#be8040',
    '#d4924e','#c88a45',
  ];
  const plankH = 16;
  planks.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(0, FLOOR_Y + i*plankH, W, plankH);
    ctx.fillStyle = '#a86830';
    ctx.fillRect(0, FLOOR_Y + i*plankH, W, 1);
  });

  // Court lines
  ctx.strokeStyle = 'rgba(232,210,170,0.55)';
  ctx.lineWidth = 3;
  // Free throw line
  ctx.beginPath(); ctx.moveTo(155, FLOOR_Y+78); ctx.lineTo(445, FLOOR_Y+78); ctx.stroke();
  // Lane
  ctx.beginPath(); ctx.moveTo(155, FLOOR_Y); ctx.lineTo(155, FLOOR_Y+78); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(445, FLOOR_Y); ctx.lineTo(445, FLOOR_Y+78); ctx.stroke();
  // Arc
  ctx.beginPath(); ctx.arc(300, FLOOR_Y+78, 82, Math.PI, 0); ctx.stroke();
  // Center circle half
  ctx.beginPath(); ctx.arc(300, H, 60, Math.PI, 0); ctx.stroke();
}

function drawBackboard() {
  const bx=256, by=58, bw=88, bh=50;

  // Shadow
  ctx.fillStyle='rgba(0,0,0,.45)';
  ctx.fillRect(bx+4,by+4,bw,bh);

  // Board
  ctx.fillStyle='#dde8ee';
  ctx.fillRect(bx,by,bw,bh);
  ctx.strokeStyle='#cc2200'; ctx.lineWidth=3;
  ctx.strokeRect(bx,by,bw,bh);

  // Inner box
  ctx.strokeStyle='#cc2200'; ctx.lineWidth=2;
  ctx.strokeRect(bx+21,by+15,46,26);

  // Pole
  ctx.fillStyle='#666';
  ctx.fillRect(297,by+bh,6,38);

  drawRim();
}

function drawRim() {
  const rx=RIM_X-RIM_W/2, ry=RIM_Y;

  // Rim shadow
  ctx.fillStyle='rgba(0,0,0,.4)';
  ctx.fillRect(rx+3,ry+3,RIM_W,7);

  // Rim body
  ctx.fillStyle='#cc3300';
  ctx.fillRect(rx,ry,RIM_W,7);
  ctx.fillStyle='#ff6644';
  ctx.fillRect(rx,ry,RIM_W,2);

  // End caps
  ctx.fillStyle='#aa2200';
  ctx.fillRect(rx-3,ry-2,6,10);
  ctx.fillRect(rx+RIM_W-3,ry-2,6,10);

  // Net
  const ny=ry+7, netH=30, lines=8;
  ctx.strokeStyle='rgba(232,224,208,.7)'; ctx.lineWidth=1.2;
  for(let i=0;i<=lines;i++){
    const tx=rx+(RIM_W/lines)*i;
    const bx2=rx+4+((RIM_W-8)/lines)*i;
    ctx.beginPath(); ctx.moveTo(tx,ny); ctx.lineTo(bx2,ny+netH); ctx.stroke();
  }
  for(let j=1;j<=4;j++){
    const t=j/4, ly=ny+netH*t;
    const lx=rx+4*t, lw=RIM_W-8*t;
    ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx+lw,ly); ctx.stroke();
  }
}

function drawPlayer(hasBall) {
  const px=PL_X, py=PL_Y;

  // Shadow
  ctx.fillStyle='rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(px,py+50,20,5,0,0,Math.PI*2);
  ctx.fill();

  // Shoes
  ctx.fillStyle='#fff'; ctx.fillRect(px-13,py+42,11,7); ctx.fillRect(px+2,py+42,11,7);
  ctx.fillStyle='#cc0000'; ctx.fillRect(px-13,py+42,11,3); ctx.fillRect(px+2,py+42,11,3);

  // Shorts
  ctx.fillStyle='#1a3a8f'; ctx.fillRect(px-11,py+26,22,17);
  ctx.fillStyle='#fff'; ctx.fillRect(px-11,py+26,22,2);

  // Jersey
  ctx.fillStyle='#cc2200'; ctx.fillRect(px-11,py+4,22,24);
  ctx.fillStyle='#fff';
  ctx.font='bold 9px "Press Start 2P"';
  ctx.textAlign='center';
  ctx.fillText('23',px,py+20);

  // Arms
  if(hasBall){
    ctx.fillStyle='#cc2200';
    ctx.fillRect(px-20,py-6,9,17); ctx.fillRect(px+11,py-10,9,17);
    ctx.fillStyle='#c68642';
    ctx.fillRect(px-20,py-12,9,7); ctx.fillRect(px+11,py-16,9,7);
  } else {
    ctx.fillStyle='#cc2200';
    ctx.fillRect(px-20,py+4,9,18); ctx.fillRect(px+11,py+4,9,18);
    ctx.fillStyle='#c68642';
    ctx.fillRect(px-20,py+20,9,7); ctx.fillRect(px+11,py+20,9,7);
  }

  // Head
  ctx.fillStyle='#c68642'; ctx.fillRect(px-9,py-19,18,18);
  ctx.fillStyle='#000'; ctx.fillRect(px-5,py-13,4,4); ctx.fillRect(px+1,py-13,4,4);
  // Headband
  ctx.fillStyle='#cc2200'; ctx.fillRect(px-9,py-19,18,4);
}

function drawBall(x, y, r) {
  // Shadow
  ctx.fillStyle='rgba(0,0,0,.2)';
  ctx.beginPath();
  ctx.ellipse(x+2,y+r*.5,r*.7,r*.25,0,0,Math.PI*2);
  ctx.fill();

  // Ball
  ctx.fillStyle='#E8621A';
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();

  // Dark side
  ctx.fillStyle='rgba(0,0,0,.16)';
  ctx.beginPath(); ctx.arc(x+r*.2,y+r*.2,r*.65,0,Math.PI*2); ctx.fill();

  // Shine
  ctx.fillStyle='rgba(255,255,255,.32)';
  ctx.beginPath(); ctx.arc(x-r*.28,y-r*.32,r*.22,0,Math.PI*2); ctx.fill();

  // Seams
  ctx.strokeStyle='#8B3A0A'; ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.moveTo(x,y-r);
  ctx.bezierCurveTo(x+r*.5,y-r*.3,x+r*.5,y+r*.3,x,y+r);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x,y-r);
  ctx.bezierCurveTo(x-r*.5,y-r*.3,x-r*.5,y+r*.3,x,y+r);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x-r,y);
  ctx.bezierCurveTo(x-r*.3,y-r*.4,x+r*.3,y-r*.4,x+r,y);
  ctx.stroke();
}

// ══════════════════════════════════════════════
// MAIN LOOP
// ══════════════════════════════════════════════

let lastTs = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  // cap to ~60fps
  if(ts - lastTs < 14) return;
  lastTs = ts;

  updateBar();
  drawAll();
}

requestAnimationFrame(loop);

// ══════════════════════════════════════════════
// EVENTS
// ══════════════════════════════════════════════

document.addEventListener('keydown', e => {
  if(e.code === 'Space'){ e.preventDefault(); shoot(); }
});

canvas.addEventListener('touchstart', e => { e.preventDefault(); shoot(); }, {passive:false});

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-save').addEventListener('click', saveAndShowLB);
document.getElementById('btn-skip').addEventListener('click', () => {
  document.getElementById('screen-gameover').classList.add('hidden');
  showLB();
});
document.getElementById('btn-save-returning').addEventListener('click', saveReturning);
document.getElementById('btn-skip-returning').addEventListener('click', () => {
  document.getElementById('screen-returning').classList.add('hidden');
  showLB();
});
document.getElementById('btn-notme').addEventListener('click', () => {
  // Clear saved player and show full form
  try { localStorage.removeItem('jb_player'); } catch(e){}
  document.getElementById('screen-returning').classList.add('hidden');
  ['f-name','f-nick','f-email','f-city'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-news').checked = true;
  document.getElementById('screen-gameover').classList.remove('hidden');
  document.getElementById('f-name').focus();
});
document.getElementById('btn-retry').addEventListener('click', startGame);
document.getElementById('f-email').addEventListener('keydown', e => {
  if(e.key==='Enter') saveAndShowLB();
});

// ── Stars ──
const starsEl = document.getElementById('stars');
for(let i=0;i<55;i++){
  const s = document.createElement('div');
  s.className='star';
  s.style.left=Math.random()*100+'%';
  s.style.top =Math.random()*100+'%';
  s.style.setProperty('--d',(1+Math.random()*2.5)+'s');
  starsEl.appendChild(s);
}

}); // fine DOMContentLoaded