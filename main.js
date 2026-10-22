// tamatam: Selected work
// Plain JavaScript, no libraries.


// 1. Keywords: click one to show only that kind of work, click it again to show everything
let active = null;
document.querySelectorAll('.kw').forEach(btn => {
  btn.addEventListener('click', () => {
    active = active === btn.dataset.kw ? null : btn.dataset.kw;
    document.querySelectorAll('[data-tags]').forEach(el => {
      el.hidden = active !== null && !el.dataset.tags.split(' ').includes(active);
    });
    reorder();
    document.querySelectorAll('.kw').forEach(b => b.classList.toggle('on', b.dataset.kw === active));
    document.body.classList.toggle('filtering', active !== null);
    // jump to the first matching work so the change is visible
    const first = document.querySelector('section.project:not([hidden])');
    if (active && first) first.scrollIntoView({ behavior: 'smooth' });
    schedule();
    const count = document.querySelectorAll('section.project:not([hidden])').length;
    pop(active ? `Filtered! Showing ${count} ${active} works` : `Unfiltered! Showing all ${count} works`, btn);
  });
});

// When filtered, the works that are most purely about that keyword come first
// (HEX and PARA for merch, BikeUP for digital...), so every filter starts somewhere
// different. Unfiltered, everything goes back to the original order.
const sections = [...document.querySelectorAll('section.project')];
const items = [...document.querySelectorAll('.index li')];
function reorder() {
  const rank = el => (active ? el.dataset.tags.split(' ').length * 100 : 0) + Number(el.dataset.n);
  const end = document.querySelector('.end');
  [...sections].sort((a, b) => rank(a) - rank(b)).forEach(s => end.before(s));
  const list = document.querySelector('.index');
  [...items].sort((a, b) => rank(a) - rank(b)).forEach(li => list.append(li));
}

// a small label pops up from the bottom on every click, each one a little off-centre and tilted
function pop(text, btn) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  t.style.setProperty('--c', getComputedStyle(btn).getPropertyValue('--c'));
  t.style.setProperty('--dx', `${Math.round(Math.random() * 120 - 60)}px`);
  t.style.setProperty('--r', `${Math.round(Math.random() * 12 - 6)}deg`);
  document.body.append(t);
  t.addEventListener('animationend', () => t.remove());
}


// 2. Preview: hovering a project name in the intro list shows a picture next to the cursor
const preview = document.getElementById('preview');
document.querySelectorAll('.index a').forEach(link => {
  link.addEventListener('mouseenter', () => {
    preview.src = link.dataset.preview;
    preview.classList.add('on');
  });
  link.addEventListener('mouseleave', () => preview.classList.remove('on'));
});
document.addEventListener('mousemove', e => {
  // the picture sits up and to the left of the cursor, so it never covers the list
  preview.style.transform = `translate(${e.clientX - 244}px, ${e.clientY - 300}px)`;
});


// 3. Project titles: current project big at the top left, the previous ones small
//    above it, the next one small at the bottom. When a project ends, the next name
//    stands up at the left edge and slides up like a snake into the list.
const titles = document.querySelector('.titles');
const desktop = matchMedia('(hover: hover) and (min-width: 901px)');

const LIST_X = 104;     // where the list of names starts (lines up with the text column)
const BIG_Y = 72;       // top of the current, big name
const EDGE_X = 46;      // where the upright name stands
const TURN = 24;        // radius of the corner the name slides around

const works = [...document.querySelectorAll('section.project')].map(section => {
  const name = section.querySelector('h2').textContent;
  const line = document.createElement('div');
  line.className = 'line';
  // letters take the project's category colours in turn (shown on hover)
  const order = ['merch', 'branding', 'photography', 'digital'];
  const cols = order.filter(t => section.dataset.tags.split(' ').includes(t));
  [...name].forEach((ch, k) => {
    const s = document.createElement('span');
    s.textContent = ch;
    s.style.setProperty('--h', `var(--c-${cols[k % cols.length]})`);
    line.append(s);
  });
  line.addEventListener('click', () => section.scrollIntoView({ behavior: 'smooth' }));
  const letters = [...name].map(ch => {
    const span = document.createElement('span');
    span.className = 'ch';
    span.textContent = ch;
    return span;
  });
  titles.append(line, ...letters);
  return { section, line, letters, offsets: [] };
});

function measure() {
  const probe = document.createElement('div');
  probe.className = 'line';
  probe.style.visibility = 'hidden';
  titles.append(probe);
  works.forEach(w => {
    probe.innerHTML = '';
    const spans = w.letters.map(l => {
      const s = document.createElement('span');
      s.textContent = l.textContent;
      probe.append(s);
      return s;
    });
    w.offsets = spans.map(s => s.offsetLeft);
  });
  probe.remove();
}

