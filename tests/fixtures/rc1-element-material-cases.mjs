// RC1 review inputs. These are not a supported product file format or rendered samples.
const svg = color => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="'+color+'"/></svg>');
const plain = value => JSON.parse(JSON.stringify(value));
export function cases(moduleDescriptor) {
  const base = () => ({format:'tosampool-scene/v4',width:160,height:96,loop:4,background:{color:'#ffffff',alpha:1},assets:{},entities:[],timeline:{tracks:{},visibility:{}},sceneEffects:{overlay:{},sample:{}}});
  const photo = {locator:svg('#cc4422'),width:16,height:16,mime:'image/svg+xml'};
  const processed = base();processed.assets={original:plain(photo),prepared:{...plain(photo),sourceAssetId:'original',recipe:{width:8,height:8},alphaMask:{locator:svg('#ffffff'),width:16,height:16,mode:'replace-alpha'}}};
  processed.entities=[{id:'photo-object',type:'image',assetId:'prepared',x:25,y:18,w:32,h:32,alpha:.7}];
  const sequence=base();sequence.assets={walk:{...plain(photo),frames:[{locator:svg('#cc4422'),mime:'image/svg+xml'},{locator:svg('#2244cc'),mime:'image/svg+xml'}],fps:2,frameLoop:true}};
  sequence.entities=[{id:'walk-object',type:'image',assetId:'walk',x:20,y:20,w:32,h:32,anim:{bob:{amount:3,period:2,angle:90}}}];
  const vector=base();vector.entities=[{id:'sign',type:'vector',x:28,y:18,w:80,h:50,scaleX:1.2,scaleY:1,parts:[{id:'corners',type:'custom',x:0,y:0,w:80,h:50,stroke:'#ffcc33',strokeWidth:3,recipe:{id:'brackets',version:1,params:{layout:'corners',armX:12,offsetX:2}}}],anim:{spin:{speed:8}}}];
  const procedural=base(),moduleId=moduleDescriptor.manifest.id;procedural.modules={[moduleId]:plain(moduleDescriptor)};
  procedural.entities=[{id:'rain-instance',type:'procedural',moduleId,moduleVersion:1,params:{amount:88,period:6,color:'#ff6600',seed:13},x:24,y:12,w:100,h:60,alpha:.8,
    anim:{bob:{amount:4,period:2,angle:90}},sceneVariants:[{x:10},{x:90}],effects:{sample:{controllers:{'sampling-grid':{size:2}}}}}];
  procedural.timeline={scenes:[{f:[0,.5]},{f:[.5,1]}],tracks:{'rain-instance':{segments:[{f:[0,.5],values:{'params.amount':2,x:3}},{f:[.5,1],values:{'params.amount':240,x:100}}]}},visibility:{'rain-instance':{segments:[{f:[0,.5],visible:false},{f:[.5,1],visible:true}]}}};
  const referenced=base();referenced.assets={stamp:plain(photo)};
  referenced.entities=[
    {id:'host',type:'vector',x:40,y:20,w:60,h:40,parts:[{id:'path',type:'line',x:0,y:10,x2:60,y2:10,stroke:'#ffffff',strokeWidth:1,extensions:{elements:{enabled:true,sourceId:'stamp'}},pathEndpoints:{enabled:true,type:'object',sourceId:'stamp',end:true}}],effects:{mask:{type:'element',targetId:'matte',keepSource:false}}},
    {id:'stamp',type:'image',assetId:'stamp',x:42,y:22,w:8,h:8},
    {id:'matte',type:'ellipse',x:40,y:20,w:60,h:40,fill:'#ffffff'},
    {id:'unrelated',type:'rect',x:1,y:1,w:2,h:2,fill:'#000000'}
  ];
  const text=base();text.assets={raster:{...plain(photo),internal:true,generated:'text-raster'},glyphs:{...plain(photo),internal:true,generated:'text-glyph-atlas'}};
  text.entities=[{id:'label',type:'text',text:'素材',fontId:'user-font-7',fontFamily:'ExampleFont',fontSize:16,rasterAssetId:'raster',glyphAssetId:'glyphs',textCompletion:100,x:0,y:0,w:32,h:16}];
  return [
    {id:'processed-alpha',scene:processed,rootId:'photo-object',expectedAssets:['original','prepared'],selection:{kind:'asset',id:'prepared'}},
    {id:'sequence-global-motion',scene:sequence,rootId:'walk-object',expectedAssets:['walk'],selection:{kind:'asset',id:'walk'}},
    {id:'vector-pattern',scene:vector,rootId:'sign',expectedAssets:[],expectedPatterns:['brackets@1']},
    {id:'procedural-base-not-timeline',scene:procedural,rootId:'rain-instance',expectedAssets:[],selection:{kind:'module',id:moduleId},expectedBaseAmount:88},
    {id:'external-object-references',scene:referenced,rootId:'host',expectedAssets:['stamp'],expectedObjects:['host','matte','stamp']},
    {id:'editable-text',scene:text,rootId:'label',expectedAssets:['glyphs','raster'],expectedFont:'user-font-7'}
  ];
}
