(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.PagePresentation=api})(globalThis,()=>{
  const fixedAssets=Object.freeze({normal:'enemy-normal.png',fast:'enemy-fast.png',elite:'enemy-elite.png',boss:'boss-ship.png',shield:'power-shield.png',spread:'power-spread.png',double:'power-double-fire.png',heal:'power-heal.png',star:'starfield.png'});
  const pad=n=>String(n||0).padStart(6,'0');
  const formatTime=n=>{const seconds=Math.floor((n||0)/1000);return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')+'.'+Math.floor((n||0)/100)%10};

  function create({document,canvas,catalog,onIntent}){
    if(!document||!canvas||!catalog)throw new Error('document, canvas, and catalog are required');
    const $=selector=>document.querySelector(selector),context=canvas.getContext('2d'),listeners=[],images={},ImageCtor=document.defaultView&&document.defaultView.Image||globalThis.Image;
    let current=null,localOverlay=null,modalKey='';
    const emit=intent=>{if(typeof onIntent==='function')onIntent(intent)};
    const bind=(element,type,listener)=>{if(!element)return;element.addEventListener(type,listener);listeners.push(()=>element.removeEventListener(type,listener))};
    const load=file=>{if(!ImageCtor)return null;const image=new ImageCtor();image.src='assets/'+file;return image};
    for(const[key,file]of Object.entries(fixedAssets))images[key]=load(file);
    for(const fighter of catalog.list())images[fighter.id]=load(fighter.visual.spriteFile);

    function renderFighterOptions(){
      const options=$('#fighterOptions');
      if(!options)return;
      options.innerHTML=catalog.list().map(fighter=>`<button class="fighter-choice" data-fighter="${fighter.id}" type="button" style="--fighter-rotation:${fighter.visual.orientation}deg;--fighter-border:${fighter.selection.border};--fighter-glow:${fighter.selection.glow};--fighter-background:${fighter.selection.background}"><img src="assets/${fighter.visual.spriteFile}" alt="${fighter.selection.label}预览"><span><strong>${fighter.selection.label}</strong><small>${fighter.selection.description}</small></span></button>`).join('');
      options.querySelectorAll('[data-fighter]').forEach(button=>bind(button,'click',()=>emit({type:'select-fighter',fighterId:button.dataset.fighter})));
    }

    function renderRank(board){
      const rank=$('#rank');
      if(rank)rank.innerHTML=(board||[]).map((record,index)=>`<li>${index+1}<span>${record.id}</span><b>${pad(record.score)}</b><span>${formatTime(record.time)}</span></li>`).join('')||'<li>尚无记录</li>';
    }

    function renderHud(snapshot){
      const state=snapshot.game,view=snapshot.view,fighter=catalog.get(state.fighterId),stateName=state.status==='running'?'running':state.status==='paused'?'paused':'ready',skillReady=state.skillCharge>=100&&state.skillCooldownMs===0,selectable=state.status==='ready',activeMs=fighter.visual.activeState?state[fighter.visual.activeState]:0;
      $('#score').textContent=pad(state.score);$('#best').textContent=pad(snapshot.best);$('#lives').textContent='♥'.repeat(state.player.lives)+'♡'.repeat(3-state.player.lives);$('#timer').textContent=formatTime(state.elapsedMs);
      const status=$('#state');status.textContent=stateName==='running'?'火力全开':stateName==='paused'?'已暂停':'等待起飞';status.className='state-'+stateName;
      for(const[key,id]of [['shieldMs','shield'],['spreadMs','spread'],['doubleMs','double']]){const item=$('#'+id);item.textContent=state[key]?(state[key]/1000).toFixed(1)+'s':'未激活';if(item.parentElement)item.parentElement.className='buff buff-'+id}
      $('#skillName').textContent=fighter.skillName;$('#skillCharge').textContent=state.skillCharge+' / 100';$('#skillMeter').style.width=(state.skillCharge/100*100)+'%';
      const skillStatus=$('#skillStatus');skillStatus.textContent=activeMs>0?fighter.visual.activeLabel+' '+(activeMs/1000).toFixed(1)+'s':skillReady?'可释放':state.skillCooldownMs>0?'冷却 '+(state.skillCooldownMs/1000).toFixed(1)+'s':'充能中';skillStatus.className=activeMs>0?fighter.visual.statusClass:skillReady?'shockwave-ready':'';
      const skillButton=$('#skillButton');skillButton.textContent='Q · '+fighter.skillName;skillButton.disabled=!skillReady;
      document.querySelectorAll('[data-fighter]').forEach(button=>{const chosen=button.dataset.fighter===state.fighterId;button.classList.toggle('selected',chosen);if(button.setAttribute)button.setAttribute('aria-pressed',String(chosen));button.disabled=!selectable});
      $('#notice').textContent=view.notice||'';renderRank(snapshot.board);
    }

    function sprite(image,x,y,w,h,color){
      if(image&&image.complete&&image.naturalWidth){context.save();context.globalCompositeOperation='screen';context.drawImage(image,x,y,w,h);context.restore()}
      else{context.fillStyle=color;context.fillRect(x,y,w,h)}
    }
    function drawShockwave(state,fighter){
      if(fighter.visual.effect.kind!=='shockwave'||state.shockwaveFlashMs<=0)return;
      const t=1-state.shockwaveFlashMs/catalog.constants.shockwaveFlash,cx=state.player.x+30,cy=state.player.y+28,r=300*t,color=fighter.visual.effect.color;
      context.save();context.globalCompositeOperation='screen';context.globalAlpha=.75*(1-t)+.15;context.strokeStyle=color;context.shadowColor=color;context.shadowBlur=22;context.lineWidth=5-2*t;context.beginPath();context.arc(cx,cy,r,0,Math.PI*2);context.stroke();context.globalAlpha=.22*(1-t);context.fillStyle='#68b6ff';context.beginPath();context.arc(cx,cy,r,0,Math.PI*2);context.fill();context.restore();
    }
    function drawStealth(state,fighter){
      if(fighter.visual.effect.kind!=='stealth'||state.stealthMs<=0)return;
      const t=state.stealthMs/catalog.constants.stealthDuration,cx=state.player.x+30,cy=state.player.y+27,color=fighter.visual.effect.color;
      context.save();context.globalCompositeOperation='screen';context.globalAlpha=.18+.25*t;context.strokeStyle=color;context.shadowColor='#9edfff';context.shadowBlur=18;context.lineWidth=2;context.beginPath();context.arc(cx,cy,38+(1-t)*12,0,Math.PI*2);context.stroke();for(let index=0;index<8;index++){const angle=index*Math.PI/4+t*5;context.fillStyle='#d5f3ff';context.fillRect(cx+Math.cos(angle)*42,cy+Math.sin(angle)*34,2,2)}context.restore();
    }
    function drawWingmen(state,fighter){
      if(fighter.visual.effect.kind!=='wingmen'||state.wingmenMs<=0)return;
      const positions=[{x:state.player.x-16,y:state.player.y+22},{x:state.player.x+46,y:state.player.y+22}],t=state.wingmenMs/catalog.constants.wingmenDuration,color=fighter.visual.effect.color;
      context.save();context.globalCompositeOperation='screen';context.strokeStyle=color;context.shadowColor=color;context.shadowBlur=15;context.globalAlpha=.35+.35*t;for(const position of positions){context.beginPath();context.moveTo(position.x+15,position.y+25);context.lineTo(position.x+15,position.y+44);context.stroke();sprite(images[fighter.id],position.x,position.y,30,27,color)}context.restore();
    }
    function drawPlayer(state,fighter){
      const image=images[fighter.id],rotation=fighter.visual.orientation;
      if(image&&image.complete&&image.naturalWidth&&rotation){context.save();context.globalCompositeOperation='screen';context.translate(state.player.x+30,state.player.y+27);context.rotate(rotation*Math.PI/180);context.drawImage(image,-30,-27,60,54);context.restore();return}
      sprite(image,state.player.x,state.player.y,60,54,fighter.bulletColor);
    }
    function draw(state){
      const fighter=catalog.get(state.fighterId);context.fillStyle='#05061a';context.fillRect(0,0,480,720);
      if(images.star&&images.star.complete){context.globalAlpha=.5;context.drawImage(images.star,0,0,480,720);context.globalAlpha=1}
      for(const bullet of state.bullets)sprite(null,bullet.x,bullet.y,bullet.w,bullet.h,bullet.color||'#5ef');
      for(const bullet of state.enemyBullets)sprite(null,bullet.x,bullet.y,bullet.w,bullet.h,'#f5c');
      for(const enemy of state.enemies)sprite(images[enemy.kind],enemy.x,enemy.y,enemy.w,enemy.h,'#d5f');
      for(const powerup of state.powerups)sprite(images[powerup.kind],powerup.x,powerup.y,powerup.w,powerup.h,powerup.kind==='heal'?'#71ff96':'#fd6');
      if(state.boss){sprite(images.boss,state.boss.x,state.boss.y,state.boss.w,state.boss.h,'#f5c');context.fillStyle='#261338';context.fillRect(118,18,244,8);context.fillStyle='#f35bd8';context.fillRect(120,20,240*state.boss.hp/state.boss.maxHp,4)}
      if(state.shieldAvailable){context.strokeStyle='#58e7ff';context.lineWidth=2;context.shadowColor='#58e7ff';context.shadowBlur=12;context.beginPath();context.arc(state.player.x+30,state.player.y+28,40,0,Math.PI*2);context.stroke();context.shadowBlur=0}
      if(state.healFlashMs>0){const t=state.healFlashMs/700;context.save();context.globalAlpha=.25+.55*t;context.strokeStyle='#71ff96';context.lineWidth=3;context.shadowColor='#71ff96';context.shadowBlur=18;context.beginPath();context.arc(state.player.x+30,state.player.y+28,42+(1-t)*18,0,Math.PI*2);context.stroke();context.font='bold 16px PingFang SC, sans-serif';context.textAlign='center';context.fillStyle='#b8ffc8';context.fillText('生命 +1',state.player.x+30,state.player.y-14-(1-t)*12);context.restore()}
      drawStealth(state,fighter);drawWingmen(state,fighter);
      if(fighter.rules.isInvulnerable(state)||!state.player.invincibleMs||Math.floor(state.player.invincibleMs/80)%2===0){context.save();if(fighter.rules.isInvulnerable(state))context.globalAlpha=.34;drawPlayer(state,fighter);context.restore()}
      drawShockwave(state,fighter);
    }

    function showModal(key,markup,bindControls){
      const overlay=$('#overlay'),modal=$('#modal');overlay.hidden=false;
      if(modalKey===key)return;
      modalKey=key;modal.innerHTML=markup;bindControls();
    }
    function hideModal(){const overlay=$('#overlay');overlay.hidden=true;modalKey='hidden'}
    function renderModal(snapshot){
      const view=snapshot.view;
      if(view.overlay==='ended'){localOverlay=null;const key=`ended:${view.endReason}:${snapshot.game.score}:${snapshot.game.elapsedMs}:${view.canRegister}`;showModal(key,`<h2>${view.endReason==='victory'?'通关成功':'任务结束'}</h2><p>得分 ${pad(snapshot.game.score)} · 用时 ${formatTime(snapshot.game.elapsedMs)}</p>${view.canRegister?'<div class="register-form"><label for="pid">Player ID</label><input id="pid" placeholder="输入你的代号"><button class="btn main" id="save">登记成绩</button></div>':''}<button class="btn modal-secondary" id="again">重新开始</button>`,()=>{bind($('#again'),'click',()=>emit({type:'restart'}));const save=$('#save'),idInput=$('#pid');if(save)bind(save,'click',()=>emit({type:'register',id:idInput.value}))});return}
      if(localOverlay==='rank'){showModal('rank','<h2>排行榜</h2>'+($('#rank').outerHTML||'')+'<button class="btn" id="close">关闭</button>',()=>bind($('#close'),'click',()=>{localOverlay='closed';hideModal()}));return}
      if(localOverlay==='closed'){hideModal();return}
      if(view.overlay==='ready'){showModal('ready','<h2>准备起飞？</h2><button class="btn main" id="go">启动战机</button>',()=>bind($('#go'),'click',()=>emit({type:'start'})));return}
      hideModal();
    }
    function render(snapshot){current=snapshot;renderHud(snapshot);draw(snapshot.game);renderModal(snapshot)}

    renderFighterOptions();
    bind($('#pause'),'click',()=>emit({type:'toggle-pause'}));bind($('#restart'),'click',()=>emit({type:'restart'}));bind($('#skillButton'),'click',()=>emit({type:'skill'}));bind($('#rankBtn'),'click',()=>{localOverlay='rank';renderModal(current)});
    document.querySelectorAll('[data-k]').forEach(button=>{const direction=button.dataset.k,off=()=>emit({type:'direction',direction,pressed:false});bind(button,'pointerdown',event=>{event.preventDefault();emit({type:'direction',direction,pressed:true})});bind(button,'pointerup',off);bind(button,'pointerleave',off);bind(button,'pointercancel',off)});
    return{render,destroy(){listeners.splice(0).forEach(remove=>remove())}};
  }
  return Object.freeze({create});
});
