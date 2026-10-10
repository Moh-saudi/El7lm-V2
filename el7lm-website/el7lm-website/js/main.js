var EMBS=document.querySelector('.lm img').src;document.querySelectorAll('img[data-lg=e]').forEach(function(i){i.src=EMBS});
var g=document.getElementById('grid'),n=Math.ceil(innerWidth/100)*Math.ceil(innerHeight/100)+30,cols=['#fff','#DB9B2C','#0F723C','#fff'];
for(var i=0;i<n;i++){var c=document.createElement('div');c.className='c';c.style.setProperty('--k',cols[Math.floor(Math.random()*4)]);c.style.setProperty('--o',(.12+Math.random()*.5).toFixed(2));c.style.setProperty('--d',(1+Math.random()*2.4).toFixed(1)+'s');c.style.animationDelay=(-Math.random()*3).toFixed(1)+'s';g.appendChild(c)}
setTimeout(function(){document.getElementById('pre').classList.add('out');document.body.classList.add('go')},2600);
var hd=document.getElementById('hd');function t(){var v=document.body.dataset.v,f=document.getElementById('ct').getBoundingClientRect().top;hd.classList.toggle('dk',(v=='p'||(v=='h'&&scrollY>innerHeight*.8))&&f>60)}addEventListener('scroll',t);
var hv=document.getElementById('hv'),pvb=document.getElementById('pv');
function hst(){var p=hv.paused;pvb.textContent=p?'▶':'❚❚';pvb.setAttribute('aria-label',tr(p?'pv_r':'pv_p'))}
if(matchMedia('(prefers-reduced-motion:reduce)').matches){hv.pause()}else{var q0=hv.play();if(q0&&q0.catch)q0.catch(function(){})}
pvb.onclick=function(){hv.paused?hv.play():hv.pause()};hv.addEventListener('play',hst);hv.addEventListener('pause',hst);
var CP=[['#161653','#DB9B2C'],['#0F723C','#fff'],['#DB9B2C','#161653'],['#8A1538','#f3f1ef'],['#0b6e99','#f2c94c'],['#c0392b','#fff'],['#2c3e50','#e67e22'],['#6c3483','#f1c40f'],['#117a65','#f9e79f']];
var EM=[function(c){return '<polygon points="50,28 56,46 75,46 60,57 66,75 50,64 34,75 40,57 25,46 44,46" fill="'+c+'"/>'},
function(c){return '<rect x="18" y="52" width="64" height="12" fill="'+c+'"/><rect x="18" y="72" width="64" height="8" fill="'+c+'"/>'},
function(c){return '<path d="M20 70L50 34L80 70L68 70L50 48L32 70Z" fill="'+c+'"/>'},
function(c){return '<circle cx="50" cy="55" r="20" fill="none" stroke="'+c+'" stroke-width="7"/><circle cx="50" cy="55" r="6" fill="'+c+'"/>'},
function(c){return '<path d="M30 40L44 62L50 36L56 62L70 40L66 74L34 74Z" fill="'+c+'"/>'},
function(c){return '<path d="M55 26L34 58H50L44 84L68 50H52Z" fill="'+c+'"/>'},
function(c){return '<path d="M18 60Q34 40 50 60T82 60" fill="none" stroke="'+c+'" stroke-width="8"/><path d="M18 76Q34 56 50 76T82 76" fill="none" stroke="'+c+'" stroke-width="8"/>'}];
function crest(i){var c=CP[i%CP.length],e=EM[(i*3)%EM.length],o=i%3==2?'<circle cx="50" cy="55" r="46"':'<path d="M8 8H92V58C92 84 68 98 50 106C32 98 8 84 8 58Z"';
return '<svg viewBox="0 0 100 110" width="96" height="106" role="img" aria-label="'+tr('crest_alt')+'">'+o+' fill="'+c[0]+'" stroke="'+c[1]+'" stroke-width="4"/>'+e(c[1])+'</svg>'}
var SV=[['v1','opps',['s11','s12','s13']],['v2','clubs',['s21','s22','s23']],['v3','academies',['s31','s32','s33']],['v4','coaches',['s41','s42','s43']],['v5','agents',['s51','s52','s53']],['v6','',['s61','s62','s63']],['v7','',['s71','s72','c3']],['v8','',['s81','s82','s83']]];
function buildSvc(){var L=document.getElementById('list');L.innerHTML='';SV.forEach(function(s){var n=tr(s[0]),r=document.createElement('div');r.className='rw';
r.innerHTML='<a class="cap" href="'+(s[1]?'#p/'+s[1]:'#nasr')+'"><span>'+n+'</span><div class="bar"><div class="trk">'+('<b>'+n+'</b>').repeat(10)+'</div></div></a><div class="sub"><div class="subi"><ul>'+s[2].map(function(k){return '<li>'+tr(k)+'</li>'}).join('')+'</ul>'+(s[1]?'<a class="more" href="#p/'+s[1]+'">'+tr('more')+'</a>':'')+'</div></div>';
r.firstChild.addEventListener('click',function(e){if(matchMedia('(hover:none)').matches){e.preventDefault();var o=r.classList.contains('open');document.querySelectorAll('.rw.open').forEach(function(x){x.classList.remove('open')});if(!o)r.classList.add('open')}});L.appendChild(r)})}
function buildPartners(){var g=document.getElementById('lg');g.innerHTML='';for(var k=0;k<8;k++){var d=document.createElement('div');d.className='cr';d.style.setProperty('--i',k);d.innerHTML=crest(k);g.appendChild(d)}}
var PGK={opps:'v1',clubs:'v2',academies:'v3',coaches:'v4',agents:'v5',about:'pt_about',jobs:'pt_jobs',privacy:'pt_priv',terms:'pt_terms'},curPg='';
function pgr(s){if(!PGK[s])s='about';curPg=s;document.getElementById('pl1').textContent=tr('pg_l');document.getElementById('pt').textContent=tr(PGK[s]);document.getElementById('pb').textContent=tr(s=='privacy'||s=='terms'?'pb_legal':'pb_'+s)}
function renderPanel(o){var t1=[tr('ci_'+o.id,''),tr('ad_'+o.id,'')].filter(Boolean).join(LI==1?'، ':', ')||tr('addr_na'),wn=o.id=='eg'?'201017799580':'97470542458';
document.getElementById('pn').innerHTML='<div>'+flag(o.id,72)+'</div><h3>'+tr('c_'+o.id)+(o.hq?' <em class="hq">'+tr('hqtag')+'</em>':'')+'</h3><p>'+t1+'</p><a class="pill" href="tel:+'+wn+'">'+tr('call')+'</a> <a class="pill" href="https://wa.me/'+wn+'" target="_blank" rel="noopener"><svg class="ic"><use href="#i-wa"/></svg>WhatsApp</a>';
document.querySelectorAll('.ch').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.c==o.id)})}
function pick(o){sel=o;auto=false;tl=o.ll[0];tp=Math.max(-40,Math.min(50,o.ll[1]*.8));renderPanel(o)}
function buildChips(){var CH=document.getElementById('chs');CH.innerHTML='';C.forEach(function(o){var b=document.createElement('button');b.className='ch';b.dataset.c=o.id;b.innerHTML=flag(o.id,22)+tr('c_'+o.id);b.setAttribute('aria-pressed',sel===o);b.onclick=function(){pick(o)};CH.appendChild(b)})}
function applyLang(){var l=LG[LI];document.documentElement.lang=l;document.documentElement.dir=l=='ar'?'rtl':'ltr';document.title=tr('ttl');
document.querySelectorAll('[data-i]').forEach(function(e){e.textContent=tr(e.dataset.i)});
document.querySelectorAll('[data-h]').forEach(function(e){e.innerHTML=tr(e.dataset.h)});
document.querySelectorAll('[data-a]').forEach(function(e){e.setAttribute('aria-label',tr(e.dataset.a))});
document.querySelectorAll('[data-alt]').forEach(function(e){e.setAttribute('alt',tr(e.dataset.alt))});
buildSvc();buildPartners();buildChips();if(sel)renderPanel(sel);if(curPg)pgr(curPg);hst();document.getElementById('lgs').value=l;if(document.body.dataset.v=='o')rs()}
document.getElementById('lgs').onchange=function(){LI=LG.indexOf(this.value);try{localStorage.setItem('mk_lang',this.value)}catch(e){}applyLang()};
var D=Math.PI/180,raf=0,l0=-20,p0=22,tl=null,tp=0,auto=true,sel=null,drag=null,mv=0,W=0,R=0,rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
var FL={qa:'assets/img/flags/qa.png',eg:'assets/img/flags/eg.png',sa:'assets/img/flags/sa.png',ma:'assets/img/flags/ma.png',pt:'assets/img/flags/pt.png',es:'assets/img/flags/es.png',sn:'assets/img/flags/sn.png'};
function flag(k,w){return '<img src="'+FL[k]+'" alt="" width="'+w+'" style="display:block;height:auto">'}
var C=[{id:'qa',hq:1,ll:[51.5,25.3]},{id:'eg',ll:[31.3,30.1]},{id:'sa',ll:[46.7,24.7]},{id:'ma',ll:[-6.85,34]},{id:'pt',ll:[-9.1,38.7]},{id:'es',ll:[-3.7,40.4]},{id:'sn',ll:[-17.45,14.7]}];
var PG=[[[-168,66],[-156,71],[-125,70],[-95,68],[-82,68],[-65,60],[-56,52],[-66,45],[-70,42],[-76,35],[-81,31],[-80,26],[-82,28],[-90,30],[-97,27],[-97,22],[-91,19],[-87,21],[-88,16],[-83,15],[-83,10],[-77,8],[-80,7],[-85,10],[-92,14],[-105,20],[-110,24],[-112,29],[-117,32],[-121,35],[-124,40],[-124,47],[-130,54],[-140,60],[-152,59],[-165,55],[-158,58],[-165,62]],
[[-73,78],[-60,82],[-30,83],[-18,78],[-20,70],[-40,65],[-48,61],[-54,67],[-58,75]],
[[-77,8],[-72,12],[-62,10],[-52,5],[-50,0],[-44,-2],[-35,-5],[-39,-14],[-41,-22],[-48,-26],[-53,-34],[-58,-38],[-62,-39],[-65,-45],[-68,-52],[-70,-55],[-74,-50],[-73,-40],[-71,-30],[-70,-18],[-76,-14],[-81,-5],[-80,0]],
[[-9,37],[-9,43],[-2,44],[-4,48],[2,51],[8,54],[8,57],[5,58],[5,62],[14,67],[25,71],[31,70],[40,67],[44,68],[60,69],[70,73],[80,73],[100,77],[113,74],[130,71],[150,71],[170,70],[180,68],[180,65],[170,62],[160,61],[156,51],[150,59],[140,54],[135,44],[130,42],[129,35],[126,35],[122,40],[118,38],[122,31],[120,24],[110,21],[108,16],[109,11],[105,9],[100,13],[100,7],[103,1],[98,8],[98,16],[94,17],[92,22],[87,21],[80,15],[78,8],[73,18],[72,22],[68,24],[62,25],[57,26],[56,26],[51.5,24.5],[50,26],[48,30],[56,25],[58,23],[55,17],[44,12.5],[43,16],[39,21],[35,28],[34,31],[36,36],[30,36],[27,37],[26,40],[23,40],[22,37],[20,40],[19,42],[13,45],[18,40],[16,38],[12,42],[8,44],[3,43],[-1,38],[-5,36]],
[[-17,21],[-17,14],[-12,8],[-8,4],[5,5],[9,4],[9,-1],[13,-6],[12,-17],[15,-27],[18,-34],[26,-34],[32,-28],[35,-22],[40,-15],[40,-10],[39,-5],[41,-2],[51,12],[43,12],[38,18],[33,28],[32,31],[25,32],[20,31],[10,34],[11,37],[0,36],[-6,36],[-10,30]],
[[44,-25],[47,-25],[50,-15],[49,-12],[44,-17]],
[[114,-22],[122,-18],[130,-12],[137,-12],[142,-11],[146,-19],[153,-26],[150,-37],[141,-38],[135,-35],[130,-32],[115,-34]],
[[-5,50],[1,51],[2,53],[-2,56],[-5,58],[-6,56],[-3,54],[-5,52]],
[[130,32],[136,34],[141,38],[142,45],[140,41],[135,36]],
[[109,1],[117,7],[119,1],[116,-4],[110,-3]]];
function ins(P,x,y){var c=false;for(var i=0,j=P.length-1;i<P.length;j=i++){var a=P[i],b=P[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
var LP=[];for(var la=-58;la<=82;la+=2.4){var st=Math.min(20,2.4/Math.max(.1,Math.cos(la*D)));for(var lo=-180;lo<180;lo+=st){for(var k=0;k<PG.length;k++){if(ins(PG[k],lo,la)){LP.push([lo,la]);break}}}}
var cv=document.getElementById('gl'),cx=cv.getContext('2d');
function pr(lo,la){var a=(lo-l0)*D,f=la*D,q=p0*D,cf=Math.cos(f),ca=Math.cos(a);return[cf*Math.sin(a),Math.cos(q)*Math.sin(f)-Math.sin(q)*cf*ca,Math.sin(q)*Math.sin(f)+Math.cos(q)*cf*ca]}
function rs(){var r=cv.getBoundingClientRect(),d=devicePixelRatio||1;W=r.width;cv.width=W*d;cv.height=W*d;cx.setTransform(d,0,0,d,0,0);R=W*.44}
function dr(ts){
if(!drag&&!rm){if(tl!==null){var dl=((tl-l0+540)%360)-180;l0+=dl*.07;p0+=(tp-p0)*.07;if(Math.abs(dl)<.05&&Math.abs(tp-p0)<.05)tl=null}else if(auto)l0+=.12}
cx.clearRect(0,0,W,W);var c=W/2,g=cx.createRadialGradient(c-R*.3,c-R*.35,R*.1,c,c,R);g.addColorStop(0,'#2b2b8a');g.addColorStop(1,'#0c0c3a');
cx.fillStyle=g;cx.beginPath();cx.arc(c,c,R,0,7);cx.fill();cx.strokeStyle='rgba(219,155,44,.4)';cx.lineWidth=1.5;cx.stroke();
for(var i=0;i<LP.length;i++){var p=pr(LP[i][0],LP[i][1]);if(p[2]>0){cx.fillStyle='rgba(243,241,239,'+(.15+.6*p[2]).toFixed(2)+')';cx.fillRect(c+R*p[0]-1,c-R*p[1]-1,2,2)}}
C.forEach(function(o){var p=pr(o.ll[0],o.ll[1]);o.p=p;if(p[2]<=.05)return;var x=c+R*p[0],y=c-R*p[1],s=sel===o,k=rm?0:((((ts/1000+o.ll[0]*.1)%1.6)+1.6)%1.6)/1.6;
cx.strokeStyle='rgba(219,155,44,'+((1-k)*.8).toFixed(2)+')';cx.lineWidth=2;cx.beginPath();cx.arc(x,y,5+k*18,0,7);cx.stroke();
cx.fillStyle=s?'#fff':'#DB9B2C';cx.beginPath();cx.arc(x,y,s?7:5,0,7);cx.fill();
if(s){cx.strokeStyle='#DB9B2C';cx.beginPath();cx.arc(x,y,12,0,7);cx.stroke()}o.x=x;o.y=y});
raf=requestAnimationFrame(dr)}
function hit(e){var r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,b=null,m=24;C.forEach(function(o){if(o.p&&o.p[2]>.05){var d=Math.hypot(o.x-x,o.y-y);if(d<m){m=d;b=o}}});return b}
cv.addEventListener('pointerdown',function(e){drag={x:e.clientX,y:e.clientY,l:l0,p:p0};mv=0;tl=null;cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',function(e){if(drag){var dx=e.clientX-drag.x,dy=e.clientY-drag.y;mv=Math.max(mv,Math.abs(dx)+Math.abs(dy));l0=drag.l-dx*.4;p0=Math.max(-60,Math.min(60,drag.p+dy*.3))}else cv.style.cursor=hit(e)?'pointer':'grab'});
cv.addEventListener('pointerup',function(e){if(drag&&mv<6){var o=hit(e);if(o)pick(o)}drag=null});
pick(C[0]);
function route(){var h=location.hash,o=h=='#offices';var pg=h.indexOf('#p/')==0;document.body.dataset.v=o?'o':pg?'p':'h';if(pg)pgr(h.slice(3));t();
if(o){scrollTo(0,0);rs();if(!raf)raf=requestAnimationFrame(dr)}else{if(raf){cancelAnimationFrame(raf);raf=0}var e=!pg&&h.length>1&&document.getElementById(h.slice(1));setTimeout(function(){e?e.scrollIntoView():scrollTo(0,0)},0)}}
addEventListener('hashchange',route);addEventListener('resize',function(){if(document.body.dataset.v=='o')rs()});route();
var SO=[['yt','YouTube','https://www.youtube.com/@el7lm25','#FF0000'],['ig','Instagram','https://www.instagram.com/hagzzel7lm/','#E4405F'],['fb','Facebook','https://www.facebook.com/profile.php?id=61577797509887','#0866FF'],['tt','TikTok','https://www.tiktok.com/@meskel7lm','#000000'],['li','LinkedIn','https://www.linkedin.com/showcase/el7lm','#0A66C2']];
SO.forEach(function(s){var a=document.createElement('a');a.href=s[2];a.target='_blank';a.rel='noopener';a.setAttribute('aria-label',s[1]);a.innerHTML='<svg class="ic" style="color:'+s[3]+'"><use href="#i-'+s[0]+'"/></svg>';document.getElementById('soc').appendChild(a)});
var mb=document.getElementById('mb'),nv=document.getElementById('nv');
function mt(o){nv.classList.toggle('open',o);hd.classList.toggle('mo',o);document.body.classList.toggle('nolock',o);mb.setAttribute('aria-expanded',o)}
mb.onclick=function(){mt(!nv.classList.contains('open'))};nv.addEventListener('click',function(e){if(e.target.tagName=='A')mt(false)});
(function(){var P=document.getElementById('pop'),last=null;
function show(){try{if(sessionStorage.getItem('mk_pop'))return}catch(e){}
document.getElementById('plg').src=document.querySelector('.badge img').src;
document.getElementById('pst').innerHTML=document.querySelector('.stores').outerHTML;applyLang();last=document.activeElement;P.classList.add('show');document.getElementById('px').focus()}
function hide(){P.classList.remove('show');try{sessionStorage.setItem('mk_pop','1')}catch(e){}if(last&&last.focus)last.focus()}
document.getElementById('px').onclick=hide;document.getElementById('pn2').onclick=hide;P.addEventListener('click',function(e){if(e.target===P)hide()});
addEventListener('keydown',function(e){if(!P.classList.contains('show'))return;if(e.key=='Escape'){hide();return}
if(e.key=='Tab'){var f=P.querySelectorAll('button,a[href]'),a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement==a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement==z){e.preventDefault();a.focus()}}});
setTimeout(show,7000)})();
applyLang();t();
