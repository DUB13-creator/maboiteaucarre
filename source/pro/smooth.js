/* Défilement amorti intégré (même principe et même interface que Lenis : on / raf / scrollTo),
   embarqué dans la page pour ne dépendre d'aucun serveur externe. Molette uniquement : le tactile reste natif. */
(function(){
  if (window.Lenis) return;
  function Smooth(opts){
    opts = opts || {};
    var self = this, html = document.documentElement;
    this.cbs = []; this.lerp = opts.lerp || 0.1;
    this.current = this.target = window.scrollY; this.animating = false; this.stopped = false;
    html.classList.add('lenis','lenis-smooth');
    function max(){ return Math.max(0, document.documentElement.scrollHeight - innerHeight); }
    this.max = max;
    window.addEventListener('wheel', function(e){
      if (e.ctrlKey || self.stopped) return;
      for (var n = e.target; n && n !== document.body; n = n.parentElement){ if (n.hasAttribute && n.hasAttribute('data-lenis-prevent')) return; }
      var d = e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1);
      if (!d) return;
      e.preventDefault();
      if (!self.animating) self.current = self.target = window.scrollY;
      self.target = Math.min(max(), Math.max(0, self.target + d));
      self.animating = true;
    }, {passive:false});
    window.addEventListener('scroll', function(){
      if (!self.animating) self.current = self.target = window.scrollY;
      self.cbs.forEach(function(cb){ cb({scroll: window.scrollY}); });
    }, {passive:true});
  }
  Smooth.prototype.on = function(ev, cb){ if (ev === 'scroll') this.cbs.push(cb); };
  Smooth.prototype.raf = function(){
    if (!this.animating) return;
    this.current += (this.target - this.current) * this.lerp;
    if (Math.abs(this.target - this.current) < 0.5){ this.current = this.target; this.animating = false; }
    window.scrollTo(0, this.current);
  };
  Smooth.prototype.scrollTo = function(t, o){
    o = o || {};
    var y = typeof t === 'number' ? t : (t && t.getBoundingClientRect ? t.getBoundingClientRect().top + window.scrollY : 0);
    y = Math.min(this.max(), Math.max(0, y + (o.offset || 0)));
    if (o.immediate){ this.animating = false; this.current = this.target = y; window.scrollTo(0, y); return; }
    this.current = window.scrollY; this.target = y; this.animating = true;
  };
  Smooth.prototype.stop = function(){ this.stopped = true; this.animating = false; };
  Smooth.prototype.start = function(){ this.stopped = false; };
  window.Lenis = Smooth;
})();