const clamp = v => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// The path the letters travel: up the left edge, a quarter circle, then right.
// u = distance along the path; returns the point and the direction (degrees).
function onPath(u, bottom) {
  const up = bottom - (BIG_Y + TURN);          // length of the upright part
  const arc = Math.PI * TURN / 2;              // length of the corner
  if (u < up) return [EDGE_X, bottom - u, -90];
  if (u < up + arc) {
    const a = Math.PI + (u - up) / TURN;       // 180° → 270°
    return [EDGE_X + TURN + TURN * Math.cos(a), BIG_Y + TURN + TURN * Math.sin(a), -90 + (u - up) / arc * 90];
  }
  return [EDGE_X + TURN + (u - up - arc), BIG_Y, 0];
}

function draw() {
  if (!desktop.matches) return;
  const vh = innerHeight;

  // hide the list when the closing "Thank you." comes up
  document.body.classList.toggle('at-end', document.querySelector('.end').getBoundingClientRect().top < vh * 0.7);

  // how far each project has arrived: 0 = its top is just below the screen, 1 = it reaches the text column
  const visible = works.filter(w => !w.section.hidden)
    .sort((a, b) => a.section.compareDocumentPosition(b.section) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  const arrived = visible.map(w => clamp((vh * 1.15 - w.section.getBoundingClientRect().top) / (vh * 1.15 - 132)));
  let current = -1;
  arrived.forEach((t, k) => { if (t >= 1) current = k; });
  const next = visible[current + 1];
  const t = next ? arrived[current + 1] : 0;

  works.forEach(w => {
    w.line.style.opacity = 0;
    w.letters.forEach(l => { l.style.opacity = 0; });
  });

  // list at the top left: current name big, older ones small and grey, slide up as the next one arrives
  visible.forEach((w, k) => {
    if (k > current) return;
    const slot = current - k + t;
    const y = slot <= 1 ? lerp(BIG_Y, BIG_Y - 24, slot) : BIG_Y - 24 - (slot - 1) * 18;
    w.line.style.transform = `translate(${LIST_X}px, ${y}px) scale(${lerp(1, 0.5, Math.min(slot, 1))})`;
    w.line.style.opacity = slot <= 2 ? 1 : clamp(3 - slot);
    w.line.style.color = slot < 0.5 ? 'var(--ink)' : 'var(--grey)';
  });

  // next name: waits small and grey at the bottom left. When the current project
  // ends, it stands up at the left edge and slides up the path like a snake.
  if (next) {
    const bottom = vh - 48;
    const stand = ease(clamp(t / 0.2));             // first fifth: stand up (before the project shows)
    const slide = ease(clamp((t - 0.2) / 0.8));     // the rest: slide up and around the corner
    const up = bottom - (BIG_Y + TURN);
    const total = up + Math.PI * TURN / 2 + LIST_X - EDGE_X - TURN;   // start → final place
    next.letters.forEach((l, i) => {
      const off = next.offsets[i];
      let x, y, deg, size = 1;
      if (slide === 0) {
        const a = -Math.PI / 2 * stand;             // turn from lying (0°) to standing (−90°)
        size = lerp(0.5, 1, stand);
        x = lerp(LIST_X, EDGE_X, stand) + Math.cos(a) * off * size;
        y = bottom + Math.sin(a) * off * size;
        deg = a * 180 / Math.PI;
      } else {
        [x, y, deg] = onPath(off + slide * total, bottom);
      }
      l.style.transform = `translate(${x}px, ${y}px) rotate(${deg}deg) scale(${size})`;
      l.style.opacity = 1;
      l.classList.toggle('done', t >= 1);
    });
  }
}

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; draw(); });
}
addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', schedule);
desktop.addEventListener('change', () => { measure(); schedule(); });
document.fonts.ready.then(() => { measure(); draw(); });

// the names appear only after you scroll past the intro
const hero = document.querySelector('.hero');
new IntersectionObserver(([e]) => {
  document.body.classList.toggle('past-hero', !e.isIntersecting);
}).observe(hero);


// 4. Cursor: a thin line arrow that follows the mouse and turns neon green over anything clickable
const cursor = document.getElementById('cursor');
const fineMouse = matchMedia('(hover: hover) and (pointer: fine)');
const CLICKABLE = 'a, button, .titles .line';
if (fineMouse.matches) {
  document.documentElement.classList.add('has-cursor');
  document.addEventListener('mousemove', e => {
    cursor.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`;   // the tip sits exactly on the pointer
    cursor.classList.add('on');
    cursor.classList.toggle('hot', !!e.target.closest(CLICKABLE));
  });
  document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('on'));
}
