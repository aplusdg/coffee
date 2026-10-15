import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';

const $ = (s) => document.querySelector(s);
const state = { temperature: 'hot', strength: 'regular', phase: 'idle', elapsed: 0, readyAt: 0 };
const duration = 11;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
catch { $('#fallback').hidden = false; $('#make').disabled = true; }
if (renderer) init();

function init() {
 const host = $('#scene');
 renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
 renderer.shadowMap.enabled = true;
 renderer.shadowMap.type = THREE.PCFSoftShadowMap;
 renderer.toneMapping = THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure = 1.35;
 host.appendChild(renderer.domElement);
 const scene = new THREE.Scene();
 const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
 camera.position.set(4.8, 3.8, 6.8); camera.lookAt(0, .1, 0);
 const pmrem = new THREE.PMREMGenerator(renderer);
 const room = new RoomEnvironment();
 const env = pmrem.fromScene(room, .04); scene.environment = env.texture; room.dispose(); pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xfff8ea, 0x8c7961, 2.4));
 const key = new THREE.DirectionalLight(0xfff7e5, 4); key.position.set(-3, 7, 5); key.castShadow = true; key.shadow.mapSize.set(1024,1024); scene.add(key);
 const fill = new THREE.DirectionalLight(0xffffff, 2); fill.position.set(4, 3, -4); scene.add(fill);
 const rig = new THREE.Group(); scene.add(rig);
 const ceramic = new THREE.MeshPhysicalMaterial({color:0xf3ede0, roughness:.22, metalness:.02, clearcoat:.8});
 const glass = new THREE.MeshPhysicalMaterial({color:0xffffff, roughness:.07, transmission:1, thickness:.16, ior:1.46, transparent:true, opacity:1, side:THREE.DoubleSide});
 const coffeeMat = new THREE.MeshPhysicalMaterial({color:0x42200f,roughness:.24,clearcoat:.6});
 const foamMat = new THREE.MeshStandardMaterial({color:0xf8ecd4,roughness:.9});
 const cup = new THREE.Group(); rig.add(cup);
 // Hollow lathed vessel, with a rounded wall and a closed base.
 const profile = [[0,-1.05],[.68,-1.05],[.77,-1.01],[.83,-.92],[.99,.82],[1,.92],[.98,.97],[.92,.97],[.91,.91],[.77,-.82],[.7,-.89],[0,-.89]].map(p=>new THREE.Vector2(...p));
 const vessel = new THREE.Mesh(new THREE.LatheGeometry(profile, 96),ceramic); vessel.castShadow=true; vessel.receiveShadow=true; cup.add(vessel);
 const handle = new THREE.Mesh(new THREE.TorusGeometry(.48,.105,20,60,Math.PI*1.65),ceramic); handle.position.set(1.04,.05,0); handle.rotation.z=-Math.PI*.825; cup.add(handle);
 const saucer = new THREE.Mesh(new THREE.LatheGeometry([[0,-1.18],[.9,-1.18],[1.55,-1.13],[1.67,-1.06],[1.66,-1.01],[1.5,-1.04],[.95,-1.1],[0,-1.1]].map(p=>new THREE.Vector2(...p)),96),ceramic); saucer.receiveShadow=true; rig.add(saucer);
 const liquid = new THREE.Group(); cup.add(liquid);
 const body = new THREE.Mesh(new THREE.CylinderGeometry(.90,.73,1,80),coffeeMat); liquid.add(body);
 const topMat = coffeeMat.clone();
 const top = new THREE.Mesh(new THREE.CircleGeometry(.9,96),topMat); top.rotation.x=-Math.PI/2; liquid.add(top);
 const foam = new THREE.Mesh(new THREE.CylinderGeometry(.90,.90,.14,80),foamMat); liquid.add(foam);
 const foamTop = new THREE.Group(); liquid.add(foamTop);
 const rand = (()=>{let seed=18;return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};})();
 for(let i=0;i<100;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*.87;const m=new THREE.Mesh(new THREE.SphereGeometry(.009+rand()*.019,6,4),foamMat);m.position.set(Math.cos(a)*r,0,Math.sin(a)*r);m.scale.y=.32;foamTop.add(m);}
 // Crema spiral and a heart drawn as geometry on the foam surface.
 const cremaMat=new THREE.MeshBasicMaterial({color:0xb78045,transparent:true,opacity:.65,side:THREE.DoubleSide});
 const heart = new THREE.Shape(); heart.moveTo(0,-.23); heart.bezierCurveTo(-.65,.12,-.36,.58,0,.28); heart.bezierCurveTo(.36,.58,.65,.12,0,-.23);
 const art=new THREE.Mesh(new THREE.ShapeGeometry(heart,40),new THREE.MeshBasicMaterial({color:0xc59459,side:THREE.DoubleSide}));art.rotation.x=-Math.PI/2;art.rotation.z=.25;foamTop.add(art);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.84,.88,96),cremaMat);ring.rotation.x=-Math.PI/2;ring.position.y=-.003;foamTop.add(ring);
 const iceGroup=new THREE.Group();cup.add(iceGroup);
 const iceMat=new THREE.MeshPhysicalMaterial({color:0xf0faff,transmission:.8,roughness:.13,thickness:.6,ior:1.31,transparent:true,opacity:.85});
 for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.39,.36,.4,2,2,2),iceMat);const a=i*2.4;m.userData={x:Math.cos(a)*.48,z:Math.sin(a)*.48,phase:i};m.rotation.set(i*.3,.3+i,.2);iceGroup.add(m);}
 const stream = new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,1,16),coffeeMat.clone());stream.visible=false;rig.add(stream);
 const steam=new THREE.Group();cup.add(steam);
 const puffGeo=new THREE.PlaneGeometry(.65,.65);
 const texCanvas=document.createElement('canvas');texCanvas.width=64;texCanvas.height=64;const ctx=texCanvas.getContext('2d');const grad=ctx.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'rgba(255,255,255,.5)');grad.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);const tex=new THREE.CanvasTexture(texCanvas);
 for(let i=0;i<15;i++){const m=new THREE.Mesh(puffGeo,new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:0,side:THREE.DoubleSide}));steam.add(m);}
 const ground=new THREE.Mesh(new THREE.CircleGeometry(2.5,80),new THREE.ShadowMaterial({opacity:.12}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.2;ground.receiveShadow=true;scene.add(ground);
 let yaw=-.35,targetYaw=-.35,pitch=0,targetPitch=0,hover=0,drag=false,lastX=0,lastY=0;
 const resize=()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
 host.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;host.setPointerCapture(e.pointerId);});
 host.addEventListener('pointermove',e=>{if(drag){targetYaw+=(e.clientX-lastX)*.009;targetPitch=THREE.MathUtils.clamp(targetPitch+(e.clientY-lastY)*.004,-.3,.3);lastX=e.clientX;lastY=e.clientY;}else if(!reduced)hover=.045;});
 const release=()=>{drag=false;};host.addEventListener('pointerup',release);host.addEventListener('pointercancel',release);host.addEventListener('pointerleave',()=>{hover=0;});
 for(const id of ['temperature','strength']) $(`#${id}`).addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn||state.phase==='making')return;state[id]=btn.dataset.value;for(const b of $(`#${id}`).querySelectorAll('button')){b.classList.toggle('selected',b===btn);b.setAttribute('aria-pressed',String(b===btn));}reset();});
 function reset(){state.phase='idle';state.elapsed=0;$('#make').innerHTML='开始制作 <span>↗</span>';$('#status').textContent='一杯好咖啡，值得片刻等待';$('#progress-fill').style.width='0%';$('#cup-label').textContent=state.temperature==='hot'?'THE WARM CLASSIC':'A COOL LITTLE ESCAPE';$('#recipe-ratio').textContent=state.strength==='regular'?'1 : 1 : 1':'2 : 1 : 1';vessel.material=state.temperature==='hot'?ceramic:glass;handle.material=vessel.material;saucer.visible=state.temperature==='hot';}
 $('#make').addEventListener('click',()=>{state.phase='making';state.elapsed=0;$('#make').disabled=true;$('#make').innerHTML='正在为你制作 <span>◌</span>';document.querySelectorAll('.choices button').forEach(b=>b.disabled=true);});
 const stages=['萃取浓缩咖啡，唤醒香气…','缓缓注入牛奶，让醇香交融…','铺上绵密奶泡，留一点温柔…'];
 const clock=new THREE.Clock();let time=0;
 function frame(){requestAnimationFrame(frame);const dt=clock.getDelta();time+=dt;
 if(state.phase==='making'){state.elapsed+=dt;if(state.elapsed>=duration){state.phase='ready';state.readyAt=time;$('#make').disabled=false;$('#make').innerHTML='再做一杯 <span>↻</span>';document.querySelectorAll('.choices button').forEach(b=>b.disabled=false);$('#status').textContent=state.temperature==='hot'?'你的热卡布奇诺好了，慢慢享用':'你的冰卡布奇诺好了，清爽一刻';$('#state-label').textContent='MADE WITH A LITTLE LOVE';}else $('#status').textContent=stages[Math.min(2,Math.floor(state.elapsed/4))];$('#progress-fill').style.width=`${Math.min(100,state.elapsed/duration*100)}%`;}
 const active=state.phase!=='idle',t=state.elapsed;
 const coffee=THREE.MathUtils.smoothstep(t,0,3.5),milk=THREE.MathUtils.smoothstep(t,3.8,7.5),foamP=THREE.MathUtils.smoothstep(t,7.8,10.8);
 const level=-.88+coffee*.48+milk*.91;
 liquid.visible=active;body.scale.y=Math.max(.001,level+.88);body.position.y=(-.88+level)/2;top.position.y=level+.002;
 const dark=new THREE.Color(state.strength==='strong'?0x351a0c:0x50270f),latte=new THREE.Color(state.strength==='strong'?0xa46d3f:0xc69a65);coffeeMat.color.copy(dark).lerp(latte,milk*.92);topMat.color.copy(coffeeMat.color);
 foam.visible=foamP>0;foam.scale.y=Math.max(.001,foamP);foam.position.y=level+.07*foamP;foamTop.position.y=level+.14*foamP+.004;foamTop.visible=foamP>.5;art.scale.setScalar(THREE.MathUtils.smoothstep(foamP,.5,1));
 // A gently undulating surface settles as pouring finishes.
 const wobble=(!reduced&&active)?Math.sin(time*3)*(.008+(state.phase==='making'?.012:hover)):0;
 liquid.rotation.x=wobble;liquid.rotation.z=Math.sin(time*2.7)*hover*.3;
 stream.visible=state.phase==='making'&&((t<3.5)||(t>3.8&&t<7.5)||(t>7.8&&t<10.5));const streamBottom=t>7.8?level+.14*foamP:level;stream.scale.y=Math.max(.01,2.6-streamBottom);stream.position.set(.16,(2.6+streamBottom)/2,-.1);stream.material.color.set(t<3.8?0x512b15:t<7.8?0xf4e5cd:0xffefd4);
 iceGroup.visible=state.temperature==='iced'&&active;for(const m of iceGroup.children){const d=m.userData;m.position.set(d.x+Math.sin(time+d.phase)*hover,Math.max(-.6,level+.12*foamP)+Math.sin(time*1.5+d.phase)*.025,d.z);m.rotation.z=Math.sin(time+d.phase)*.09;}
 steam.visible=state.temperature==='hot'&&state.phase==='ready'&&!reduced;steam.children.forEach((m,i)=>{const age=((time-state.readyAt)*.23+i/15)%1;m.position.set(Math.sin(age*5+i)*.2, .8+age*1.65,Math.cos(i*2)*.18);m.scale.setScalar(.35+age*.95);m.material.opacity=Math.sin(age*Math.PI)*.25;m.quaternion.copy(camera.quaternion);});
 yaw+=(targetYaw-yaw)*.08;pitch+=(targetPitch-pitch)*.08;rig.rotation.set(pitch, yaw, reduced?0:Math.sin(time*2.5)*hover);hover*=.97;renderer.render(scene,camera);
 }
 reset();frame();
}
