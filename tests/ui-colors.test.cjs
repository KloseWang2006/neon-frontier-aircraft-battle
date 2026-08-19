const assert=require('node:assert/strict');
const fs=require('node:fs');
const test=require('node:test');

const page=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');

test('keeps semantic neon colors for HUD state and powerups',()=>{
  for(const selector of ['.lives','.state-running','.state-paused','.buff-shield','.buff-spread','.buff-double']){
    assert.match(page,new RegExp(selector.replace('.', '\\.')+'[^}]*color:'));
  }
  assert.match(page,/className='state-'\+stateName/);
  assert.match(page,/className='buff buff-'\+id/);
});

test('loads the healing sprite and draws its successful-pickup feedback',()=>{
  assert.match(page,/heal:'power-heal\.png'/);
  assert.match(page,/p\.kind==='heal'\?'#71ff96':'#fd6'/);
  assert.match(page,/s\.healFlashMs>0/);
  assert.match(page,/生命 \+1/);
});

test('exposes fighter selection, dynamic skill status, Q activation, and both skill effects',()=>{
  for(const selector of ['.skill-meter','.skill-meter-fill','.shockwave-ready'])assert.match(page,new RegExp(selector.replace('.', '\\.')+'[^}]*'));
  assert.match(page,/<script src="fighter-catalog\.js"><\/script>/);
  assert.match(page,/id="fighterOptions"/);
  assert.match(page,/function renderFighterOptions\(\)/);
  assert.match(page,/FighterCatalog\.list\(\)/);
  assert.match(page,/FighterCatalog\.get\(s\.fighterId\)/);
  assert.doesNotMatch(page,/data-fighter="azure"/);
  assert.equal(fs.existsSync(require('node:path').join(__dirname,'..','assets','player-silver-stealth.png')),true);
  assert.equal(fs.existsSync(require('node:path').join(__dirname,'..','assets','player-green-ninja.png')),true);
  assert.match(page,/id="skillButton"/);
  assert.match(page,/skillCharge/);
  assert.match(page,/skillCooldownMs/);
  assert.match(page,/e\.key==='q'\|\|e\.key==='Q'/);
  assert.match(page,/function drawShockwave\(s,f\)/);
  assert.match(page,/s\.shockwaveFlashMs<=0/);
  assert.match(page,/function drawStealth\(s,f\)/);
  assert.match(page,/s\.stealthMs<=0/);
  assert.match(page,/--fighter-rotation/);
  assert.match(page,/X\.rotate\(rotation\*Math\.PI\/180\)/);
  assert.match(page,/b\.color\|\|/);
  assert.match(page,/RunSession\.selectFighter/);
  assert.match(page,/f\.visual\.effect\.kind!=='wingmen'/);
  assert.match(page,/function drawWingmen\(s,f\)/);
});

test('uses a desktop action column for fighter selection, run controls, and movement',()=>{
  assert.match(page,/class="side status-side"/);
  assert.match(page,/class="side action-side"/);
  assert.match(page,/\.layout\{grid-template-columns:420px 267px 267px\}/);
  assert.match(page,/@media\(max-width:1050px\)\{\.layout\{grid-template-columns:420px 267px\}/);
  assert.ok(page.indexOf('class="side status-side"')<page.indexOf('class="side action-side"'));
  assert.ok(page.indexOf('class="side action-side"')<page.indexOf('移动与射击'));
});

test('stacks the score-registration form and restart action in the end modal',()=>{
  assert.match(page,/\.register-form\{display:grid/);
  assert.match(page,/\.modal-secondary\{width:100%/);
  assert.match(page,/class="register-form"/);
  assert.match(page,/Player ID/);
  assert.ok(page.indexOf('id="save"')<page.indexOf('id="again"'));
});
