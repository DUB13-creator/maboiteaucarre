import React, { useState, useRef, useLayoutEffect, useEffect, memo } from 'react';
import { createRoot } from 'react-dom/client';

const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger, CustomEase = window.CustomEase;
gsap.registerPlugin(ScrollTrigger, CustomEase);
CustomEase.create('out', '0.23,1,0.32,1');
CustomEase.create('inOut', '0.77,0,0.175,1');
CustomEase.create('countOut', '0.33,1,0.68,1');
const IMG = window.__IMG;
const FORM_ENDPOINT = 'https://api.web3forms.com/submit';
const SITE_URL = 'https://dub13-creator.github.io/maboiteaucarre/'; /* à remplacer par https://maboiteaucarre.pro/ une fois le domaine branché */
/* Prochain jour ouvré, à l'heure du créneau demandé (heure de Paris) : sert aux liens « Ajouter à l'agenda » du mail */
function rdvLinks(d) {
  const t = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date()).split('-').map(Number);
  const day = new Date(Date.UTC(t[0], t[1] - 1, t[2]));
  do { day.setUTCDate(day.getUTCDate() + 1); } while ([0, 6].includes(day.getUTCDay()));
  const [h, m] = ({ 'Matin': [9, 0], 'Midi': [12, 30] }[d.creneau]) || [17, 0];
  const pad = n => String(n).padStart(2, '0');
  const ymd = `${day.getUTCFullYear()}${pad(day.getUTCMonth() + 1)}${pad(day.getUTCDate())}`;
  const st = `${ymd}T${pad(h)}${pad(m)}00`, en = `${ymd}T${pad(h)}${pad(m + 15)}00`;
  const iso = x => `${x.slice(0, 4)}-${x.slice(4, 6)}-${x.slice(6, 8)}T${x.slice(9, 11)}:${x.slice(11, 13)}:00`;
  const title = `Appel découverte : ${d.prenom} ${d.nom}`;
  const info = `${d.prenom} ${d.nom} · ${d.activite}\nTél. ${d.telephone}\n${d.email}\nCréneau demandé : ${d.creneau}\nScore ${d.score}/15 : ${d.niveau}`;
  const q = o => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return {
    google: 'https://calendar.google.com/calendar/render?' + q({ action: 'TEMPLATE', text: title, dates: `${st}/${en}`, ctz: 'Europe/Paris', details: info }),
    outlook: 'https://outlook.live.com/calendar/0/deeplink/compose?' + q({ path: '/calendar/action/compose', rru: 'addevent', subject: title, startdt: iso(st), enddt: iso(en), body: info }),
    ical: SITE_URL + 'rdv.html#' + q({ t: title, s: st, e: en, d: info }),
    quand: `${day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}, ${h}h${pad(m)} (modifiable dans l'agenda)`,
  };
}
const FORM_KEY = 'a1a23223-c625-42e8-965f-f692bf02b008'; /* clé publique Web3Forms : elle ne permet que d'envoyer des demandes vers l'e-mail de Ma boîte au carré */

/* ---------- données du questionnaire (textes inchangés) ---------- */
const Q = [
  {t:"Où sont vos factures et documents aujourd'hui ?", h:"soyez sincère", o:[["Classés dans un système clair",3],["Rangés en partie",2],["Répartis un peu partout",1],["En piles à trier",0]]},
  {t:"Quand votre comptable vous demande des pièces…", h:"on y est tous passés", o:[["Je les envoie dans la journée",3],["Je les retrouve en quelques jours",2],["Je cherche longtemps",1],["Je repousse à plus tard",0]]},
  {t:"Combien de temps passez-vous sur l'administratif chaque semaine ?", h:"à peu près", o:[["Moins d'1 heure",3],["1 à 3 heures",2],["3 à 6 heures",1],["Plus de 6 heures",0]]},
  {t:"Et vos documents des années passées ?", h:"les archives", o:[["Archivés, datés et étiquetés",3],["Rangés mais sans étiquettes",2],["Entassés dans des cartons",1],["Je ne sais plus où ils sont",0]]},
  {t:"Retrouver un devis ou un contrat vous prend…", h:"chronomètre en main", o:[["Moins de 2 minutes",3],["5 à 10 minutes",2],["Plus de 10 minutes",1],["Parfois, je ne le retrouve pas",0]]},
  {t:"Ce que vous aimeriez le plus, c'est…", h:"dernière question", prio:true, o:[["Retrouver mes documents facilement","docs"],["Être à jour avec mon comptable","compta"],["Gagner du temps chaque semaine","temps"],["Mettre en place une méthode durable","methode"]]}
];
const PRIO = {
  docs:["Retrouver vos documents","Un classement par rubriques, des classeurs étiquetés et un plan de rangement que toute votre équipe comprend."],
  compta:["Être à jour avec votre comptable","Un circuit simple pour rassembler les pièces chaque mois et les envoyer à temps."],
  temps:["Gagner du temps chaque semaine","Les tâches répétitives prises en charge, avec un suivi d'une ou deux journées par semaine."],
  methode:["Une méthode qui dure","Des règles de classement simples, écrites pour votre activité, que vous gardez ensuite sans moi."]
};
const LEVELS = [
  {min:0,max:6,title:"Votre administratif est à remettre au carré.",text:"Rien de grave : c'est exactement ce que je fais. Quelques jours bien organisés suffisent pour tout trier, classer et archiver, puis repartir sur une base saine.",offer:"La remise au carré, sur devis forfaitaire après une visite."},
  {min:7,max:11,title:"Vous êtes sur la bonne voie.",text:"Les bases sont là, mais il manque une méthode pour que tout reste en place. Une remise au carré ciblée, puis un suivi léger, vous ferait gagner du temps chaque semaine.",offer:"Une remise au carré ciblée, puis un suivi à votre rythme."},
  {min:12,max:15,title:"Votre administratif est presque au carré.",text:"Vous avez de bons réflexes. Pour les garder dans la durée sans y passer vos soirées, un suivi d'une ou deux journées par semaine peut prendre le relais.",offer:"Le suivi, sur place ou à distance."}
];
const CREN = {'Matin':'le matin','Midi':'le midi',"Fin d'après-midi":"en fin d'après-midi"};

/* ---------- petits composants ---------- */
const Check = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l5 5L19.5 7"/></svg>;
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>;
const words = (t) => t.split(' ').flatMap((w, i) => [i ? ' ' : null, <span key={i} className="sr-w" aria-hidden="true">{w}</span>]);

