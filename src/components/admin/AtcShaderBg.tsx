'use client';

import { useEffect, useRef } from 'react';

/**
 * Fondo animado tipo "warp" (shader ATC de xordev, WebGL2 puro — sin deps),
 * recoloreado a la paleta Windmar (oscuro → azul #1D429B → naranja #F7941D) y a
 * velocidad reducida. Capa de fondo a pantalla completa para el admin.
 * Se degrada con gracia: si no hay WebGL2, no rompe nada (queda el fondo CSS).
 */
const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_res;
uniform float u_time;
float tanh1(float x){ float e=exp(2.0*x); return (e-1.0)/(e+1.0); }
vec4 tanh4(vec4 v){ return vec4(tanh1(v.x),tanh1(v.y),tanh1(v.z),tanh1(v.w)); }
void main(){
  vec3 FC=vec3(gl_FragCoord.xy,0.0);
  vec3 r=vec3(u_res, max(u_res.x,u_res.y));
  float t=u_time;
  vec4 o=vec4(0.0);
  vec3 p=vec3(0.0);
  vec3 v=vec3(1.0,2.0,6.0);
  float i=0.0,z=1.0,d=1.0,f=1.0;
  for(; i++ < 5e1; o.rgb += (cos((p.x+z+v)*0.1)+1.0)/d/f/z){
    p=z*normalize(FC*2.0-r.xyy);
    vec4 m=cos((p+sin(p)).y*0.4+vec4(0.0,33.0,11.0,0.0));
    p.xz=mat2(m)*p.xz;
    p.x += t/0.6;
    z += ( d=length(cos(p/v)*v + v.zxx/7.0)/( f=2.0+d/exp(p.y*0.2) ) );
  }
  o=tanh4(0.2*o);
  float g=clamp((o.r+o.g+o.b)/3.0,0.0,1.0);
  vec3 c1=vec3(0.016,0.024,0.051);
  vec3 c2=vec3(0.114,0.259,0.608);
  vec3 c3=vec3(0.969,0.580,0.114);
  vec3 col = g<0.5 ? mix(c1,c2,g*2.0) : mix(c2,c3,(g-0.5)*2.0);
  fragColor=vec4(col,1.0);
}`;

const VERT = `#version 300 es
in vec2 a; void main(){ gl_Position=vec4(a,0.0,1.0); }`;

export function AtcShaderBg() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) return; // sin WebGL2 → queda el fondo CSS

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
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
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');

    const SCALE = 0.7; // resolución interna reducida (rendimiento)
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
      resize();
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.uniform1f(uTime, (performance.now() - start) / 1000);
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
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', opacity: 0.85 }}
    />
  );
}
