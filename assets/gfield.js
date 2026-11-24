(function () {
  var cv = document.getElementById('gfield'); if (!cv) return;
  var x = cv.getContext('2d'), img = new Image(), tile, W = 0, H = 0, cells = [], mx = -1e4, my = -1e4, tx = -1e4, ty = -1e4, G = 19;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  img.src = 'assets/guidify-mark.png';
  function build() {
    if (!img.complete || !img.naturalWidth) return;
    var d = Math.min(window.devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * d; cv.height = H * d; x.setTransform(d, 0, 0, d, 0, 0);
    var narrow = W < 700;
    var cx = narrow ? W * .5 : W * .72, cy = narrow ? H * .27 : H * .5, size = narrow ? Math.min(W * .75, H * .36) : Math.min(H * .74, W * .44);
    var cols = Math.ceil(W / G) + 1, rows = Math.ceil(H / G) + 1, c = document.createElement('canvas');
    c.width = cols; c.height = rows; var g = c.getContext('2d');
    g.drawImage(img, (cx - size / 2 - G / 2) / G, (cy - size / 2 - G / 2) / G, size / G, size / G);
    var al = g.getImageData(0, 0, cols, rows).data; cells = [];
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      var px = i * G + G / 2, py = j * G + G / 2, on = al[(j * cols + i) * 4 + 3] / 255 > .45, r = Math.random();
      var halo = Math.max(0, 1 - Math.hypot(px - cx, py - cy) / (size * .95));
      var b = on ? .26 + .14 * r : (r < .35 + halo * .4 ? .02 + .06 * halo * Math.random() : 0);
      if (!narrow && px < W * .45 && !on) b *= .35;
      if (py < 80) b *= .25;
      if (narrow && py > H * .5) b *= .4;
      cells.push({ px: px, py: py, on: on, b: b, v: 0, ph: Math.random() * 6.3 });
    }
  }
  function frame(t) {
    mx += (tx - mx) * .08; my += (ty - my) * .08; x.clearRect(0, 0, W, H);
    for (var k = 0; k < cells.length; k++) {
      var c = cells[k], h = Math.max(0, 1 - Math.hypot(c.px - mx, c.py - my) / 170); c.v += (h * h - c.v) * .07;
      var a = c.b * (1 + (still ? 0 : .18 * Math.sin(t / 1600 + c.ph))) + c.v * (c.on ? .22 : .12); if (a < .012) continue;
      var s = 11 + c.v * 3; x.globalAlpha = Math.min(.75, a); x.drawImage(tile, c.px - s / 2, c.py - s / 2, s, s);
    }
    x.globalAlpha = 1; requestAnimationFrame(frame);
  }
  img.onload = function () {
    tile = document.createElement('canvas'); tile.width = tile.height = 96;
    tile.getContext('2d').drawImage(img, 0, 0, 96, 96);
    build(); new ResizeObserver(build).observe(cv); requestAnimationFrame(frame);
  };
  var hero = cv.parentElement;
  hero.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; var b = cv.getBoundingClientRect(); tx = e.clientX - b.left; ty = e.clientY - b.top; });
  hero.addEventListener('pointerleave', function () { tx = ty = -1e4; });
})();
