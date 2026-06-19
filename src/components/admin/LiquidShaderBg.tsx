'use client';

import { useEffect, useRef } from 'react';

/**
 * Fondo "Liquid" (shader de dhiluxui) portado a WebGL puro — sin three.js.
 * Onda líquida fluida recoloreada a Windmar (navy → naranja) sobre negro.
 * Velocidad reducida. Fondo a pantalla completa para el admin.
 */
const VERT = `attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAG = `precision highp float;
uniform vec2 iResolution;
uniform float iTime;
#define t iTime
mat2 m(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float map(vec3 p){
  p.xz *= m(t*0.4);
  p.xy *= m(t*0.3);
  vec3 q = p*2.0 + t;
  return length(p + vec3(sin(t*0.7))) * log(length(p)+1.0)
       + sin(q.x + sin(q.z + sin(q.y))) * 0.5 - 1.0;
}
void main(){
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord / min(iResolution.x, iResolution.y) - vec2(0.9, 0.5);
  uv.x += 0.4;
  vec3 col = vec3(0.0);
  float d = 2.5;
  for (int i = 0; i <= 5; i++) {
    vec3 p = vec3(0.0, 0.0, 5.0) + normalize(vec3(uv, -1.0)) * d;
    float rz = map(p);
    float f = clamp((rz - map(p + 0.1)) * 0.5, -0.1, 1.0);
    vec3 base = vec3(0.04, 0.10, 0.22) + vec3(5.0, 2.6, 0.6) * f; // navy -> naranja Windmar
    col = col * base + smoothstep(2.5, 0.0, rz) * 0.7 * base;
    d += min(rz, 1.0);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export function LiquidShaderBg() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'iResolution');
    const uTime = gl.getUniformLocation(prog, 'iTime');

    const SCALE = 0.7;
    const resize = () => {
      const w = Math.max(1, Math.floor(window.innerWidth * SCALE));
      const h = Math.max(1, Math.floor(window.innerHeight * SCALE));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    const start = performance.now();
    let visible = true;
    const onVis = () => { visible = !document.hidden; if (visible) loop(); };
    document.addEventListener('visibilitychange', onVis);

    function loop() {
      if (!visible) return;
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.uniform1f(uTime, ((performance.now() - start) / 1000) * 0.6); // velocidad reducida
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  );
}
