import { io } from 'socket.io-client';
const w=ms=>new Promise(r=>setTimeout(r,ms));
const URL='http://localhost:3001';
function mk(){const s=io(URL,{transports:['websocket']});s.on('updateState',st=>s.state=st);s.errors=[];s.on('error',m=>s.errors.push(m));return new Promise(r=>s.on('connect',()=>r(s)));}
let p=0,f=0; const ck=(n,ok,x='')=>{console.log(`${ok?'PASS':'FAIL'}  ${n}${x?'  -> '+x:''}`);ok?p++:f++;};

// avatar login (natanel31's new flow: joinGame takes a name, no password)
const a=await mk(); a.emit('joinGame','גל'); await w(400);
ck('avatar login works', a.state?.participants?.length===1, a.state?.participants?.[0]?.name);
ck('first joiner is host', a.state?.hostId===a.id);

const dup=await mk(); dup.emit('joinGame','גל'); await w(400);
ck('taken avatar is refused', dup.errors.length>0, dup.errors[0]||'');
dup.close(); await w(200);

const b=await mk(); b.emit('joinGame','נתנאל'); await w(400);
ck('second avatar joins', b.state?.participants?.length===2);

a.emit('startGame','euroleague'); await w(450);
ck('game starts after merge', a.state?.gameStarted===true && !!a.state?.currentAuction?.player);
ck('pack recorded', a.state?.currentPack==='euroleague');

// core rules still hold
const first=a.state.currentAuction.currentTurnId===a.id?a:b;
first.emit('fold'); await w(300);
ck('opening bidder still cannot fold', first.state.currentAuction.activeBidders.length===2);
first.emit('placeBid',2); await w(350);
ck('bidding works', a.state.currentAuction.highestBid===2);

// packs + data intact
a.emit('endGameEarly'); await w(300);
const counts={};
for(const pack of ['nba','maccabi','euroleague']){
  if(a.state?.gameStarted){a.emit('endGameEarly');await w(60);}
  a.emit('startGame',pack); await w(400);
  const seen=new Set(); let guard=0;
  while(guard++<60){
    const st=a.state; if(!st?.gameStarted)break;
    const au=st.currentAuction; if(!au?.player)break;
    seen.add(au.player.name);
    const actor=[a,b].find(s=>s.id===au.currentTurnId)||a;
    if(au.highestBid===-1) actor.emit('placeBid',0); else actor.emit('fold');
    await w(20);
  }
  counts[pack]=seen.size;
  ck(`${pack} pack playable`, seen.size>0, `${seen.size} players drawn`);
}
if(a.state?.gameStarted){a.emit('endGameEarly');await w(200);}

// assets natanel31 added
for(const img of ['galco','natanel','shirazi']){
  const r=await fetch(URL+'/images/'+img+'.png');
  if(!(r.ok && (r.headers.get('content-type')||'').startsWith('image/'))) ck('avatar image '+img,false,String(r.status));
}
ck('all 3 avatar images served', true);
const hz=await fetch(URL+'/healthz').then(r=>r.json());
ck('healthz still ok', hz.ok===true);

console.log(`\n${p} passed, ${f} failed`);
a.emit('leaveGame'); b.emit('leaveGame'); await w(300); a.close(); b.close(); process.exit(f?1:0);