/* découpe en mots masqués (port de React Bits « SplitText ») : le texte reste identique, chaque mot monte de son masque */
const plain = n => typeof n === 'string' ? n : Array.isArray(n) ? n.map(plain).join('') : n && n.props ? plain(n.props.children) : '';
const splitNodes = (n, k = 'a') => typeof n === 'string'
  ? n.split(/(\s+)/).filter(Boolean).map((w, i) => /^\s+$/.test(w) ? ' ' : <span key={k + i} className="sp-w" aria-hidden="true"><span className="sp-i">{w}</span></span>)
  : Array.isArray(n) ? n.flatMap((c, i) => splitNodes(c, k + i + '.'))
  : n && n.props ? React.cloneElement(n, { key: k }, splitNodes(n.props.children, k + 'c')) : n;
const Split = ({ as: T = 'h2', children, ...rest }) => <T aria-label={plain(children)} {...rest}>{splitNodes(children)}</T>;

/* portage de React Bits « SpotlightCard » : même dégradé, même lissage, liseré lumineux, souris uniquement */
const spotFalloff = (color, softness) => {
  const soft = Math.min(1, Math.max(0, softness)), core = (1 - soft) ** 1.5 * .85;
  const stop = (a, at) => `color-mix(in srgb, ${color} ${(a * 100).toFixed(2)}%, transparent) ${(at * 100).toFixed(2)}%`;
  const list = [stop(1, 0)];
  for (let i = 0; i <= 14; i++) { const t = core + ((1 - core) * i) / 14, g = (t - core) / (1 - core), sm = 1 - g * g * (3 - 2 * g), glow = Math.exp(-4.6 * g * g) * (1 - g ** 6); list.push(stop(sm + (glow - sm) * soft, t)); }
  return list.join(', ');
};
function Spot({ main, children }) {
  const card = useRef(), light = useRef(), edge = useRef();
  return <div ref={card} className={'offer spot' + (main ? ' main' : '')}><span ref={light} className="sc-light" aria-hidden="true" />{children}<span ref={edge} className="sc-edge" aria-hidden="true" /></div>;
}

/* FAQ : opacité (+ 4 px) courte ; en « réduire les animations », opacité seule */
function Faq({ q, a, reduce }) {
  const d = useRef(), p = useRef();
  const click = e => {
    e.preventDefault(); const el = d.current, ease = 'cubic-bezier(0.23,1,0.32,1)';
    if (el.open) { p.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: ease }).onfinish = () => { el.open = false; ScrollTrigger.refresh(); }; }
    else { el.open = true; p.current.animate(reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: ease }); ScrollTrigger.refresh(); }
  };
  return <details ref={d}><summary onClick={click}>{q}</summary><p ref={p}>{a}</p></details>;
}

/* ---------- mouvement de la page d'accueil ----------
   Deux versions : normale, et « douce » quand l'appareil demande de réduire les animations
   (déplacements courts, fondus, pas de rideau ni de rotation : moins, mais pas zéro). */
