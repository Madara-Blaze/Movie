// Movie-card 3D cylinder carousel — adapted from a volumetric bank-card carousel.
// Vertical cylinder, smoothstep edge falloff, mouse-parallax tilt with inertia,
// real volumetric thickness via stacked layers. Controlled by `selected`; click a
// card or wheel to change it (calls onSelect). Honors prefers-reduced-motion.
const { useRef, useEffect, useState } = React;

const THICK = [-1.4, -0.7, 0, 0.7, 1.4];

function MovieCarousel(props) {
  const movies = props.movies || [];
  const count = Math.max(1, movies.length);
  const onSelect = props.onSelect || function () {};
  const cardsRefs = useRef([]);
  const frameId = useRef(0);
  const progress = useRef(props.selected || 0);
  const target = useRef(props.selected || 0);
  const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const wheelLock = useRef(0);

  const [metrics, setMetrics] = useState({ cardW: 280, cardH: 420 });

  // keep target synced to the controlled prop
  useEffect(() => { target.current = props.selected || 0; }, [props.selected]);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      // Portrait poster cards (2:3) so movie artwork fits with no crop.
      let cardH = Math.round(Math.min(h * 0.56, 430));
      cardH = Math.min(430, Math.max(260, cardH));
      let cardW = Math.round(cardH / 1.5);
      cardW = Math.min(cardW, Math.round(w * 0.84));
      setMetrics({ cardW, cardH });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onMove = (e) => {
      mouse.current.tx = Math.max(-1, Math.min(1, (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2)));
      mouse.current.ty = Math.max(-1, Math.min(1, (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2)));
    };
    const onLeave = () => { mouse.current.tx = 0; mouse.current.ty = 0; };
    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);

    const D = 1350;
    const tick = () => {
      const cards = cardsRefs.current;
      const h = window.innerHeight;
      const cardH = metrics.cardH;
      // ease toward selected target
      progress.current += (target.current - progress.current) * (reduce ? 1 : 0.1);
      mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.08;
      mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.08;
      const vai = progress.current;

      for (let i = 0; i < count; i++) {
        const card = cards[i];
        if (!card) continue;
        let offset = i - vai;
        const half = count / 2;
        while (offset > half) offset -= count;
        while (offset < -half) offset += count;
        const abs = Math.abs(offset);
        const sign = Math.sign(offset);
        if (abs > 3.0) { card.style.visibility = 'hidden'; continue; }
        card.style.visibility = 'visible';

        const gap = 40, peek = -55;
        let y = 0, z = 0, rot = 0;
        if (abs <= 1) {
          const t = abs, e = t * t * (3 - 2 * t);
          y = -sign * (e * (cardH + gap));
          z = 400 + e * (220 - 400);
          rot = e * 132;
        } else if (abs <= 2) {
          const t = abs - 1, e = t * t * (3 - 2 * t);
          const yStart = cardH + gap, zStart = 220, rotStart = 132, zEnd = -60, rotEnd = 175;
          const sEnd = D / (D - zEnd);
          const yEnd = (h / 2 - peek) / sEnd - (cardH / 2);
          y = -sign * (yStart + e * (yEnd - yStart));
          z = zStart + e * (zEnd - zStart);
          rot = rotStart + e * (rotEnd - rotStart);
        } else {
          const t = Math.min(abs - 2, 1), e = t * t * (3 - 2 * t);
          const zStart = -60, rotStart = 175, zEnd3 = -250, rotEnd3 = 195;
          const sEnd2 = D / (D - zStart);
          const yEnd2 = (h / 2 - peek) / sEnd2 - (cardH / 2);
          const sEnd3 = D / (D - zEnd3);
          const yEnd3 = (h / 2 + 100) / sEnd3 + (cardH / 2);
          y = -sign * (yEnd2 + e * (yEnd3 - yEnd2));
          z = zStart + e * (zEnd3 - zStart);
          rot = rotStart + e * (rotEnd3 - rotStart);
        }
        const localRot = -sign * rot;
        const cf = Math.max(0, 1 - abs);
        const tiltX = -mouse.current.y * 12 * cf;
        const tiltY = mouse.current.x * 15 * cf;
        card.style.zIndex = Math.round(z + 500).toString();
        card.style.transform =
          'translateY(' + y.toFixed(2) + 'px) translateZ(' + z.toFixed(2) + 'px) rotateX(' +
          (localRot + tiltX).toFixed(2) + 'deg) rotateY(' + tiltY.toFixed(2) + 'deg) rotateZ(-3deg)';
        card.style.cursor = abs < 0.6 ? 'default' : 'pointer';
      }
      frameId.current = requestAnimationFrame(tick);
    };
    frameId.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId.current);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [metrics, count]);

  const onWheel = (e) => {
    const now = Date.now();
    if (now - wheelLock.current < 260) return;
    if (Math.abs(e.deltaY) < 8) return;
    wheelLock.current = now;
    const next = Math.max(0, Math.min(count - 1, (props.selected || 0) + (e.deltaY > 0 ? 1 : -1)));
    if (next !== props.selected) onSelect(next);
  };
  const onOpen = props.onOpen || function () {};

  const cardLayer = (m, zOffset, kind) => {
    const radius = 16;
    const poster = m.poster;
    if (kind === 'mid') {
      return React.createElement('div', {
        key: 'mid', style: {
          position: 'absolute', inset: 0, borderRadius: radius, border: '1px solid #6b6f7a',
          background: '#6b6f7a', transform: 'translateZ(' + zOffset + 'px)', pointerEvents: 'none', overflow: 'hidden'
        }
      });
    }
    if (kind === 'front') {
      const kids = [];
      kids.push(React.createElement('div', { key: 'bg', style: { position: 'absolute', inset: 0, borderRadius: radius, background: 'radial-gradient(130% 120% at 30% 18%, oklch(0.46 0.12 ' + m.hue + '), oklch(0.13 0.06 ' + ((m.hue + 18) % 360) + '))' } }));
      if (poster) kids.push(React.createElement('div', { key: 'img', style: { position: 'absolute', inset: 0, borderRadius: radius, backgroundImage: 'url("' + poster + '")', backgroundSize: 'cover', backgroundPosition: 'center' } }));
      kids.push(React.createElement('div', { key: 'scrim', style: { position: 'absolute', inset: 0, borderRadius: radius, background: 'linear-gradient(180deg,rgba(5,7,15,0) 38%,rgba(5,7,15,.45) 66%,rgba(5,7,15,.94))' } }));
      kids.push(React.createElement('div', { key: 'sheen', style: { position: 'absolute', inset: 0, borderRadius: radius, background: 'linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,0) 40%)' } }));
      kids.push(React.createElement('div', { key: 'rate', style: { position: 'absolute', top: 12, right: 12, background: 'rgba(8,11,22,.72)', backdropFilter: 'blur(6px)', border: '1px solid rgba(231,194,125,.45)', borderRadius: 999, padding: '5px 11px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#e7c27d' } }, '\u2605 ' + m.rating));
      kids.push(React.createElement('div', { key: 'meta', style: { position: 'absolute', left: 18, right: 18, bottom: 18 } },
        React.createElement('div', { key: 'k', style: { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.2em', color: '#e7c27d', textTransform: 'uppercase', marginBottom: 7 } }, m.typeLabel + ' \u00b7 ' + m.genre),
        React.createElement('div', { key: 't', style: { fontFamily: "'Newsreader',serif", fontWeight: 700, fontSize: 26, lineHeight: 1.04, color: '#fff', textShadow: '0 2px 16px rgba(0,0,0,.6)' } }, m.title),
        React.createElement('div', { key: 'y', style: { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#c2c9d8', marginTop: 5 } }, m.year)));
      return React.createElement('div', {
        key: 'front', style: {
          position: 'absolute', inset: 0, borderRadius: radius, overflow: 'hidden',
          border: '1px solid rgba(231,194,125,.3)', transform: 'translateZ(' + zOffset + 'px)',
          backfaceVisibility: 'hidden', boxShadow: 'inset 0 1px 1px rgba(255,255,255,.18)', pointerEvents: 'none'
        }
      }, kids);
    }
    // back — distinct per title: blurred artwork + its own stats
    const bk = [];
    if (poster) bk.push(React.createElement('div', { key: 'bb', style: { position: 'absolute', inset: 0, filter: 'blur(22px) saturate(1.1)', transform: 'scale(1.25)', backgroundImage: 'url("' + poster + '")', backgroundSize: 'cover', backgroundPosition: 'center' } }));
    bk.push(React.createElement('div', { key: 'bd', style: { position: 'absolute', inset: 0, background: poster ? 'linear-gradient(180deg,rgba(5,7,15,.62),rgba(5,7,15,.82))' : 'radial-gradient(130% 120% at 30% 18%, oklch(0.3 0.09 ' + m.hue + '), oklch(0.1 0.05 ' + m.hue + '))' } }));
    bk.push(React.createElement('div', { key: 'edge', style: { position: 'absolute', inset: 0, borderRadius: radius, boxShadow: 'inset 0 0 0 1px rgba(231,194,125,.22), inset 0 0 70px 10px rgba(0,0,0,.4)' } }));
    bk.push(React.createElement('div', { key: 'info', style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '26px 22px' } },
      React.createElement('div', { key: 'g', style: { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.2em', color: '#e7c27d', textTransform: 'uppercase', marginBottom: 14 } }, m.typeLabel + ' \u00b7 ' + m.genre),
      React.createElement('div', { key: 't', style: { fontFamily: "'Newsreader',serif", fontWeight: 700, fontSize: 27, lineHeight: 1.08, color: '#fff' } }, m.title),
      React.createElement('div', { key: 'yr', style: { fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#aeb6c8', marginTop: 9 } }, m.year + '  \u00b7  \u2605 ' + m.rating),
      m.by ? React.createElement('div', { key: 'by', style: { fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#dfe3ec', marginTop: 14 } }, m.by) : null,
      React.createElement('div', { key: 'div', style: { width: 38, height: 1, background: 'rgba(231,194,125,.4)', margin: '20px 0 16px' } }),
      React.createElement('div', { key: 'cta', style: { fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: '#e7c27d', letterSpacing: '.16em' } }, 'TAP FOR THE VERDICT')));
    return React.createElement('div', {
      key: 'back', style: {
        position: 'absolute', inset: 0, borderRadius: radius, overflow: 'hidden',
        border: '1px solid rgba(231,194,125,.2)', transform: 'translateZ(' + zOffset + 'px) rotateX(180deg)',
        backfaceVisibility: 'hidden', boxShadow: 'inset 0 1px 1px rgba(255,255,255,.12)', pointerEvents: 'none'
      }
    }, bk);
  };

  return React.createElement('div', {
    onWheel: onWheel,
    style: { position: 'absolute', inset: 0, background: 'transparent', overflow: 'hidden', userSelect: 'none' }
  },
    React.createElement('div', {
      style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '1350px' }
    },
      React.createElement('div', {
        style: { position: 'absolute', width: metrics.cardW, height: metrics.cardH, transformStyle: 'preserve-3d' }
      },
        movies.map((m, i) => React.createElement('div', {
          key: m.id || i,
          ref: (el) => { cardsRefs.current[i] = el; },
          onClick: () => { const sel = props.selected || 0; if (i === sel) { onOpen(i); } else { onSelect(i); } },
          style: { position: 'absolute', inset: 0, width: metrics.cardW, height: metrics.cardH, transformStyle: 'preserve-3d', backfaceVisibility: 'visible' }
        },
          THICK.map((z, li) => cardLayer(m, z, li === THICK.length - 1 ? 'front' : (li === 0 ? 'back' : 'mid')))
        ))
      )
    )
  );
}

window.MovieCarousel = MovieCarousel;
if (typeof module !== 'undefined') { module.exports = { MovieCarousel: MovieCarousel }; }
