/* Vistro hero: a gravitational-lens number rain, drawn on the visitor's GPU.
   One full-screen triangle, one fragment shader, one tiny digit texture.
   No server work: nothing here ever calls Vercel or Neon. */
(function () {
  "use strict";

  var cv = document.getElementById("gl");
  if (!cv) return;
  var conn = navigator.connection;
  if (conn && conn.saveData) return; // data saver: keep the CSS backdrop only

  var gl = cv.getContext("webgl", {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: "low-power"
  });
  if (!gl) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform vec2 uRes;uniform vec2 uC;uniform float uT;uniform sampler2D uAtlas;",
    "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    // One parallax layer of falling digits.
    "vec3 layer(vec2 p,float S,float speed,float seed,vec3 tint){",
    "  vec2 g=p*S;",
    "  float cid=floor(g.x);",
    "  float rn=h(vec2(cid,seed));",
    "  if(h(vec2(cid,seed+3.))<0.42)return vec3(0.);",
    "  float y=g.y+uT*speed*(0.45+rn);",
    "  float row=floor(y);",
    "  float head=pow(fract(-row*0.083+rn*9.7),3.);",
    "  float digit=floor(h(vec2(cid,row+seed*17.))*10.);",
    "  vec2 f=fract(vec2(g.x,y));",
    "  vec2 uv=vec2((digit+0.06+f.x*0.88)/16.,1.-(0.06+f.y*0.88));",
    "  float a=texture2D(uAtlas,uv).r;",
    "  return tint*a*(0.12+head*1.15);",
    "}",
    "void main(){",
    "  vec2 p=(gl_FragCoord.xy-0.5*uRes)/uRes.y;",
    "  vec2 d=p-uC;float r=length(d);",
    "  float R=0.16;",
    // Light bends around the mass: sample from further out the closer we are.
    "  vec2 sp=uC+d*(1.+(R*R)/(r*r+0.002));",
    "  vec3 col=vec3(0.);",
    "  col+=layer(sp+vec2(0.31,0.),30.,0.55,1.,vec3(0.45,0.38,1.0));",
    "  col+=layer(sp+vec2(0.07,0.),17.,0.95,2.,vec3(0.30,0.85,1.0));",
    "  col+=layer(sp,8.5,1.7,3.,vec3(1.0,0.78,0.95));",
    "  float well=exp(-r*5.);",
    "  col*=1.+2.2*well;",
    // Photon ring with a brighter approaching side.
    "  float rh=0.135;",
    "  float ring=exp(-pow((r-0.158)/0.011,2.));",
    "  float halo=exp(-max(r-0.158,0.)*13.);",
    "  float dop=0.65+0.55*dot(d/(r+1e-4),vec2(-0.93,0.37));",
    "  vec3 rc=mix(vec3(1.0,0.76,0.48),vec3(1.0,0.37,0.78),smoothstep(-0.6,0.9,d.x/(r+1e-4)));",
    "  col*=smoothstep(rh-0.004,rh+0.006,r);",
    "  col+=rc*(ring*1.7+halo*0.30*step(rh,r))*dop;",
    "  vec3 base=vec3(0.020,0.024,0.050)+vec3(0.11,0.07,0.26)*exp(-length(p-uC)*1.9)*0.55;",
    "  col=1.-exp(-(col+base)*1.25);",
    "  gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = compile(gl.VERTEX_SHADER, VS);
  var fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  // Digit atlas: 16 cells of 64px (0-9 used), drawn once with the system font.
  var at = document.createElement("canvas");
  at.width = 1024; at.height = 64;
  var cx = at.getContext("2d");
  cx.fillStyle = "#000"; cx.fillRect(0, 0, 1024, 64);
  cx.fillStyle = "#fff";
  cx.font = "700 46px ui-monospace, Menlo, Consolas, 'DejaVu Sans Mono', monospace";
  cx.textAlign = "center"; cx.textBaseline = "middle";
  for (var i = 0; i < 10; i++) cx.fillText(String(i), i * 64 + 32, 35);
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, at);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(prog, "uAtlas"), 0);

  var uRes = gl.getUniformLocation(prog, "uRes");
  var uC = gl.getUniformLocation(prog, "uC");
  var uT = gl.getUniformLocation(prog, "uT");

  var scale = 1, aspect = 1;
  var cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 };
  var lastMove = -1e9;

  function home() {
    // Wide screens: lens sits right of the headline. Tall screens: lower middle.
    return aspect > 1 ? { x: aspect * 0.2, y: 0.0 } : { x: 0, y: -0.16 };
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5) * scale;
    var w = Math.max(2, Math.round(window.innerWidth * dpr));
    var h = Math.max(2, Math.round(window.innerHeight * dpr));
    if (cv.width !== w || cv.height !== h) {
      cv.width = w; cv.height = h;
      gl.viewport(0, 0, w, h);
    }
    aspect = w / h;
    gl.uniform2f(uRes, w, h);
  }

  function draw(t) {
    gl.uniform2f(uC, cur.x, cur.y);
    gl.uniform1f(uT, t % 3600);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  var raf = 0, running = false, last = 0, t0 = 0;
  var acc = 0, frames = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    var t = (now - t0) / 1000;
    var idle = now - lastMove > 4000;
    var hm = home();
    if (idle) {
      tgt.x = hm.x + 0.05 * Math.sin(t * 0.4);
      tgt.y = hm.y + 0.04 * Math.cos(t * 0.31);
    }
    var k = 1 - Math.exp(-dt * 3.5);
    cur.x += (tgt.x - cur.x) * k;
    cur.y += (tgt.y - cur.y) * k;
    draw(t + 3);

    // Adaptive quality: if frames run slow, render fewer pixels. Never goes back up.
    acc += dt; frames++;
    if (frames === 45) {
      if (acc / frames > 0.024 && scale > 0.55) {
        scale = Math.max(0.55, scale * 0.8);
        resize();
      }
      acc = 0; frames = 0;
    }
  }

  var inView = true;
  function sync() {
    var want = inView && !document.hidden && !reduce;
    if (want && !running) {
      running = true; last = performance.now(); acc = 0; frames = 0;
      raf = requestAnimationFrame(frame);
    } else if (!want && running) {
      running = false; cancelAnimationFrame(raf);
    }
  }

  window.addEventListener("pointermove", function (e) {
    if (!running) return;
    tgt.x = (e.clientX / window.innerWidth - 0.5) * aspect;
    tgt.y = -(e.clientY / window.innerHeight - 0.5);
    lastMove = performance.now();
  }, { passive: true });

  var rz = 0;
  window.addEventListener("resize", function () {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(function () {
      resize();
      if (reduce || !running) { var h = home(); cur.x = h.x; cur.y = h.y; draw(2.5); }
    });
  });

  document.addEventListener("visibilitychange", sync);
  cv.addEventListener("webglcontextlost", function (e) {
    e.preventDefault(); running = false; cancelAnimationFrame(raf);
  });

  var hero = document.getElementById("hero");
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      inView = en[0].isIntersecting; sync();
    }).observe(hero);
  }

  resize();
  var h0 = home(); cur.x = tgt.x = h0.x; cur.y = tgt.y = h0.y;
  t0 = performance.now();
  draw(2.5); // first paint immediately, even if the loop never starts
  sync();
})();