function useLandingMotion(root, gentleMode) {
  useLayoutEffect(() => {
    const $$ = s => gsap.utils.toArray(s, root.current);
    const run = gentle => () => {
      document.documentElement.classList.add('js-motion');
      const k = gentle ? .5 : 1, OUT = 'out', INOUT = 'inOut'; let hsCleanup = null;
      const countUp = () => $$('[data-count]').forEach(dt => {
        const to = +dt.dataset.count, suf = dt.textContent.replace(/^\d+/, ''), o = { v: 0 };
        dt.textContent = '0' + suf;
        gsap.to(o, { v: to, duration: gentle ? 1.2 : 2, ease: 'countOut', onUpdate: () => dt.textContent = Math.round(o.v) + suf });
      });
      /* accueil : un seul lead (le titre), soutiens décalés de façon décroissante, décor en fondu seul */
      const hero = gsap.timeline({ defaults: { ease: OUT } });
      hero.from('.hero .eyebrow', { autoAlpha: 0, duration: .5 }, 0)
        .from('.hero h1', gentle ? { autoAlpha: 0, y: 9, duration: .8 } : { autoAlpha: 1, duration: .01 }, 0)
        .from('.hero .lead', { autoAlpha: 0, y: 10 * k, duration: .7 }, .12)
        .from('.hero .cta', { autoAlpha: 0, y: 6 * k, duration: .6 }, .22);
      if (gentle) hero.from('.strip .shot', { autoAlpha: 0, y: 10, duration: .6 }, .3);
      else hero.fromTo('.strip .shot', { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .6, ease: INOUT, clearProps: 'clipPath' }, .3);
      hero.from('.statcard', { autoAlpha: 0, y: 12 * k, duration: .6, onStart: countUp }, .42);

      $$('.sh').forEach(el => gsap.from(el, { autoAlpha: 0, y: gentle ? 8 : 0, duration: .8, ease: OUT, scrollTrigger: { trigger: el, start: 'top 85%', once: true } }));

      /* « Vous vous reconnaissez ? » — React Bits « ScrollReveal » (fade, scrub) */
      const srh = root.current.querySelector('#srh'), sw = $$('#srh .sr-w');
      { const SPAN = .5, GAP = .05, BASE = gentle ? .3 : .1, BLUR = gentle ? 0 : 4, n = sw.length, total = SPAN + (n - 1) * GAP, state = { p: 0 }, last = sw.map(() => -1);
        const paint = () => { const at = state.p * total; sw.forEach((w, i) => { const t = Math.min(1, Math.max(0, (at - i * GAP) / SPAN)); if (t === last[i]) return; last[i] = t;
          w.style.opacity = t >= 1 ? '' : (BASE + (1 - BASE) * t).toFixed(3); w.style.filter = (t < 1 && BLUR) ? `blur(${(BLUR * (1 - t)).toFixed(2)}px)` : ''; }); };
        sw.forEach(w => w.style.willChange = 'opacity'); paint();
        if (!gentle) gsap.fromTo(srh, { transformOrigin: '0% 50%', rotate: 3 }, { rotate: 0, ease: 'none', scrollTrigger: { trigger: srh, start: 'top bottom', end: 'clamp(bottom bottom)', scrub: true } });
        gsap.to(state, { p: 1, ease: 'none', onUpdate: paint, scrollTrigger: { trigger: srh, start: () => `top bottom-=${.2 * Math.min(srh.offsetHeight, innerHeight)}`, end: 'clamp(bottom bottom)', scrub: true } });
      }

      const group = (sel, y) => { const items = $$(sel); if (!items.length) return;
        gsap.from(items, { autoAlpha: 0, y: y * k, duration: .7, ease: OUT, stagger: gentle ? 0 : { amount: .32, ease: 'power2.out' }, scrollTrigger: { trigger: items[0], start: 'top 88%', once: true } }); };
      if (gentle) { group('#reco .cell', 14); group('#methode .cell', 14); group('.offers .offer', 18); }
      $$(gentle ? '.after,.also,.final' : '.after,.also').forEach(el => gsap.from(el, { autoAlpha: 0, y: 10 * k, duration: .7, ease: OUT, scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
      $$('.steps .shot, .about .shot').forEach(el => gentle
        ? gsap.from(el, { autoAlpha: 0, y: 10, duration: .6, ease: OUT, scrollTrigger: { trigger: el, start: 'top 85%', once: true } })
        : gsap.fromTo(el, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .6, ease: INOUT, clearProps: 'clipPath', scrollTrigger: { trigger: el, start: 'top 82%', once: true } }));
      if (!gentle) {
        /* — version complète — */
        const sp = (sel, vars, st) => $$(sel).length && gsap.fromTo(`${sel} .sp-i`, { yPercent: 115, rotate: 5 }, { yPercent: 0, rotate: 0, duration: .9, ease: OUT, stagger: .045, ...vars, ...(st ? { scrollTrigger: st } : {}) });
        $$('.hero h1').length && gsap.fromTo('.hero h1 .sp-i', { yPercent: 115, rotate: 6 }, { yPercent: 0, rotate: 0, duration: 1, ease: OUT, stagger: .07, delay: .05 });
        $$('.sh h2, .about h2, .final h2').forEach(h => { if (h.id === 'srh') return; gsap.fromTo(h.querySelectorAll('.sp-i'), { yPercent: 115, rotate: 5 }, { yPercent: 0, rotate: 0, duration: .9, ease: OUT, stagger: .05, scrollTrigger: { trigger: h, start: 'top 88%', once: true } }); });
        /* profondeur : le texte d'accueil s'éloigne, les carrés dérivent à des vitesses différentes */
        gsap.to('.hero > div', { y: -70, autoAlpha: .15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        $$('.deco').forEach((d, i) => gsap.fromTo(d, { y: 0, rotate: 0 }, { y: -(120 + i * 70), rotate: innerWidth < 720 ? 0 : (i % 2 ? -1 : 1) * (40 + i * 25), ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 } }));
        gsap.from('.deco', { scale: 0, autoAlpha: 0, duration: .9, ease: 'out', stagger: { amount: .5, from: 'random' }, delay: .3 });
        /* photos : l'image se déplace et se dézoome à l'intérieur de son cadre */
        $$('.shot img').forEach(im => { const ab = !!im.closest('.about'); gsap.set(im, { scale: ab ? 1.06 : 1.22 }); gsap.fromTo(im, { yPercent: ab ? -2 : -9 }, { yPercent: ab ? 2 : 9, scale: ab ? 1.02 : 1.08, ease: 'none', scrollTrigger: { trigger: im.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } }); });
        /* cartes « vous vous reconnaissez » : entrent de côté, en alternance */
        $$('#reco .cell').forEach((c, i) => gsap.from(c, { x: i % 2 ? 90 : -90, rotate: i % 2 ? 3 : -3, autoAlpha: 0, scale: .94, duration: 1, ease: OUT, scrollTrigger: { trigger: c, start: 'top 90%', once: true } }));
        if (!(innerWidth >= 900 && innerHeight >= 700)) $$('#methode .cell').forEach((c, i) => gsap.from(c, { y: 70 + i * 18, rotate: (i % 2 ? 2 : -2), autoAlpha: 0, duration: .95, ease: OUT, scrollTrigger: { trigger: c, start: 'top 92%', once: true } }));
        $$('.offers .offer').forEach((c, i) => gsap.from(c, { y: 90, scale: .92, autoAlpha: 0, duration: 1, ease: OUT, delay: i * .12, scrollTrigger: { trigger: '.offers', start: 'top 85%', once: true } }));
        gsap.from('.final', { scale: .9, autoAlpha: 0, duration: 1, ease: OUT, scrollTrigger: { trigger: '.final', start: 'top 92%', once: true } });
        /* photo d'accueil : le cadre grandit pendant que l'on arrive dessus ; la carte de chiffres entre de côté */
        gsap.fromTo('.strip .shot', { scale: .8 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.strip', start: 'top 98%', end: 'top 38%', scrub: .6 } });
        gsap.fromTo('.statcard', innerWidth >= 720 ? { x: 90 } : { y: 36 }, { x: 0, y: 0, ease: 'none', scrollTrigger: { trigger: '.strip', start: 'top 98%', end: 'top 45%', scrub: .6 } });
        /* « Quatre gestes » : la section reste en place, les cartes défilent de côté (grand écran seulement) */
        if (innerWidth >= 900 && innerHeight >= 700) {
          const sec = root.current.querySelector('#methode'), wrap = sec.querySelector('.cells');
          wrap.classList.add('hs'); hsCleanup = () => wrap.classList.remove('hs');
          gsap.to(wrap, { x: () => -Math.max(0, wrap.scrollWidth - wrap.parentNode.clientWidth), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top+=72', end: () => '+=' + Math.max(400, wrap.scrollWidth - wrap.parentNode.clientWidth + 200), pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1, refreshPriority: -1 } });
        }
      }
      $$('.steps li').forEach(li => ScrollTrigger.create({ trigger: li, start: 'top 62%', end: 'bottom 38%', toggleClass: 'on' }));
      gsap.from($$('.about > div:last-child > *'), { autoAlpha: 0, y: 12 * k, duration: .7, ease: OUT, stagger: gentle ? 0 : { amount: .3, ease: 'power2.out' }, scrollTrigger: { trigger: '.about', start: 'top 75%', once: true } });
      gsap.from('.marquee', { autoAlpha: 0, y: 14 * k, duration: .7, ease: OUT, scrollTrigger: { trigger: '.marquee', start: 'top 92%', once: true } });
      gsap.from($$('.faq details'), { autoAlpha: 0, y: 10 * k, duration: .6, ease: OUT, stagger: gentle ? 0 : { amount: .25, ease: 'power2.out' }, scrollTrigger: { trigger: '.faq', start: 'top 85%', once: true } });
      return () => { hsCleanup && hsCleanup(); sw.forEach(w => { w.style.opacity = ''; w.style.filter = ''; w.style.willChange = ''; }); document.documentElement.classList.remove('js-motion'); };
    };
    let cleanup; const ctx = gsap.context(() => { cleanup = run(gentleMode)(); }, root);
    /* les positions de départ sont recalculées dès que la page change de hauteur (polices, images, redimensionnement) */
    let rt; const refresh = () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 120); };
    refresh(); document.fonts && document.fonts.ready.then(refresh); addEventListener('load', refresh);
    const ro = new ResizeObserver(refresh); ro.observe(document.body);
    root.current.querySelectorAll('img').forEach(im => { if (!im.complete) im.addEventListener('load', refresh, { once: true }); });
    return () => { clearTimeout(rt); ro.disconnect(); removeEventListener('load', refresh); cleanup && cleanup(); ctx.revert(); };
  }, [gentleMode]);
}

/* ---------- accueil ---------- */
const Landing = memo(function Landing({ start, reduce }) {
  const root = useRef();
  useLandingMotion(root, reduce);
  const faq = [
    ['Pour quelles entreprises ?', 'TPE, PME, Associations, artisans, métiers du bâtiment, architectes. Toute entreprise dont l\'administratif a pris du retard peut en profiter.'],
    ['Combien de temps dure une remise au carré ?', 'D\'une semaine à un mois, selon la quantité de documents. Je l\'estime lors de ma visite.'],
    ['Le matériel est-il fourni ?', 'Les classeurs, trieurs et boîtes d\'archives sont à votre charge.'],
    ['Intervenez-vous à distance ?', 'Oui, pour le suivi et la préparation des pièces. La remise au carré se fait dans vos locaux dans un rayon d\'environ 30Km autour de Caen.'],
    ['Et après la remise au carré ?', 'Vous gardez la méthode et vous pouvez continuer seul. Si vous le souhaitez, je propose un suivi d\'une ou deux journées par semaine.']
  ];
  const ic = (d, extra) => <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
  return (
<main id="landing" ref={root}><div className="frame">

<section className="sec hero"><i className="deco d1" aria-hidden="true" /><i className="deco d2" aria-hidden="true" /><i className="deco d3" aria-hidden="true" /><i className="deco d4" aria-hidden="true" /><i className="deco d5" aria-hidden="true" /><div>
  <span className="eyebrow">Remise en ordre administrative pour TPE et PME</span>
  <Split as="h1">Votre administratif remis au carré, pour de bon.</Split>
  <p className="lead">Tri, classement, archivage, méthode, rattrapage de l'arriéré des écritures comptables. Je viens dans vos bureaux dans un rayon de 30km autour de Caen ou je travaille à distance, partout en France, et je prépare les pièces pour votre comptable.</p>
  <div className="cta">
    <button className="btn green" type="button" onClick={start}>Faire mon diagnostic <Arrow /></button>
    <span className="mono">6 questions · 2 minutes</span>
  </div>
</div></section>

<div className="strip rvgrp">
  <div className="shot"><img src={IMG.call} alt="Laure au téléphone à son bureau, un carnet Sur place / à distance ouvert devant elle" /></div>
  <div className="statcard">
    <span className="eyebrow">En chiffres</span>
    <dl><div><dt data-count="20">20 ans</dt><dd>d'expérience administrative</dd></div><div><dt data-count="15">15 min</dt><dd>pour votre appel découverte</dd></div><div><dt>France</dt><dd>partout en France (à distance) ou sur place dans un rayon d'environ 30 Km autour de Caen</dd></div></dl>
  </div>
</div>

<section className="sec trust" id="confiance">
  <div className="sh"><Split>Ils m'ont fait confiance.</Split></div>
  <div className={'marquee' + (reduce ? ' still' : '')}>
    <div className="track">{[0, 1].map(k => <ul key={k} aria-hidden={k === 1 ? 'true' : undefined}>{[0, 1, 2].map(r => [['nr', 'Nouveau Regard'], ['not', 'Notaire'], ['bon', 'Échafaudages Bonvoisin'], ['cc', 'Charlotte Club']].map(([c, n]) => <li key={r + c} className={r ? 'rep' : ''}><i className={'lg ' + c} role={k || r ? undefined : 'img'} aria-label={k || r ? undefined : n} /></li>))}</ul>)}</div>
  </div>
</section>

<section className="sec" id="reco">
  <div className="sh">
    <span className="eyebrow">Vous vous reconnaissez ?</span>
    <h2 id="srh" aria-label="Vous avez créé votre entreprise pour exercer votre métier, pas pour remplir des papiers.">{words('Vous avez créé votre entreprise pour exercer votre métier,')}{' '}<em>{words('pas pour remplir des papiers.')}</em></h2>
  </div>
  <div className="cells c2">
    <div className="cell big"><span className="n">01</span><p>Votre comptable vous réclame des pièces et vous ne savez plus où elles sont.</p></div>
    <div className="cell big"><span className="n">02</span><p>Vos factures sont éparpillées dans trois endroits différents : classeurs, boîte mail, tiroir.</p></div>
    <div className="cell big"><span className="n">03</span><p>Retrouver un devis ou un contrat prend plus de deux minutes.</p></div>
    <div className="cell big"><span className="n">04</span><p>Vous repoussez l'administratif au dimanche soir, ou au mois prochain.</p></div>
  </div>
  <div className="after">
    <button className="btn green" type="button" onClick={start}>Mesurer où j'en suis</button>
    <span className="mono">Je range, j'organise, vous respirez.</span>
  </div>
</section>

<section className="sec" id="methode">
  <div className="sh">
    <span className="eyebrow">Ce que je fais pour vous</span>
    <Split>Quatre gestes, <em>une méthode que vous gardez.</em></Split>
    <p className="sub">Je mets en place un système simple, adapté à votre façon de travailler, afin que tout reste en ordre dans le temps.</p>
  </div>
  <div className="cells c4">
    <div className="cell">{ic(<path d="M4 6h16M4 12h10M4 18h16"/>)}<h3>Tri</h3><p>Chaque document est sorti, regardé, trié. Ce qui compte reste, le reste s'en va.</p></div>
    <div className="cell">{ic(<><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="6" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/></>)}<h3>Classement</h3><p>Perforation, classeurs étiquetés, rubriques claires : vous retrouvez tout en deux minutes.</p></div>
    <div className="cell">{ic(<><rect x="3" y="5" width="18" height="4" rx="1"/><path d="M5 9v10h14V9M10 13h4"/></>)}<h3>Archivage</h3><p>Les années passées sont datées, mises en boîtes et rangées à leur place.</p></div>
    <div className="cell">{ic(<><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.2l2.5 2.6 4.5-5.3"/></>)}<h3>Méthode</h3><p>Une façon simple de classer au quotidien, pensée pour votre activité.</p></div>
  </div>
  <div className="also">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7"/></svg>
    <span>Je rassemble vos pièces comptables pour les envoyer à votre comptable.</span>
  </div>
</section>

<section className="sec" id="deroule">
  <div className="steps">
    <div className="shot"><img src={IMG.trays} alt="Laure prépare les pièces d'un client : une boîte Pour le comptable, une boîte À classer, des notes repositionnables et une calculatrice" /></div>
    <div>
      <div className="sh" style={{marginBottom:28}}><span className="eyebrow">Comment ça se passe</span><Split>De l'appel au bureau en ordre.</Split></div>
      <ol>
        <li><div><h3>Appel découverte</h3><p>15 minutes pour comprendre votre situation et voir si je peux vous aider.</p></div></li>
        <li><div><h3>Visite sur place</h3><p>Je passe voir vos bureaux et j'évalue la quantité de travail.</p></div></li>
        <li><div><h3>Devis forfaitaire</h3><p>Un prix global sur mesure, sans tarif horaire à compter. <b>Contactez-moi pour un devis personnalisé.</b></p></div></li>
        <li><div><h3>Remise au carré</h3><p>J'interviens dans vos locaux, d'une semaine à un mois selon le volume.</p></div></li>
        <li><div><h3>Suivi, si vous le souhaitez</h3><p>Une ou deux journées par semaine pour garder votre administratif à jour.</p></div></li>
      </ol>
    </div>
  </div>
</section>

<section className="sec" id="formules">
  <div className="sh"><span className="eyebrow">Les formules</span><Split>Ponctuel ou régulier, <em>vous choisissez.</em></Split></div>
  <div className="offers">
    <Spot main>
      <h3>La remise au carré</h3>
      <p className="d">L'intervention qui remet tout en ordre, sur place, avec un devis forfaitaire après une visite.</p>
      <ul>
        {['Tri, perforation et mise en classeurs','Classement et archivage','Méthode de travail simple, que vous gardez','Réorganisation du bureau si besoin','Pièces comptables prêtes pour votre comptable'].map(t => <li key={t}><Check />{t}</li>)}
      </ul>
      <p className="price">Sur devis personnalisé</p>
    </Spot>
    <Spot>
      <h3>Le suivi</h3>
      <p className="d">Pour garder votre administratif à jour, semaine après semaine.</p>
      <ul>
        {['Une ou deux journées par semaine','Sur place ou à distance, demi-journée possible','Préparation des pièces pour le comptable','Tâches administratives courantes'].map(t => <li key={t}><Check />{t}</li>)}
      </ul>
      <p className="price">Vous arrêtez quand vous voulez</p>
    </Spot>
  </div>
</section>

<section className="sec">
  <div className="about">
    <div className="shot"><img src={IMG.door} alt="Laure à l'entrée d'un bureau, un classeur vert Factures sous le bras" /></div>
    <div>
      <span className="eyebrow">Qui je suis</span>
      <Split style={{margin:'20px 0 26px'}}>Je connais les deux côtés du bureau.</Split>
      <p>Depuis 20 ans, je travaille dans la gestion administrative : secrétaire comptable, assistante comptable, assistante de gestion, et aujourd'hui dirigeante d'entreprise.</p>
      <p>Je sais ce que votre comptable attend, et je sais ce que c'est de gérer son entreprise avec peu de temps. Je vous propose une méthode simple, adaptée à votre façon de travailler, pas l'inverse.</p>
      <div className="specs">
        <div><span>Expérience</span><span>20 ans</span></div>
        <div><span>Accompagnées</span><span>TPE - PME<br />et études notariales</span></div>
        <div><span>Où</span><span>Partout en France</span></div>
      </div>
    </div>
  </div>
</section>

<section className="sec" id="faq">
  <div className="sh"><span className="eyebrow">Questions fréquentes</span><Split>Ce que l'on me demande souvent.</Split></div>
  <div className="faq">{faq.map(([q, a]) => <Faq key={q} q={q} a={a} reduce={reduce} />)}</div>
</section>

<div className="final-wrap"><div className="final">
  <div><span className="mono">Votre administratif vous pèse ? Parlons-en.</span><Split>Faites le point en 2 minutes.</Split></div>
  <button className="btn" type="button" onClick={start}>Faire mon diagnostic <Arrow /></button>
</div></div>

</div></main>
  );
});

/* ---------- questionnaire ---------- */
function Quiz({ idx, answers, pick, back, reduce, dir }) {
  const q = Q[idx], box = useRef(), title = useRef();
  useLayoutEffect(() => {
    title.current.focus({ preventScroll: true });
    const k = reduce ? .6 : 1;
    const from = dir ? { x: 48 * dir * k } : { y: 24 * k };
    const a = gsap.fromTo(title.current, { autoAlpha: 0, ...from }, { autoAlpha: 1, x: 0, y: 0, duration: .3, ease: 'out' });
    const b = gsap.fromTo(box.current.children, { autoAlpha: 0, ...from }, { autoAlpha: 1, x: 0, y: 0, duration: .2, ease: 'out', stagger: reduce ? 0 : { amount: .08, ease: 'power2.out' } });
    return () => { a.kill(); b.kill(); };
  }, [idx]);
  return (
<main className="view" id="quiz"><div className="wrap">
  <div className="prog" aria-hidden="true">{Q.map((_, i) => <i key={i} className={i <= idx ? 'on' : ''} />)}</div>
  <div className="q-meta"><span className="eyebrow">{`Question ${idx + 1} sur ${Q.length}`}</span><span className="hand">{q.h}</span></div>
  <h2 className="q-title" id="qtitle" tabIndex={-1} ref={title}>{q.t}</h2>
  <div className="opts" ref={box} role="group" aria-labelledby="qtitle">
    {q.o.map(([label], i) => <button key={idx + '-' + i} type="button" className="opt" aria-pressed={answers[idx] === i ? 'true' : 'false'} onClick={() => pick(i)}><span className="box" /><span>{label}</span></button>)}
  </div>
  {idx > 0 && <button className="back" type="button" onClick={back}>← Question précédente</button>}
</div></main>
  );
}

/* ---------- résultat + formulaire ---------- */
async function saveLead(data) {
  if (FORM_ENDPOINT) {
    const L = rdvLinks(data);
    const body = {
      access_key: FORM_KEY, subject: `🟢 Nouvelle demande d'appel : ${data.prenom} ${data.nom} (${data.activite})`, from_name: 'Ma boîte au carré', botcheck: '',
      '1. Prospect': `${data.prenom} ${data.nom}`,
      '2. Téléphone': data.telephone,
      '3. E-mail': data.email,
      '4. Activité': data.activite,
      '5. Créneau de rappel souhaité': data.creneau,
      '6. Résultat du diagnostic': `${data.score} sur 15 : ${data.niveau}`,
      '7. Texte affiché au prospect': `${data.texte}\n\nSa priorité : ${data.priorite}\n${data.prioTexte}\n\nFormule conseillée : ${data.offre}`,
      '8. Ajouter à Google Agenda': L.google,
      '9. Ajouter à Outlook / Hotmail Agenda': L.outlook,
      '10. Ajouter à Apple / iCal': L.ical,
      '11. Rendez-vous proposé': L.quand,
    };
    const r = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) throw new Error('endpoint');
    return 'sent';
  }
  try {
    const db = await (window.claude?.use ? window.claude.use('db') : null);
    if (db) { await db.collection('leads').add(data); return 'stored'; }
  } catch (e) { /* repli ci-dessous */ }
  return 'demo';
}
function Result({ res, done, reduce }) {
  const [pol, setPol] = useState(false);
  const gauge = useRef(), title = useRef(), sc = useRef();
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  useLayoutEffect(() => {
    title.current.focus({ preventScroll: true });
    const g = gsap.from(gauge.current.querySelectorAll('i.on'), { scale: reduce ? .96 : .9, autoAlpha: 0, duration: .25, ease: 'out', stagger: reduce ? 0 : { amount: .12, ease: 'power2.out' } });
    const o = { v: 0 }, n = gsap.to(o, { v: res.score, duration: reduce ? .4 : 1, ease: 'countOut', delay: .15, onUpdate: () => { if (sc.current) sc.current.textContent = Math.round(o.v); } });
    return () => { g.kill(); n.kill(); };
  }, []);
  const on = Math.max(0, Math.min(5, Math.round(res.score / 3)));
  const submit = async e => {
    e.preventDefault(); const f = e.target; setErr('');
    const name = f.prenom.value.trim(), nom = f.nom.value.trim(), job = f.activite.value.trim(), tel = f.telephone.value.trim(), mail = f.email.value.trim();
    if (!name || !nom || !job) return setErr('Indiquez votre prénom, votre nom et votre activité.');
    if (tel.replace(/\D/g, '').length < 9) return setErr('Indiquez un numéro de téléphone valide pour que je puisse vous rappeler.');
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setErr("Indiquez une adresse e-mail valide.");
    if (!f.ok.checked) return setErr('Cochez la case pour que je puisse vous recontacter.');
    setBusy(true);
    const data = { prenom: name, nom, activite: job, telephone: tel, email: mail, creneau: f.creneau.value, score: res.score, niveau: res.niveau, priorite: res.priorite, texte: res.text, prioTexte: res.prioText, offre: res.offer, createdAt: Date.now() };
    try { const r = await saveLead(data); done({ name, creneau: data.creneau, status: r }); }
    catch (x) { setErr("L'envoi n'a pas abouti. Réessayez dans un instant."); setBusy(false); }
  };
  return (
<main className="view" id="result"><div className="wrap">
  <span className="eyebrow">Votre résultat</span>
  <h2 id="rtitle" style={{margin:'18px 0 0'}} tabIndex={-1} ref={title}>{res.niveau}</h2>
  <div className="gauge" ref={gauge} aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <i key={i} className={i < on ? 'on' : ''} />)}</div>
  <p className="score">Score d'organisation : <span ref={sc}>{res.score}</span> sur 15</p>
  <div className="res-card">
    <p>{res.text}</p>
    <h3>{`Votre priorité : ${res.priorite}`}</h3>
    <ul><li><Check /><span>{res.prioText}</span></li><li><Check /><span>{`Formule conseillée : ${res.offer}`}</span></li></ul>
  </div>

  <form id="lead" noValidate onSubmit={submit}>
    <div>
      <span className="eyebrow">Étape suivante</span>
      <h2 style={{fontSize:'clamp(1.6rem,3.6vw,2.3rem)',marginTop:16}}>Réservez votre appel découverte de 15 minutes.</h2>
      <p className="sub" style={{marginTop:12}}>Laissez-moi vos coordonnées, je vous rappelle pour comprendre votre situation. Sans engagement.</p>
    </div>
    <div className="row">
      <label htmlFor="f-name">Prénom<input id="f-name" name="prenom" type="text" autoComplete="given-name" required /></label>
      <label htmlFor="f-nom">Nom<input id="f-nom" name="nom" type="text" autoComplete="family-name" required /></label>
    </div>
    <div className="row">
      <label htmlFor="f-tel">Téléphone<input id="f-tel" name="telephone" type="tel" autoComplete="tel" inputMode="tel" required /></label>
      <label htmlFor="f-mail">E-mail<input id="f-mail" name="email" type="email" autoComplete="email" required /></label>
    </div>
    <label htmlFor="f-job">Votre activité<input id="f-job" name="activite" type="text" placeholder="Plombier, architecte, boutique…" required /></label>
    <div className="lbl" role="group" aria-labelledby="slots-l"><span id="slots-l">Quand puis-je vous appeler ?</span>
      <div className="slots">
        <label><input type="radio" name="creneau" value="Matin" defaultChecked /><span>Le matin</span></label>
        <label><input type="radio" name="creneau" value="Midi" /><span>Le midi</span></label>
        <label><input type="radio" name="creneau" value="Fin d'après-midi" /><span>Fin d'après-midi</span></label>
      </div>
    </div>
    <label className="consent" htmlFor="f-ok"><input id="f-ok" name="ok" type="checkbox" required /><span>J'accepte d'être recontacté(e) par Ma boîte au carré au sujet de ma demande. Mes informations ne sont utilisées que pour cela.</span></label>
    <button type="button" className="consent-link" onClick={() => setPol(true)}>Politique de confidentialité</button>
    <p className="err" id="err" role="alert">{err}</p>
    <button className="btn green" type="submit" disabled={busy} style={{justifySelf:'start'}}>Je veux être rappelé(e) <Arrow /></button>
  </form>
  <PolicyDialog open={pol} close={() => setPol(false)} />
</div></main>
  );
}

function Thanks({ info, home }) {
  const t = useRef(); const demo = info.status === 'demo';
  useLayoutEffect(() => { t.current.focus({ preventScroll: true }); }, []);
  return (
<main className="view" id="thanks"><div className="wrap">
  <span className="eyebrow">C'est noté</span>
  <h2 id="tt" style={{margin:'18px 0 18px'}} tabIndex={-1} ref={t}>{`Merci ${info.name} !`}</h2>
  <p className="sub" style={{fontSize:'1.15rem'}}>{demo ? 'Voici ce que verrait votre prospect à la fin du parcours.' : `Votre demande est bien notée. Je vous rappelle ${CREN[info.creneau]} pour notre appel découverte de 15 minutes.`}</p>
  {demo && <div className="demo">Version de démonstration : cette demande n'a pas été transmise. L'envoi sera actif lorsque la page sera publiée sur maboiteaucarre.pro.</div>}
  <div className="res-card">
    <h3>En attendant mon appel</h3>
    <ul>
      <li><Check />Repérez les trois endroits où se trouvent vos documents aujourd'hui.</li>
      <li><Check />Notez la question que votre comptable vous pose le plus souvent.</li>
      <li><Check />Préparez ce qui vous fait le plus perdre de temps : je commencerai par là.</li>
    </ul>
  </div>
  <p style={{marginTop:30}}><button className="btn line sm" type="button" onClick={home}>Retour à l'accueil</button></p>
</div></main>
  );
}

/* ---------- transition de page : une grille de carrés qui se referme puis s'ouvre ---------- */
const COLS = 8, ROWS = 5;
function Wipe({ api }) {
  const box = useRef();
  useEffect(() => {
    api.current = cb => {
      const t = box.current.children;
      const grid = { each: .014, from: 'center', grid: [ROWS, COLS] };
      gsap.timeline()
        .fromTo(t, { scale: 0 }, { scale: 1.04, duration: .3, ease: 'out', stagger: grid })
        .call(cb)
        .to(t, { scale: 0, duration: .3, ease: 'inOut', stagger: grid }, '+=.04');
    };
  }, []);
  return <div ref={box} aria-hidden="true" className="wipe">{Array.from({ length: COLS * ROWS }, (_, i) => <i key={i} />)}</div>;
}
/* ---------- application ---------- */

/* — pages juridiques — les champs surlignés « à compléter » sont à remplacer avant la mise en ligne — */
const Todo = ({ children }) => <mark className="todo">[à compléter : {children}]</mark>;
const MENTIONS = () => (<>
  <h3>Éditeur du site</h3>
  <p>Le site maboiteaucarre.pro est édité par la société <strong>DUB13</strong>, société par actions simplifiée (SAS) au capital de <strong>1 000</strong> €, dont le siège social est situé <strong>24 rue des Tennis, 14470 Graye-sur-Mer</strong>, immatriculée au registre du commerce et des sociétés de <strong>Caen</strong> sous le numéro <strong>932 089 675 R.C.S. Caen</strong>. Numéro de TVA intracommunautaire : <strong>FR82 932 089 675</strong>.</p>
  <p>« Ma boîte au carré » est le nom commercial sous lequel DUB13 propose ses services de remise en ordre administrative.</p>
  <p>Contact : <a href="mailto:jeuxdub@gmail.com">jeuxdub@gmail.com</a> · <a href="tel:+33617498979">06 17 49 89 79</a></p>
  <p>Directeur de la publication : Cédric Dubois.</p>
  <h3>Hébergeur</h3>
  <p>Le site est hébergé par <strong>GitHub, Inc.</strong>, 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis (service GitHub Pages) · <a href="https://github.com" target="_blank" rel="noopener">github.com</a>.</p>
  <h3>Public concerné</h3>
  <p>Les services présentés sur ce site s'adressent exclusivement à des professionnels (entreprises, associations, études notariales, artisans, professions libérales).</p>
  <h3>Propriété intellectuelle</h3>
  <p>Les textes, photographies, illustrations et éléments graphiques de ce site sont la propriété de DUB13 ou utilisés avec l'autorisation de leurs titulaires. Les noms et logos de tiers cités appartiennent à leurs propriétaires respectifs ; les logos de clients présentés dans la rubrique « Ils m'ont fait confiance » le sont avec l'accord de ces derniers. Certaines images de ce site sont des photographies retouchées ou des illustrations générées avec l'aide d'une intelligence artificielle. Toute reproduction ou réutilisation sans autorisation écrite préalable est interdite.</p>
  <p>Les polices de caractères Onest et JetBrains Mono sont distribuées sous licence SIL Open Font License 1.1 et intégrées directement au site.</p>
  <h3>Responsabilité</h3>
  <p>DUB13 s'efforce de fournir des informations exactes et à jour, sans pouvoir garantir leur exhaustivité. Le diagnostic proposé sur ce site est un outil d'orientation : il ne remplace ni un conseil comptable, juridique ou fiscal, ni un devis.</p>
  <h3>Données personnelles</h3>
  <p>Le traitement des données personnelles est détaillé dans la <a href="#confidentialite" data-legal="confidentialite">politique de confidentialité</a>.</p>
  <h3>Droit applicable</h3>
  <p>Le présent site est soumis au droit français.</p>
</>);
const CONFIDENTIALITE = ({ dialog }) => (<>
  <h3>Qui est responsable de vos données ?</h3>
  <p>DUB13, SAS (nom commercial : Ma boîte au carré), dont les coordonnées figurent dans les {dialog ? 'mentions légales (en bas de page)' : <a href="#mentions-legales" data-legal="mentions">mentions légales</a>}. Pour toute question sur vos données : <a href="mailto:jeuxdub@gmail.com">jeuxdub@gmail.com</a>.</p>
  <h3>Quelles données sont collectées ?</h3>
  <p>Le diagnostic se déroule uniquement dans votre navigateur : tant que vous n'envoyez pas le formulaire, aucune de vos réponses n'est transmise ni enregistrée.</p>
  <p>Si vous demandez un appel découverte, je collecte : votre prénom, votre nom, votre activité, votre numéro de téléphone, votre adresse e-mail, le créneau de rappel que vous préférez, ainsi que le résultat de votre diagnostic (score, niveau et priorité).</p>
  <h3>Pourquoi, et sur quelle base légale ?</h3>
  <p>Ces données servent uniquement à vous rappeler pour l'appel découverte de 15 minutes et à préparer cet échange. Elles sont traitées sur la base de votre consentement, que vous donnez en cochant la case du formulaire et que vous pouvez retirer à tout moment. Elles ne sont ni vendues, ni utilisées pour de la publicité.</p>
  <h3>Qui y a accès ?</h3>
  <p>Seule DUB13 y a accès. Pour faire fonctionner le site, elle s'appuie sur deux prestataires techniques : l'hébergeur du site (GitHub, Inc.) et le service en ligne qui transmet les demandes du formulaire par e-mail (Web3Forms). Ces prestataires n'utilisent pas vos données pour leur propre compte.</p>
  <p>L'hébergeur peut enregistrer des données techniques de connexion (adresse IP, date et heure) lorsque vous consultez le site.</p>
  <h3>Transferts hors de l'Union européenne</h3>
  <p>Ces deux prestataires sont des sociétés américaines ou peuvent traiter des données hors de l'Union européenne, notamment aux États-Unis. Ces transferts sont encadrés par les garanties prévues par le RGPD (décision d'adéquation de la Commission européenne ou clauses contractuelles types).</p>
  <h3>Combien de temps sont-elles conservées ?</h3>
  <p>Trois ans à compter de notre dernier échange, puis elles sont supprimées. Si nous travaillons ensemble, les informations nécessaires au contrat sont conservées pendant les durées légales applicables.</p>
  <h3>Quels sont vos droits ?</h3>
  <p>Vous pouvez à tout moment demander l'accès à vos données, leur rectification, leur effacement, la limitation ou l'opposition à leur traitement, leur portabilité, et retirer votre consentement. Écrivez à <a href="mailto:jeuxdub@gmail.com">jeuxdub@gmail.com</a> : une réponse vous est apportée dans un délai d'un mois.</p>
  <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL : <strong>cnil.fr</strong> · Commission nationale de l'informatique et des libertés, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07.</p>
  <h3>Cookies et traceurs</h3>
  <p>Ce site ne dépose aucun cookie et n'utilise ni outil de mesure d'audience, ni publicité, ni réseau social, ni service externe de polices ou de vidéos. C'est pourquoi il n'affiche pas de bandeau de consentement aux cookies.</p>
  <h3>Mises à jour</h3>
  <p>Dernière mise à jour : 6 novembre 2026.</p>
</>);

function PolicyDialog({ open, close }) {
  const d = useRef();
  useEffect(() => { const el = d.current; if (!el) return; if (open && !el.open) el.showModal(); if (!open && el.open) el.close(); }, [open]);
  return (
<dialog ref={d} className="policy" onClose={close} onClick={e => { if (e.target === d.current) close(); }} data-lenis-prevent>
  <div className="legal"><div className="pol-head"><h2>Politique de confidentialité</h2><button type="button" className="btn line sm" onClick={close}>Fermer</button></div>
  <div className="prose"><CONFIDENTIALITE dialog /></div></div>
</dialog>);
}
function Legal({ page, home }) {
  const t = useRef();
  useLayoutEffect(() => { t.current && t.current.focus({ preventScroll: true }); }, [page]);
  const M = page === 'mentions';
  return (
<main className="view legal" id={M ? 'mentions' : 'confidentialite'}><div className="wrap">
  <a className="back" href="#" onClick={home}>← Retour à l'accueil</a>
  <h1 tabIndex={-1} ref={t}>{M ? 'Mentions légales' : 'Politique de confidentialité'}</h1>
  <div className="prose">{M ? <MENTIONS /> : <CONFIDENTIALITE />}</div>
</div></main>);
}

function App() {
  const sys = useRef(matchMedia('(prefers-reduced-motion: reduce)').matches).current;
  const [full, setFull] = useState(false);
  const reduce = sys && !full;
  const [view, setView] = useState('landing');
  const [idx, setIdx] = useState(0), [answers, setAnswers] = useState([]);
  const [res, setRes] = useState(null), [info, setInfo] = useState(null);
  const lenis = useRef(null), bar = useRef(), pending = useRef(null), dir = useRef(0), lock = useRef(false);

  /* barre de progression */
  useEffect(() => {
    const ui = () => { const max = document.documentElement.scrollHeight - innerHeight; bar.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`; };
    addEventListener('scroll', ui, { passive: true });
    return () => removeEventListener('scroll', ui);
  }, []);
  /* défilement amorti (un seul moteur : le ticker GSAP) — créé une seule fois, dès que le mouvement complet est actif */
  useEffect(() => {
    if (reduce || lenis.current || !window.Lenis) return;
    const l = lenis.current = new window.Lenis({ duration: 1.1, smoothWheel: true, syncTouch: false });
    l.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => l.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  }, [reduce]);

  const wipeApi = useRef(), busy = useRef(false);
  const go = (name) => {
    if (reduce || !wipeApi.current) { setView(name); return; }
    if (busy.current) { setView(name); return; } busy.current = true;
    wipeApi.current(() => setView(name)); setTimeout(() => { busy.current = false; }, 900);
  };
  useLayoutEffect(() => {
    if (lenis.current) lenis.current.scrollTo(0, { immediate: true, force: true }); else window.scrollTo(0, 0);
    if (view === 'landing' && pending.current) {
      const sel = pending.current; pending.current = null;
      requestAnimationFrame(() => { const t = document.querySelector(sel); if (!t) return; if (lenis.current) lenis.current.scrollTo(t, { offset: -72 }); else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); });
    }
  }, [view]);

  const start = () => { dir.current = 0; lock.current = false; setIdx(0); setAnswers([]); go('quiz'); };
  const anchor = sel => e => { e.preventDefault(); if (view !== 'landing') { pending.current = sel; go('landing'); } else { const t = document.querySelector(sel); if (t) { if (lenis.current) lenis.current.scrollTo(t, { offset: -72 }); else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } } };
  const home = e => { e && e.preventDefault(); go('landing'); };
  useEffect(() => { const h = e => { const a = e.target.closest && e.target.closest('a[data-legal]'); if (a) { e.preventDefault(); go(a.dataset.legal); } }; document.addEventListener('click', h); return () => document.removeEventListener('click', h); });
  const openLegal = page => e => { e.preventDefault(); go(page); };

  const pick = i => {
    if (lock.current) return; lock.current = true;
    const next = answers.slice(); next[idx] = i; setAnswers(next);
    setTimeout(() => {
      dir.current = 1; lock.current = false;
      if (idx < Q.length - 1) setIdx(idx + 1);
      else {
        let score = 0, prio = 'docs';
        Q.forEach((q, n) => { if (!q.prio) score += q.o[next[n]][1]; else prio = q.o[next[n]][1]; });
        const lv = LEVELS.find(l => score >= l.min && score <= l.max);
        setRes({ score, niveau: lv.title, text: lv.text, offer: lv.offer, priorite: PRIO[prio][0], prioText: PRIO[prio][1] });
        go('result');
      }
    }, 220);
  };

  return (<>
    <div className="prog-scroll" ref={bar} />
    <Wipe api={wipeApi} />
    <header className="top"><div className="in">
      <a className="logo" href="#" onClick={home}><i><b /><b /><b /><b /></i><span>Ma boîte<br />au carré</span></a>
      <nav><a href="#methode" onClick={anchor('#methode')}>Ma méthode</a><a href="#deroule" onClick={anchor('#deroule')}>Le déroulé</a><a href="#formules" onClick={anchor('#formules')}>Les formules</a><a href="#faq" onClick={anchor('#faq')}>Questions</a></nav>
      <button className="btn sm" type="button" onClick={start}>Faire mon diagnostic</button>
    </div></header>
    {view === 'landing' && <Landing key={String(reduce)} start={start} reduce={reduce} />}
    {view === 'quiz' && <Quiz idx={idx} answers={answers} pick={pick} back={() => { if (idx > 0 && !lock.current) { dir.current = -1; setIdx(idx - 1); } }} reduce={reduce} dir={dir.current} />}
    {view === 'result' && <Result res={res} reduce={reduce} done={i => { setInfo(i); go('thanks'); }} />}
    {view === 'thanks' && <Thanks info={info} home={home} />}
    {(view === 'mentions' || view === 'confidentialite') && <Legal page={view} home={home} />}
    {sys && <button type="button" className="btn line sm" onClick={() => setFull(f => !f)} style={{position:'fixed',left:16,bottom:16,zIndex:50}}>{full ? 'Animations réduites' : 'Voir les animations complètes'}</button>}
    <footer><span>Ma boîte au carré · DUB13 SAS · maboiteaucarre.pro</span><span>Remise en ordre administrative pour TPE et PME, partout en France</span><nav className="legal-links" aria-label="Informations légales"><a href="#mentions-legales" onClick={openLegal('mentions')}>Mentions légales</a><a href="#confidentialite" onClick={openLegal('confidentialite')}>Politique de confidentialité</a></nav></footer>
  </>);
}
createRoot(document.getElementById('root')).render(<App />);
