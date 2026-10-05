/* A captured response from a history-isolated creative sub-agent.
 * It intentionally contains both a question and directions: the protocol must
 * expose only the correct part for the active conversational phase. */
export const snowglobeAgentReply=Object.freeze({
  reply:'你想做一个可循环播放、由春夏秋冬依次流转的雪花球画面。我先确认一个会影响结构的选择：你希望四季变化主要通过轻量视觉替换，还是需要每一季都能独立编辑并加入不同的叙事动作？',
  question:{
    id:'control',label:'选择你希望保留的控制程度',choices:[
      {value:'light',label:'轻量循环：以整体氛围转换为主'},
      {value:'semantic',label:'季节语义：可分别调整每季元素'},
      {value:'structural',label:'结构化：每季是可独立编排的模块'},
    ],
  },
  candidates:[
    {
      id:'seasonal-orb-morph',title:'雪球四季渐变',
      summary:'以一个透明雪球、底座和内部景观图元为核心，通过颜色、植被、天气粒子连续变形完成四季循环。',
      carrier:'普通对象与图元',editable:['季节配色','树木与地表状态','花瓣、雨滴、落叶、雪粒数量','循环时长'],
      frozen:['雪球容器轮廓','基础转场节奏'],assetPlan:'不需要外部图片；使用雪球、底座、树木、地形和天气粒子等图元构成。',budget:{tier:'low',reason:'复用同一套对象，仅切换与插值少量视觉属性。'},
    },
    {
      id:'four-season-diorama',title:'四季景观球',
      summary:'雪球中设置四组可辨识的季节景观，在球体旋转中依次来到正面，形成更强的四季叙事感。',
      carrier:'项目 Scene Module',editable:['每个季节模块的景观','角色或动物小动作','季节进入顺序','模块切换速度'],
      frozen:['雪球与底座主结构','模块衔接方式'],assetPlan:'不需要独立背景图；四个 Scene Module 分别承载春夏秋冬景观，雪球作为外层普通对象。',budget:{tier:'medium',reason:'每季需独立维护一组场景对象，但可共享雪球容器与交互节奏。'},
    },
    {
      id:'storybook-snowglobe',title:'绘本雪花球四幕',
      summary:'让雪球成为一个小型绘本舞台：花开、晴空、金叶、降雪分别以更丰富的镜头和层次推进，最后无缝回到春天。',
      carrier:'项目 Scene Module、图元与图片对象',editable:['每季画面构图','景深层次','装饰插画','天气与镜头运动','循环衔接'],
      frozen:['四幕主叙事顺序','雪球外框与底座比例'],assetPlan:'可选用少量季节纹理或插画作为图片对象；不使用独立背景图，背景氛围由场景内图元和图片对象分层构成。',budget:{tier:'high',reason:'需要四个具有独立构图和层次的场景模块，并管理图片素材与无缝转场。'},
    },
  ],
});
