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
