'use client';

import { useEffect, useRef } from 'react';

/**
 * Fondo "Cybernetic Grid" (shader de dhileepkumargm) portado a WebGL puro — sin
 * three.js. Rejilla futurista que ondula y se ilumina con el cursor, recoloreada
 * a Windmar (rejilla azul #1D429B + pulsos naranja #F7941D). Solo para el login.
 */
const VERT = `attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAG = `precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
float random(vec2 st){ return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
void main(){
  vec2 uv    = (gl_FragCoord.xy - 0.5*iResolution.xy)/iResolution.y;
  vec2 mouse = (iMouse - 0.5*iResolution.xy)/iResolution.y;
  float t = iTime * 0.2;
  float mouseDist = length(uv - mouse);
  float warp = sin(mouseDist*20.0 - t*4.0)*0.1;
  warp *= smoothstep(0.4, 0.0, mouseDist);
  uv += warp;
  vec2 gridUv = abs(fract(uv*10.0) - 0.5);
  float line = pow(1.0 - min(gridUv.x, gridUv.y), 50.0);
  vec3 gridColor = vec3(0.16, 0.36, 0.85);          // azul Windmar
  vec3 color = gridColor * line * (0.5 + sin(t*2.0)*0.2);
  float energy = sin(uv.x*20.0 + t*5.0) * sin(uv.y*20.0 + t*3.0);
  energy = smoothstep(0.8, 1.0, energy);
  color += vec3(0.969, 0.580, 0.114) * energy * line; // pulsos naranja Windmar
  float glow = smoothstep(0.1, 0.0, mouseDist);
  color += vec3(1.0, 0.75, 0.4) * glow * 0.5;          // glow cálido en el cursor
  color += random(uv + t*0.1) * 0.04;
  gl_FragColor = vec4(color, 1.0);
}`;

export function CyberGridBg() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return; // sin WebGL → fondo normal

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
    const uMouse = gl.getUniformLocation(prog, 'iMouse');

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    const mouse = { x: 0, y: 0 };
    const resize = () => {
      const w = Math.floor(window.innerWidth * DPR);
      const h = Math.floor(window.innerHeight * DPR);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      mouse.x = canvas.width / 2; mouse.y = canvas.height / 2;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX * DPR;
      mouse.y = (window.innerHeight - e.clientY) * DPR; // gl_FragCoord: origen abajo-izq
    };
    window.addEventListener('mousemove', onMove);

    let raf = 0;
    const start = performance.now();
    let visible = true;
    const onVis = () => { visible = !document.hidden; if (visible) loop(); };
    document.addEventListener('visibilitychange', onVis);

    function loop() {
      if (!visible) return;
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.uniform1f(uTime, (performance.now() - start) / 1000);
      gl!.uniform2f(uMouse, mouse.x, mouse.y);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
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
