/**
 * Intro curta (≈1,8 s, só na primeira visita da sessão e só na home): um tecido rosé,
 * desenhado num fragment shader com ondulação e brilho de cetim, sobe e revela o nome
 * da marca. Depois a cortina inteira sai por cima.
 *
 * - Roda em JavaScript puro, inline, antes da hidratação do React: não depende do
 *   bundle nem atrasa a interação.
 * - Sem JavaScript ou sem WebGL, o tecido sobe por CSS e a intro sai sozinha.
 * - Com movimento reduzido, não aparece (ver scriptClasseIntro).
 */

/** Vai no <head>: liga a intro só na 1ª visita à home, sem movimento reduzido. */
export const scriptClasseIntro = `(function(){try{var d=document.documentElement;if(location.pathname==='/'&&!sessionStorage.getItem('ss-intro')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('intro-ativa');sessionStorage.setItem('ss-intro','1');setTimeout(function(){d.classList.remove('intro-ativa')},3200)}}catch(e){}})();`;

const shaderTecido = `precision mediump float;
uniform vec2 r;uniform float t;uniform float a;varying vec2 v;
float h(vec2 p){return sin(p.x*7.0+t*1.7+sin(p.y*2.3+t)*1.3)*0.5+sin(p.x*15.0-t*2.4+p.y*4.0)*0.16+sin(p.y*10.0+p.x*2.0+t*1.4)*0.1;}
void main(){
vec2 p=vec2(v.x*r.x/r.y,v.y);
float e=mix(-0.25,1.3,a)+(sin(p.x*3.1+t*2.2)*0.07+sin(p.x*7.3-t*3.1)*0.03)*(0.3+a);
float d=v.y-e;
float n=exp(-max(d,0.0)*5.0);
float k=0.35+n*1.3;
float H=h(p)*k;
vec2 g=vec2(h(p+vec2(0.003,0.0))*k-H,h(p+vec2(0.0,0.003))*k-H)/0.003;
vec3 N=normalize(vec3(-g*0.035,1.0));
vec3 L=normalize(vec3(-0.45,0.6,0.75));
float df=max(dot(N,L),0.0);
float sp=pow(max(dot(N,normalize(L+vec3(0.0,0.0,1.0))),0.0),36.0);
vec3 c=vec3(0.91,0.773,0.741)*(0.42+0.62*df)+vec3(1.0,0.96,0.93)*sp*0.42;
c*=1.0-n*0.12;
float al=smoothstep(0.0,0.01,d);
float so=(1.0-smoothstep(0.0,0.09,-d))*(1.0-al)*0.35;
gl_FragColor=vec4(c*al,al+so);
}`;

const scriptTecido = `(function(){var d=document.documentElement;if(!d.classList.contains('intro-ativa'))return;var c=document.getElementById('intro-tecido');if(!c)return;var gl=c.getContext('webgl',{premultipliedAlpha:true,alpha:true,antialias:false});if(!gl)return;
var s=Math.min(window.devicePixelRatio||1,1.5);c.width=innerWidth*s|0;c.height=innerHeight*s|0;gl.viewport(0,0,c.width,c.height);
function S(k,src){var o=gl.createShader(k);gl.shaderSource(o,src);gl.compileShader(o);return o}
var p=gl.createProgram();gl.attachShader(p,S(gl.VERTEX_SHADER,'attribute vec2 q;varying vec2 v;void main(){v=q*0.5+0.5;gl_Position=vec4(q,0.0,1.0);}'));gl.attachShader(p,S(gl.FRAGMENT_SHADER,${JSON.stringify(shaderTecido)}));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))return;gl.useProgram(p);
var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);var l=gl.getAttribLocation(p,'q');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
var ur=gl.getUniformLocation(p,'r'),ut=gl.getUniformLocation(p,'t'),ua=gl.getUniformLocation(p,'a');var t0=performance.now(),primeiro=true;
function q(){var t=(performance.now()-t0)/1000;var x=Math.min(Math.max((t-0.12)/0.8,0),1);x=x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;gl.uniform2f(ur,c.width,c.height);gl.uniform1f(ut,t);gl.uniform1f(ua,x);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);if(primeiro){primeiro=false;c.style.animation='none';c.style.background='transparent';}if(t<1.3)requestAnimationFrame(q);}
requestAnimationFrame(q);})();`;

export function Intro() {
  return (
    <div className="intro" aria-hidden="true">
      <div className="intro-marca">
        <p className="font-serif text-[clamp(3.4rem,11vw,10rem)] leading-[0.95]">Só Salão</p>
        <p className="sobretitulo mt-5 text-champanhe">Brasília · Fábrica de móveis para salão</p>
      </div>
      {/* O script abaixo altera o estilo do canvas antes da hidratação. */}
      <canvas id="intro-tecido" suppressHydrationWarning />
      <script dangerouslySetInnerHTML={{ __html: scriptTecido }} />
    </div>
  );
}
