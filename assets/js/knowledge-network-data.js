/* 思维导图：手工维护的数据（不由 build.py 生成，可直接编辑；格式与维护方法见 docs/knowledge-network.md）。
 *
 * 只记录人工整理的内容：领域、部分（每期登记到唯一部分）、单元、概念、关系、专题、主线、大题任务、推导方法、题型记录。
 * 没有整理到的期和考点，由 knowledge-network.js 在运行时根据 SITE（site-data.js）自动生成"按讲义顺序"的兜底节点，
 * 所以这里缺什么都不会让考点不可达。
 *
 * 讲义位置写成 "期/锚点"（如 "xb2-03/p4"），并带标题快照 t，用于讲义更新后发现错位。
 * 关系的 status：
 *   site   —— 依据是站内讲义原文，basis 里的 quote 可在该讲义中逐字查到（只说明讲义这样写，不代表另经专家审定）；
 *   editor —— 编辑判断，待确认（可附原文作参考，但"关系本身"是整理者的归纳）；
 *   title  —— 仅依据考点标题，正文待核。
 *
 * basis 的条目种类：
 *   { kind: 'site', ref: '期/锚点', quote: '…' }  站内讲义原文，校验逐字核对；
 *   { kind: 'editor', note: '…' }                  整理者的说明或判断；
 *   { kind: 'figure', ref: 'IMG_….jpg', note: '…' } 教材知识框架参考图（docs/knowledge-map/ 下的原文件名），
 *       只作整理来源记录：note 写"第几讲"与图上写法；网站不显示、不链接图片。
 *       图片依据不算站内核验——只有图片依据的关系 status 必须是 'editor'；status:'site' 仍须有可逐字查到的 site 引文。
 *       图上模糊的细箭头（如第18讲信息传递旁、第16讲植物调节）不据此写确定关系；确需引用时标 editor，并在 note 中写明终点待核对。
 *
 * relGroups：思维导图"关系类型"按钮组（顺序即显示顺序）。每个关系类型（arrange、collect 除外）只归入一个组；
 *   default:true 的组在首次打开时启用。按钮组只控制叠加显示哪些关系，与"主题主线"（lines）是不同的维度。
 */
window.KN_DATA = {
  version: 1,
  updated: '2026-11-16',

  /* 关系类型。arrange（编排归类）与 collect（专题收录）由骨架和专题隐含，不单独写成关系。 */
  relTypes: {
    arrange: { name: '编排归类', note: '只是按讲义或复习需要放在一起，不表示"属于"' },
    collect: { name: '专题收录', note: '专题对现有知识的引用' },
    compose: { name: '组成', note: '真实的组成关系' },
    cause: { name: '因果·影响', note: '一方影响或决定另一方' },
    seq: { name: '先后', note: '过程或步骤的先后' },
    instance: { name: '实例·依据', note: '一方是另一方的实例，或为其提供依据' },
    basis: { name: '基础·依托', note: '一方是另一方的基础、渠道或载体' },
    contrast: { name: '对比', note: '容易混淆，需要区分' },
    analogy: { name: '类比', note: '推理结构相似，对象和机制不同，不能互换' },
    scale: { name: '跨尺度对应', note: '同一过程在不同生命系统层次上的对应，不是因果' },
    apply: { name: '原理→应用', note: '后者应用前者的原理' },
    measure: { name: '方法·表征', note: '一方是调查、测定或表征另一方的方法，不是因果' }
  },

  /* 关系类型按钮组（见文件头说明）。 */
  relGroups: [
    { id: 'rg-compose', name: '组成与基础', types: ['compose', 'basis'], default: true },
    { id: 'rg-cause', name: '因果与影响', types: ['cause'], default: true },
    { id: 'rg-seq', name: '过程与顺序', types: ['seq'], default: true },
    { id: 'rg-contrast', name: '对比与类比', types: ['contrast', 'analogy'], default: false },
    { id: 'rg-apply', name: '实例与应用', types: ['instance', 'apply', 'measure'], default: true },
    { id: 'rg-scale', name: '跨尺度联系', types: ['scale'], default: false }
  ],

  /* 学科图第一圈。顺序是编辑安排（大致从细胞到个体、群体再到技术），不是严格的尺度序列。 */
  domains: [
    { id: 'd-cell', name: '细胞的物质与结构' },
    { id: 'd-metab', name: '细胞的代谢与能量' },
    { id: 'd-life', name: '细胞的增殖与生命历程' },
    { id: 'd-gene', name: '遗传的规律与分子基础' },
    { id: 'd-evo', name: '变异与进化' },
    { id: 'd-steady', name: '个体的稳态与调节' },
    { id: 'd-eco', name: '种群、群落与生态系统' },
    { id: 'd-tech', name: '生物技术与工程' }
  ],

  /* 全书图第一圈：部分。每一期登记到唯一的部分（校验会检查遗漏和重复）。 */
  parts: [
    { id: 'bx1-intro', book: 'bx1', domain: 'd-cell', name: '细胞学说与细胞多样性', eps: ['bx1-01', 'bx1-02'] },
    { id: 'bx1-molecule', book: 'bx1', domain: 'd-cell', name: '组成细胞的分子', eps: ['bx1-03', 'bx1-04', 'bx1-05', 'bx1-06', 'bx1-07'] },
    { id: 'bx1-structure', book: 'bx1', domain: 'd-cell', name: '细胞的基本结构', eps: ['bx1-08', 'bx1-09', 'bx1-10', 'bx1-11'] },
    { id: 'bx1-transport', book: 'bx1', domain: 'd-cell', name: '物质输入和输出', eps: ['bx1-12', 'bx1-13'] },
    { id: 'bx1-enzyme', book: 'bx1', domain: 'd-metab', name: '酶与ATP', eps: ['bx1-14', 'bx1-15', 'bx1-16'] },
    { id: 'bx1-resp', book: 'bx1', domain: 'd-metab', name: '细胞呼吸', eps: ['bx1-17', 'bx1-18'] },
    { id: 'bx1-photo', book: 'bx1', domain: 'd-metab', name: '光合作用', eps: ['bx1-19', 'bx1-20', 'bx1-21'] },
    { id: 'bx1-division', book: 'bx1', domain: 'd-life', name: '细胞增殖', eps: ['bx1-22', 'bx1-23'] },
    { id: 'bx1-fate', book: 'bx1', domain: 'd-life', name: '分化、衰老与死亡', eps: ['bx1-24', 'bx1-25'] },

    { id: 'bx2-mendel', book: 'bx2', domain: 'd-gene', name: '孟德尔遗传规律', eps: ['bx2-01', 'bx2-02', 'bx2-03', 'bx2-04'] },
    { id: 'bx2-meiosis', book: 'bx2', domain: 'd-gene', name: '减数分裂与受精', eps: ['bx2-05', 'bx2-06'] },
    { id: 'bx2-sexlink', book: 'bx2', domain: 'd-gene', name: '基因在染色体上与伴性遗传', eps: ['bx2-07', 'bx2-08'] },
    { id: 'bx2-dna', book: 'bx2', domain: 'd-gene', name: '基因的本质', eps: ['bx2-09', 'bx2-10', 'bx2-11', 'bx2-12'] },
    { id: 'bx2-express', book: 'bx2', domain: 'd-gene', name: '基因的表达', eps: ['bx2-13', 'bx2-14', 'bx2-15'] },
    { id: 'bx2-variation', book: 'bx2', domain: 'd-evo', name: '变异与育种', eps: ['bx2-16', 'bx2-17', 'bx2-18'] },
    { id: 'bx2-disease', book: 'bx2', domain: 'd-evo', name: '人类遗传病', eps: ['bx2-19'] },
    { id: 'bx2-evolution', book: 'bx2', domain: 'd-evo', name: '生物的进化', eps: ['bx2-20', 'bx2-21', 'bx2-22', 'bx2-23', 'bx2-24'] },

    { id: 'xb1-internal', book: 'xb1', domain: 'd-steady', name: '内环境与稳态', eps: ['xb1-01', 'xb1-02'] },
    { id: 'xb1-neural', book: 'xb1', domain: 'd-steady', name: '神经调节', eps: ['xb1-03', 'xb1-04', 'xb1-05', 'xb1-06', 'xb1-07', 'xb1-08'] },
    { id: 'xb1-humoral', book: 'xb1', domain: 'd-steady', name: '体液调节', eps: ['xb1-09', 'xb1-10', 'xb1-11', 'xb1-12'] },
    { id: 'xb1-immune', book: 'xb1', domain: 'd-steady', name: '免疫调节', eps: ['xb1-13', 'xb1-14', 'xb1-15', 'xb1-16', 'xb1-17'] },
    { id: 'xb1-plant', book: 'xb1', domain: 'd-steady', name: '植物生命活动的调节', eps: ['xb1-18', 'xb1-19', 'xb1-20', 'xb1-21', 'xb1-22'] },

    { id: 'xb2-pop', book: 'xb2', domain: 'd-eco', name: '种群', eps: ['xb2-01', 'xb2-02', 'xb2-03'] },
    { id: 'xb2-comm', book: 'xb2', domain: 'd-eco', name: '群落', eps: ['xb2-04', 'xb2-05', 'xb2-06'] },
    { id: 'xb2-eco', book: 'xb2', domain: 'd-eco', name: '生态系统', eps: ['xb2-07', 'xb2-08', 'xb2-09', 'xb2-10', 'xb2-11', 'xb2-12'] },
    { id: 'xb2-human', book: 'xb2', domain: 'd-eco', name: '人与环境', eps: ['xb2-13', 'xb2-14', 'xb2-15'] },

    { id: 'xb3-ferment', book: 'xb3', domain: 'd-tech', name: '发酵工程', eps: ['xb3-01', 'xb3-02', 'xb3-03', 'xb3-04'] },
    { id: 'xb3-plantcell', book: 'xb3', domain: 'd-tech', name: '植物细胞工程', eps: ['xb3-05', 'xb3-06'] },
    { id: 'xb3-animalcell', book: 'xb3', domain: 'd-tech', name: '动物细胞工程', eps: ['xb3-07', 'xb3-08', 'xb3-09'] },
    { id: 'xb3-embryo', book: 'xb3', domain: 'd-tech', name: '胚胎工程', eps: ['xb3-10', 'xb3-11'] },
    { id: 'xb3-gene', book: 'xb3', domain: 'd-tech', name: '基因工程与蛋白质工程', eps: ['xb3-12', 'xb3-13', 'xb3-14', 'xb3-15', 'xb3-16'] },
    { id: 'xb3-ethics', book: 'xb3', domain: 'd-tech', name: '安全性与伦理', eps: ['xb3-17', 'xb3-18'] }
  ],

  /* 单元：一组紧密相关的知识，可跨期。未整理单元的部分，运行时直接用"期"顶替。当前只整理了选必2。 */
  units: [
    { id: 'u-xb2-traits', part: 'xb2-pop', name: '数量特征与调查', eps: ['xb2-01'] },
    { id: 'u-xb2-model', part: 'xb2-pop', name: '数量变化模型', eps: ['xb2-02'] },
    { id: 'u-xb2-factor', part: 'xb2-pop', name: '影响因素与应用', eps: ['xb2-03'] },
    { id: 'u-xb2-structure', part: 'xb2-comm', name: '群落的结构', eps: ['xb2-04'] },
    { id: 'u-xb2-types', part: 'xb2-comm', name: '类型与适应', eps: ['xb2-05'] },
    { id: 'u-xb2-succession', part: 'xb2-comm', name: '演替', eps: ['xb2-06'] },
    { id: 'u-xb2-ecostruct', part: 'xb2-eco', name: '生态系统的结构', eps: ['xb2-07'] },
    { id: 'u-xb2-energy', part: 'xb2-eco', name: '能量流动', eps: ['xb2-08', 'xb2-09'] },
    { id: 'u-xb2-matter', part: 'xb2-eco', name: '物质循环', eps: ['xb2-10'] },
    { id: 'u-xb2-info', part: 'xb2-eco', name: '信息传递', eps: ['xb2-11'] },
    { id: 'u-xb2-stable', part: 'xb2-eco', name: '稳定性', eps: ['xb2-12'] },
    { id: 'u-xb2-impact', part: 'xb2-human', name: '人类活动的影响', eps: ['xb2-13'] },
    { id: 'u-xb2-diversity', part: 'xb2-human', name: '生物多样性及保护', eps: ['xb2-14'] },
    { id: 'u-xb2-engineer', part: 'xb2-human', name: '生态工程', eps: ['xb2-15'] },

    /* ==== 必修1 · 单元整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （必修1 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */

    /* ==== 必修2 · 单元整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （必修2 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */

    /* ==== 选必1 · 单元整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （选必1 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */

    /* ==== 选必2 · 单元整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （选必2 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */

    /* ==== 选必3 · 单元整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （选必3 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */
  ],

  /* 概念：稳定 ID；可挂多个讲义位置（第一个为主位置）；一个考点也可以拆成多个概念。
   * brief 摘自讲义原文（briefRef 为出处），校验脚本会逐字核对。 */
  concepts: [
    /* ---- 选必2 · 种群 ---- */
    { id: 'k-pop-density', name: '种群密度', targets: [{ ref: 'xb2-01/p1', t: '种群密度' }],
      brief: '种群密度是种群最基本的数量特征，它反映了种群在一定时期的数量。', briefRef: 'xb2-01/p1' },
    { id: 'k-quadrat', name: '样方法', targets: [{ ref: 'xb2-01/p2', t: '样方法' }],
      brief: '适用于植物，以及活动能力弱、活动范围小的动物，比如蚯蚓、蚜虫、跳蝻和昆虫卵。', briefRef: 'xb2-01/p2' },
    { id: 'k-mark', name: '标记重捕法', targets: [{ ref: 'xb2-01/p3', t: '标记重捕法' }],
      brief: '适用于活动能力强、活动范围大的动物，比如田鼠、鸟类、鱼类。', briefRef: 'xb2-01/p3' },
    { id: 'k-survey-other', name: '其他调查方法', targets: [{ ref: 'xb2-01/p4', t: '其他调查方法' }],
      brief: '先问它动不动、跑多远，再看有没有趋光性、是否难以接近。', briefRef: 'xb2-01/p4' },
    { id: 'k-rates', name: '出生率、死亡率、迁入率、迁出率', alias: ['四个率'], targets: [{ ref: 'xb2-01/p5', t: '出生率和迁入率' }],
      brief: '出生率加迁入率，大于死亡率加迁出率，种群密度就增大，反之就减小。', briefRef: 'xb2-01/p5' },
    { id: 'k-age', name: '年龄结构', targets: [{ ref: 'xb2-01/p6', t: '年龄结构' }],
      brief: '年龄结构只能预测变化趋势。', briefRef: 'xb2-01/p6' },
    { id: 'k-sexratio', name: '性别比例', targets: [{ ref: 'xb2-01/p7', t: '性别比例' }],
      brief: '它是种群中雌雄个体数目的比例，通过影响出生率来影响种群密度。', briefRef: 'xb2-01/p7' },
    { id: 'k-traits', name: '数量特征之间的关系', targets: [{ ref: 'xb2-01/p8', t: '数量特征的关系' }],
      brief: '出生率、死亡率、迁入率、迁出率，直接决定种群密度。', briefRef: 'xb2-01/p8' },
    { id: 'k-model', name: '建构数学模型', targets: [{ ref: 'xb2-02/p1', t: '建构数学模型' }],
      brief: '数学模型是用来描述一个系统或它的性质的数学形式。', briefRef: 'xb2-02/p1' },
    { id: 'k-jcurve', name: '“J”形增长', alias: ['J形增长', 'J型增长'], targets: [{ ref: 'xb2-02/p2', t: '“J”形增长' }],
      brief: '条件是食物和空间条件充裕、气候适宜、没有天敌和其他竞争物种等理想条件。', briefRef: 'xb2-02/p2' },
    { id: 'k-scurve', name: '“S”形增长与K值', alias: ['S形增长', 'S型增长', '环境容纳量'], targets: [{ ref: 'xb2-02/p3', t: '“S”形增长与K值' }],
      brief: '种群密度增大，种内竞争加剧，天敌数量也会增加，于是出生率降低、死亡率升高。', briefRef: 'xb2-02/p3' },
    { id: 'k-growthrate', name: '增长速率曲线', targets: [{ ref: 'xb2-02/p4', t: '增长速率曲线' }],
      brief: '增长速率最高点 ↔ K/2，降到零 ↔ K值；增长速率最大时，数量并不最多', briefRef: 'xb2-02/p4' },
    { id: 'k-kapply', name: 'K值与K/2的应用', targets: [{ ref: 'xb2-02/p5', t: 'K值的应用' }],
      brief: '是捕捞后剩余 K/2，不是数量到 K/2 就开始捕；灭鼠关键是降低K值，不是把数量控制在 K/2', briefRef: 'xb2-02/p5' },
    { id: 'k-fluct', name: '种群数量的波动和下降', targets: [{ ref: 'xb2-02/p6', t: '波动和下降' }],
      brief: '在自然界，大多数种群的数量总是在波动中。', briefRef: 'xb2-02/p6' },
    { id: 'k-lambda', name: 'λ曲线的判读', targets: [{ ref: 'xb2-02/p8', t: 'λ曲线的判读' }],
      brief: '看 λ 和 1 比大小，不看 λ 升还是降', briefRef: 'xb2-02/p8' },
    { id: 'k-abiotic', name: '非生物因素', targets: [{ ref: 'xb2-03/p1', t: '非生物因素' }],
      brief: '阳光、温度、水等都会影响种群数量。', briefRef: 'xb2-03/p1' },
    { id: 'k-biotic', name: '生物因素', targets: [{ ref: 'xb2-03/p2', t: '生物因素' }],
      brief: '种内竞争是种群内部因素，不属于种间关系；捕食、竞争、寄生才是种间关系', briefRef: 'xb2-03/p2' },
    { id: 'k-density-dep', name: '密度制约因素', targets: [{ ref: 'xb2-03/p3', t: '密度制约因素' }],
      brief: '密度制约因素：对种群数量的作用强度与种群密度相关，一般是食物和天敌等生物因素。', briefRef: 'xb2-03/p3' },
    { id: 'k-predprey', name: '捕食者与猎物曲线', targets: [{ ref: 'xb2-03/p4', t: '捕食者与猎物曲线' }],
      brief: '先增先减的是被捕食者；被捕食者数量一般多于捕食者；这种调节属于负反馈', briefRef: 'xb2-03/p4' },
    { id: 'k-endangered', name: '保护濒危动物', targets: [{ ref: 'xb2-03/p5', t: '保护濒危动物' }],
      brief: '先调查种群的数量、年龄结构和性别比例，分析影响它们数量变化的因素。', briefRef: 'xb2-03/p5' },
    { id: 'k-pest', name: '有害生物的防治', targets: [{ ref: 'xb2-03/p6', t: '防治与渔业' }],
      brief: '防治有害生物，要监测和预报种群数量的变化，在数量较少时及早防治。', briefRef: 'xb2-03/p6' },
    { id: 'k-fishery', name: '渔业资源的合理利用', targets: [{ ref: 'xb2-03/p6', t: '防治与渔业' }],
      brief: '渔业上，要控制捕捞强度和网眼大小，捕捞后让种群数量保持在适当水平，让鱼群持续高产。', briefRef: 'xb2-03/p6' },

    /* ---- 选必2 · 群落 ---- */
    { id: 'k-interspecific', name: '五种种间关系', alias: ['种间关系'], targets: [{ ref: 'xb2-04/p3', t: '五种种间关系' }],
      brief: '原始合作 vs 互利共生：看分开后能不能独立生活', briefRef: 'xb2-04/p3' },
    { id: 'k-intercurve', name: '种间关系曲线', targets: [{ ref: 'xb2-04/p4', t: '种间关系曲线' }],
      brief: '同步变化 → 互利共生；交替波动 → 捕食；此消彼长 → 竞争', briefRef: 'xb2-04/p4' },
    { id: 'k-niche', name: '生态位', targets: [{ ref: 'xb2-04/p7', t: '生态位' }],
      brief: '一个物种在群落中的地位或作用，包括所处的空间位置、占用资源的情况，以及与其他物种的关系。', briefRef: 'xb2-04/p7' },
    { id: 'k-commtype', name: '群落类型的划分', targets: [{ ref: 'xb2-05/p1', t: '群落类型的划分' }],
      brief: '决定陆地群落类型的关键，是水分和温度等非生物因素。', briefRef: 'xb2-05/p1' },
    { id: 'k-comm-adapt', name: '群落中的生物适应环境', targets: [{ ref: 'xb2-05/p6', t: '生物适应环境' }],
      brief: '群落中的生物都是适应所处的非生物环境的，不同群落中生物适应环境的方式不尽相同。', briefRef: 'xb2-05/p6' },

    /* ---- 选必2 · 生态系统 ---- */
    { id: 'k-ecosystem', name: '生态系统的概念', targets: [{ ref: 'xb2-07/p1', t: '生态系统的概念' }],
      brief: '在一定空间内，由生物群落与它的非生物环境相互作用而形成的统一整体，叫做生态系统。', briefRef: 'xb2-07/p1' },
    { id: 'k-foodchain', name: '食物链', targets: [{ ref: 'xb2-07/p5', t: '食物链' }],
      brief: '生态系统中各种生物因食物关系而形成的一种联系，叫做食物链。', briefRef: 'xb2-07/p5' },
    { id: 'k-foodweb', name: '食物网', targets: [{ ref: 'xb2-07/p6', t: '食物网' }],
      brief: '许多食物链彼此相互交错，连接成复杂的营养关系，就是食物网。', briefRef: 'xb2-07/p6' },
    { id: 'k-web-change', name: '食物网中的数量变化', targets: [{ ref: 'xb2-07/p7', t: '数量变化分析' }],
      brief: '天敌减少：被捕食者先增加，后因种内竞争加剧而减少，最后趋于稳定。', briefRef: 'xb2-07/p7' },
    { id: 'k-energyflow', name: '能量流动的概念', targets: [{ ref: 'xb2-08/p1', t: '能量流动的概念' }],
      brief: '总能量是生产者固定的太阳能，不是照射到生产者上的太阳能，也不是生产者积累的能量', briefRef: 'xb2-08/p1' },
    { id: 'k-energy-in', name: '能量的输入：流经第一营养级', alias: ['能量流动的输入'], targets: [{ ref: 'xb2-08/p2', t: '流经第一营养级' }],
      brief: '生产者通过光合作用，把太阳能固定在有机物中。', briefRef: 'xb2-08/p2' },
    { id: 'k-assim', name: '同化量的去向', targets: [{ ref: 'xb2-08/p4', t: '同化量的去向' }],
      brief: '同化量 = 呼吸作用散失 + 用于生长、发育和繁殖。', briefRef: 'xb2-08/p4' },
    { id: 'k-energy-feature', name: '单向流动、逐级递减', targets: [{ ref: 'xb2-08/p6', t: '单向流动逐级递减' }],
      brief: '单向流动：只能沿食物链由低营养级流向高营养级，不可逆转，也不能循环流动。', briefRef: 'xb2-08/p6' },
    { id: 'k-efficiency', name: '传递效率的计算', targets: [{ ref: 'xb2-09/p1', t: '传递效率的计算' }],
      brief: '传递效率 = 下一营养级同化量 ÷ 上一营养级同化量 × 100%。', briefRef: 'xb2-09/p1' },
    { id: 'k-energy-adjust', name: '调整能量流动关系', targets: [{ ref: 'xb2-09/p6', t: '调整能量流动关系' }],
      brief: '除草灭虫的意义：调整能量流动关系，使能量持续高效地流向对人类最有益的部分', briefRef: 'xb2-09/p6' },
    { id: 'k-carbon', name: '碳循环的过程', targets: [{ ref: 'xb2-10/p2', t: '碳循环的过程' }],
      brief: '碳进入生物群落，主要靠生产者的光合作用，还有化能合成作用。', briefRef: 'xb2-10/p2' },
    { id: 'k-magnify', name: '生物富集', targets: [{ ref: 'xb2-10/p5', t: '生物富集' }],
      brief: '这些物质在生物体内难以降解、不易排出，会沿食物链逐级积累，营养级越高，浓度越高。', briefRef: 'xb2-10/p5' },
    { id: 'k-energy-matter', name: '能量流动与物质循环的关系', targets: [{ ref: 'xb2-10/p6', t: '能量流动与物质循环' }],
      brief: '物质是能量的载体，能量沿着食物链流动，就储存在有机物中；能量是物质循环的动力。', briefRef: 'xb2-10/p6' },
    { id: 'k-info-agri', name: '信息传递在农业生产中的应用', targets: [{ ref: 'xb2-11/p5', t: '在农业生产中的应用' }],
      brief: '利用信息素防治害虫属于生物防治，不是化学防治。', briefRef: 'xb2-11/p5' },
    { id: 'k-eco-feedback', name: '生态平衡与负反馈', targets: [{ ref: 'xb2-12/p1', t: '生态平衡与负反馈' }],
      brief: '维持生态平衡的机制是负反馈调节。', briefRef: 'xb2-12/p1' },
    { id: 'k-selfreg', name: '自我调节能力', targets: [{ ref: 'xb2-12/p2', t: '自我调节能力' }],
      brief: '负反馈调节是自我调节能力的基础。', briefRef: 'xb2-12/p2' },

    /* ---- 选必2 · 人与环境（含跨册同一概念） ---- */
    { id: 'k-diversity', name: '生物多样性的三个层次', alias: ['遗传多样性', '物种多样性', '生态系统多样性'],
      targets: [{ ref: 'xb2-14/p1', t: '三个层次' }, { ref: 'bx2-24/p3', t: '生物多样性三层次' }],
      brief: '生物多样性的三个层次：遗传多样性、物种多样性、生态系统多样性。', briefRef: 'bx2-24/p3' },
    { id: 'k-cycle-principle', name: '循环原理', targets: [{ ref: 'xb2-15/p3', t: '循环原理' }],
      brief: '通过系统设计，使前一环节产生的废物尽可能地被后一环节利用，减少整个生产环节“废物”的产生。', briefRef: 'xb2-15/p3' },

    /* ---- 必修1（主线与方法组用到的少量概念） ---- */
    { id: 'k-life-levels', name: '生命系统的结构层次', targets: [{ ref: 'bx1-01/p6', t: '生命系统结构层次' }],
      brief: '一定区域内同种生物的所有个体是种群；所有生物是群落；再加上无机环境就是生态系统。', briefRef: 'bx1-01/p6' },
    { id: 'k-atp-source', name: '合成ATP的能量来源', targets: [{ ref: 'bx1-16/p4', t: '合成ATP的能量来源' }],
      brief: '对于绿色植物来说，能量来自细胞呼吸和光合作用。', briefRef: 'bx1-16/p4' },
    { id: 'k-aerobic-energy', name: '有氧呼吸的能量与元素去向', targets: [{ ref: 'bx1-17/p6', t: '能量与元素去向' }],
      brief: '三个阶段都能产生ATP，第三阶段产生的最多。', briefRef: 'bx1-17/p6' },
    { id: 'k-photo-eq', name: '光合作用总反应式', alias: ['光合作用'], targets: [{ ref: 'bx1-20/p2', t: '光合作用总反应式' }],
      brief: '绿色植物通过叶绿体，利用光能，把CO2和水转化成储存着能量的有机物，并且释放出O2。', briefRef: 'bx1-20/p2' },
    { id: 'k-chemo', name: '化能合成作用', targets: [{ ref: 'bx1-20/p7', t: '化能合成作用' }],
      brief: '少数细菌利用体外环境中某些无机物氧化时释放的能量来制造有机物，叫化能合成作用。', briefRef: 'bx1-20/p7' },
    { id: 'k-gross-net', name: '总光合与净光合', targets: [{ ref: 'bx1-21/p4', t: '总光合与净光合' }],
      brief: '总光合速率 = 净光合速率 + 呼吸速率。', briefRef: 'bx1-21/p4' },
    { id: 'k-totipotency', name: '细胞的全能性', targets: [{ ref: 'bx1-24/p4', t: '细胞的全能性' }, { ref: 'xb3-05/p1', t: '细胞的全能性' }],
      brief: '细胞经分裂和分化后，仍具有产生完整有机体或分化成其他各种细胞的潜能和特性。', briefRef: 'bx1-24/p4' },

    /* ---- 必修2 ---- */
    { id: 'k-dna-rep', name: 'DNA复制', targets: [{ ref: 'bx2-11/p4', t: 'DNA复制的过程' }, { ref: 'bx2-11/p5', t: '复制的特点与意义' }],
      brief: 'DNA 复制的特点：边解旋边复制，半保留复制。', briefRef: 'bx2-11/p5' },
    { id: 'k-transcribe', name: '转录的过程', targets: [{ ref: 'bx2-13/p4', t: '转录的过程' }],
      brief: '在 RNA 聚合酶的作用下，核糖核苷酸依次连接，RNA 链从 5′ 端向 3′ 端延伸。', briefRef: 'bx2-13/p4' },
    { id: 'k-codon', name: '密码子', targets: [{ ref: 'bx2-14/p2', t: '密码子' }],
      brief: '密码子：mRNA 上决定一个氨基酸的 3 个相邻碱基。', briefRef: 'bx2-14/p2' },
    { id: 'k-dogma', name: '中心法则', targets: [{ ref: 'bx2-14/p8', t: '中心法则及其发展' }],
      brief: '遗传信息可以从 DNA 流向 DNA，即复制；也可以从 DNA 流向 RNA，进而流向蛋白质，即转录和翻译。', briefRef: 'bx2-14/p8' },
    { id: 'k-adapt-form', name: '适应的形成', targets: [{ ref: 'bx2-21/p4', t: '适应的形成' }],
      brief: '适应是自然选择的结果；群体中出现可遗传的有利变异和环境的定向选择，是适应形成的必要条件。', briefRef: 'bx2-21/p4' },
    { id: 'k-coevolution', name: '协同进化', targets: [{ ref: 'bx2-24/p1', t: '协同进化的概念' }],
      brief: '协同进化：不同物种之间、生物与无机环境之间在相互影响中不断进化和发展。', briefRef: 'bx2-24/p1' },

    /* ---- 选必1 ---- */
    { id: 'k-feedback-glucose', name: '反馈调节（以血糖为例）', alias: ['负反馈调节', '反馈调节'], targets: [{ ref: 'xb1-10/p4', t: '反馈调节' }],
      brief: '负反馈调节是生命系统中非常普遍的调节机制，对于机体维持稳态具有重要意义。', briefRef: 'xb1-10/p4' },
    { id: 'k-feedback-thyroid', name: '甲状腺激素的负反馈', targets: [{ ref: 'xb1-11/p3', t: '负反馈调节' }],
      brief: '当血液中的甲状腺激素含量增加到一定程度时，又会抑制下丘脑和垂体分泌TRH和TSH。', briefRef: 'xb1-11/p3' },

    /* ---- 选必3 ---- */
    { id: 'k-pcr', name: 'PCR的原理与过程', targets: [{ ref: 'xb3-13/p3', t: 'PCR的原理与过程' }],
      brief: 'PCR是聚合酶链式反应，原理是DNA半保留复制。', briefRef: 'xb3-13/p3' },
    { id: 'k-promoter', name: '启动子与起始密码子', targets: [{ ref: 'xb3-13/p7', t: '启动子与起始密码' }],
      brief: '启动子不是起始密码子，终止子不是终止密码子：一个看 DNA 和转录，一个看 mRNA 和翻译', briefRef: 'xb3-13/p7' },
    { id: 'k-protein-eng', name: '蛋白质工程的思路', targets: [{ ref: 'xb3-16/p2', t: '蛋白质工程的思路' }],
      brief: '思路与中心法则方向相反；因为密码子的简并，推出的脱氧核苷酸序列不是唯一的', briefRef: 'xb3-16/p2' },

    /* ==== 必修1 · 概念整理区（以下按册追加；每条末尾带逗号） ==== */
    /* ---- 必修1 · 组成细胞的分子（参考第1讲知识框架图） ---- */
    { id: 'k-carbon-core', name: '碳是生命的核心元素', targets: [{ ref: 'bx1-03/p3', t: '核心元素与含量' }],
      brief: '生物大分子以碳链为基本骨架，所以说碳是生命的核心元素。', briefRef: 'bx1-03/p3' },
    { id: 'k-reducing-sugar-test', name: '检测还原糖（斐林试剂）', targets: [{ ref: 'bx1-03/p5', t: '检测还原糖' }],
      brief: '葡萄糖、果糖、麦芽糖等还原糖，与斐林试剂发生作用，生成砖红色沉淀。', briefRef: 'bx1-03/p5' },
    { id: 'k-protein-test', name: '检测蛋白质（双缩脲试剂）', targets: [{ ref: 'bx1-03/p7', t: '检测蛋白质' }],
      brief: '蛋白质与双缩脲试剂发生作用，产生紫色反应。', briefRef: 'bx1-03/p7' },
    { id: 'k-water-ratio', name: '自由水与结合水的比值', targets: [{ ref: 'bx1-04/p4', t: '比值与代谢抗逆' }],
      brief: '比值越高，细胞代谢越旺盛。', briefRef: 'bx1-04/p4' },
    { id: 'k-salt-compound', name: '无机盐组成复杂化合物', targets: [{ ref: 'bx1-04/p5', t: '无机盐组成化合物' }],
      brief: '有些无机盐是复杂化合物的重要组成成分：Mg是叶绿素的组成成分，Fe是血红素的组成成分。', briefRef: 'bx1-04/p5' },
    { id: 'k-polysaccharide', name: '多糖', targets: [{ ref: 'bx1-05/p4', t: '多糖' }],
      brief: '淀粉、糖原、纤维素的基本单位都是葡萄糖，但葡萄糖的连接方式不同，所以性质不同。', briefRef: 'bx1-05/p4' },
    { id: 'k-lipid-kinds', name: '脂质的种类与功能', targets: [{ ref: 'bx1-05/p5', t: '脂质的种类与功能' }],
      brief: '磷脂是构成细胞膜和多种细胞器膜的重要成分。', briefRef: 'bx1-05/p5' },
    { id: 'k-sugar-vs-fat', name: '糖类与脂肪的比较', targets: [{ ref: 'bx1-05/p7', t: '糖类与脂肪比较' }],
      brief: '所以等质量的脂肪氧化分解时，消耗的氧气多，释放的能量多，产生的水也多。', briefRef: 'bx1-05/p7' },
    { id: 'k-protein-func', name: '蛋白质的功能', targets: [{ ref: 'bx1-06/p1', t: '蛋白质的功能' }],
      brief: '一切生命活动都离不开蛋白质，蛋白质是生命活动的主要承担者。', briefRef: 'bx1-06/p1' },
    { id: 'k-amino-acid-struct', name: '氨基酸的结构', targets: [{ ref: 'bx1-06/p2', t: '氨基酸结构通式' }],
      brief: '各种氨基酸之间的区别，在于R基的不同。', briefRef: 'bx1-06/p2' },
    { id: 'k-dehydration', name: '脱水缩合与肽键', targets: [{ ref: 'bx1-06/p4', t: '脱水缩合与肽键' }],
      brief: '一个氨基酸的羧基和另一个氨基酸的氨基相连接，同时脱去一分子水。', briefRef: 'bx1-06/p4' },
    { id: 'k-protein-diversity', name: '蛋白质结构的多样性', targets: [{ ref: 'bx1-06/p7', t: '结构多样性' }],
      brief: '结构的多样性决定了功能的多样性，体现了结构与功能相适应。', briefRef: 'bx1-06/p7' },
    { id: 'k-protein-denature', name: '蛋白质变性', targets: [{ ref: 'bx1-06/p8', t: '蛋白质变性' }],
      brief: '在高温、过酸、过碱或重金属盐等作用下，蛋白质的空间结构被破坏，失去生物活性。', briefRef: 'bx1-06/p8' },
    { id: 'k-nucleotide-unit', name: '核苷酸的组成', targets: [{ ref: 'bx1-07/p2', t: '核苷酸的组成' }],
      brief: '一分子核苷酸由一分子磷酸、一分子五碳糖和一分子含氮碱基组成。', briefRef: 'bx1-07/p2' },
    { id: 'k-genetic-material-kinds', name: '生物的遗传物质', targets: [{ ref: 'bx1-07/p5', t: '生物的遗传物质' }],
      brief: '细胞生物，无论真核还是原核，遗传物质都是DNA。', briefRef: 'bx1-07/p5' },
    { id: 'k-nucleic-acid-func', name: '核酸的功能', targets: [{ ref: 'bx1-07/p6', t: '核酸的功能' }],
      brief: '遗传信息储存在核苷酸的排列顺序中；对DNA来说，就是脱氧核苷酸的排列顺序。', briefRef: 'bx1-07/p6' },
    { id: 'k-monomer-polymer', name: '单体与多聚体', alias: ['生物大分子'], targets: [{ ref: 'bx1-07/p7', t: '单体与多聚体' }],
      brief: '多糖的单体是单糖，蛋白质的单体是氨基酸，核酸的单体是核苷酸。', briefRef: 'bx1-07/p7' },

    /* ---- 必修1 · 细胞的基本结构（参考第2讲知识框架图） ---- */
    { id: 'k-membrane-fluid-mosaic', name: '流动镶嵌模型', targets: [{ ref: 'bx1-08/p5', t: '流动镶嵌模型' }],
      brief: '磷脂双分子层是膜的基本支架，磷脂分子的头部亲水，尾部疏水。', briefRef: 'bx1-08/p5' },
    { id: 'k-membrane-fusion-exp', name: '人鼠细胞融合实验', targets: [{ ref: 'bx1-08/p4', t: '对膜结构的探索' }],
      brief: '37℃下经过40分钟，两种颜色均匀分布，说明细胞膜具有流动性。', briefRef: 'bx1-08/p4' },
    { id: 'k-membrane-traits', name: '流动性与选择透过性', alias: ['选择透过性', '膜的流动性'], targets: [{ ref: 'bx1-08/p7', t: '流动性与选择透过' }],
      brief: '流动性是结构特点，选择透过性是功能特性，别颠倒；流动性是选择透过性的基础。', briefRef: 'bx1-08/p7' },
    { id: 'k-organelle-mito', name: '线粒体', targets: [{ ref: 'bx1-09/p2', t: '线粒体' }],
      brief: '线粒体是细胞进行有氧呼吸的主要场所，是细胞的“动力车间”。', briefRef: 'bx1-09/p2' },
    { id: 'k-organelle-chloroplast', name: '叶绿体', targets: [{ ref: 'bx1-09/p3', t: '叶绿体' }, { ref: 'bx1-19/p6', t: '叶绿体的结构' }],
      brief: '叶绿体是光合作用的场所，是植物细胞的“养料制造车间”和“能量转换站”。', briefRef: 'bx1-09/p3' },
    { id: 'k-organelle-er-golgi', name: '内质网与高尔基体', targets: [{ ref: 'bx1-09/p4', t: '内质网与高尔基体' }],
      brief: '高尔基体主要对来自内质网的蛋白质进行加工、分类和包装，是“车间”及“发送站”。', briefRef: 'bx1-09/p4' },
    { id: 'k-organelle-lysosome', name: '溶酶体', targets: [{ ref: 'bx1-09/p5', t: '溶酶体与液泡' }],
      brief: '溶酶体内部含有多种水解酶，是细胞的“消化车间”。', briefRef: 'bx1-09/p5' },
    { id: 'k-organelle-ribosome', name: '核糖体', targets: [{ ref: 'bx1-09/p6', t: '核糖体中心体骨架' }],
      brief: '核糖体是“生产蛋白质的机器”，有的附着在内质网上，有的游离在细胞质中。', briefRef: 'bx1-09/p6' },
    { id: 'k-organelle-centrosome', name: '中心体', targets: [{ ref: 'bx1-09/p6', t: '核糖体中心体骨架' }],
      brief: '中心体见于动物和某些低等植物细胞，由两个互相垂直的中心粒及周围物质组成，与细胞的有丝分裂有关。', briefRef: 'bx1-09/p6' },
    { id: 'k-organelle-summary', name: '细胞器的归纳', targets: [{ ref: 'bx1-09/p7', t: '细胞器的归纳' }],
      brief: '双层膜：线粒体、叶绿体；无膜：核糖体、中心体；其余是单层膜。', briefRef: 'bx1-09/p7' },
    { id: 'k-secretory-pathway', name: '分泌蛋白的合成和运输', targets: [{ ref: 'bx1-10/p3', t: '合成和运输途径' }],
      brief: '记住路线——核糖体 → 内质网 → 高尔基体 → 细胞膜，线粒体全程供能。', briefRef: 'bx1-10/p3' },
    { id: 'k-biomembrane-system', name: '生物膜系统', targets: [{ ref: 'bx1-10/p5', t: '生物膜系统' }],
      brief: '细胞膜、核膜和细胞器膜等结构，共同构成细胞的生物膜系统。', briefRef: 'bx1-10/p5' },
    { id: 'k-nucleus-func', name: '细胞核的功能', targets: [{ ref: 'bx1-11/p1', t: '细胞核的功能' }],
      brief: '细胞核是遗传信息库，是细胞代谢和遗传的控制中心。', briefRef: 'bx1-11/p1' },
    { id: 'k-nucleus-exp', name: '美西螈核移植与蝾螈横缢实验', targets: [{ ref: 'bx1-11/p2', t: '美西螈与蝾螈实验' }],
      brief: '说明细胞核控制着细胞的分裂、分化。', briefRef: 'bx1-11/p2' },
    { id: 'k-nucleus-struct', name: '细胞核的结构', alias: ['核膜', '核孔', '核仁'], targets: [{ ref: 'bx1-11/p4', t: '细胞核的结构' }],
      brief: '核孔实现核质之间频繁的物质交换和信息交流。', briefRef: 'bx1-11/p4' },
    { id: 'k-chromatin-chromosome', name: '染色质与染色体', targets: [{ ref: 'bx1-11/p5', t: '染色质与染色体' }],
      brief: '染色质和染色体是同一种物质在细胞不同时期的两种存在状态，成分相同。', briefRef: 'bx1-11/p5' },
    /* （必修1 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */

    /* ==== 必修2 · 概念整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （必修2 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */

    /* ==== 选必1 · 概念整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （选必1 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */

    /* ==== 选必2 · 概念整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （选必2 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */

    /* ==== 选必3 · 概念整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （选必3 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */
  ],

  /* 关系。from/to 可以是概念、部分或单元；basis 中 kind:'site' 的 quote 必须能在 ref 讲义中逐字查到。 */
  relations: [
    /* 种群 */
    { id: 'r-rates-density', from: 'k-rates', to: 'k-pop-density', type: 'cause', label: '直接决定', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-01/p8', quote: '出生率、死亡率、迁入率、迁出率，直接决定种群密度。' }] },
    { id: 'r-age-rates', from: 'k-age', to: 'k-rates', type: 'cause', label: '既影响出生率，又影响死亡率', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-01/p8', quote: '年龄结构既影响出生率，又影响死亡率，可以预测种群数量的变化趋势。' }] },
    { id: 'r-sex-rates', from: 'k-sexratio', to: 'k-rates', type: 'cause', label: '只影响出生率', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-01/p8', quote: '性别比例只影响出生率。' }] },
    { id: 'r-biotic-inter', from: 'k-interspecific', to: 'k-biotic', type: 'cause', label: '种间关系是影响种群数量的外部生物因素', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-03/p2', quote: '种群外部：其他生物通过捕食、种间竞争、寄生等关系影响种群数量。' }] },
    { id: 'r-predprey-curve', from: 'k-predprey', to: 'k-intercurve', type: 'instance', label: '捕食曲线是种间关系曲线中的一类', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-04/p4', quote: '捕食：两条曲线不同步地周期性波动，先增先减的是被捕食者。' }] },
    { id: 'r-predprey-feedback', from: 'k-predprey', to: 'k-eco-feedback', type: 'instance', label: '实例：这种调节属于负反馈', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-03/p4', quote: '这种调节属于负反馈' }, { kind: 'site', ref: 'xb2-12/p1', quote: '维持生态平衡的机制是负反馈调节。' }] },
    { id: 'r-density-scurve', from: 'k-density-dep', to: 'k-scurve', type: 'cause', label: '密度增大后的种内竞争与天敌，使增长减慢', status: 'editor',
      basis: [{ kind: 'site', ref: 'xb2-02/p3', quote: '种群密度增大，种内竞争加剧，天敌数量也会增加，于是出生率降低、死亡率升高。' },
        { kind: 'site', ref: 'xb2-03/p3', quote: '密度制约因素：对种群数量的作用强度与种群密度相关，一般是食物和天敌等生物因素。' },
        { kind: 'editor', note: '两处原文分别可查；把"S"形成因与"密度制约因素"对应起来是编辑判断。' }] },
    { id: 'r-k-pest', from: 'k-kapply', to: 'k-pest', type: 'apply', label: '灭鼠等防治：降低K值', status: 'site',
      condition: '适用于"怎样从根本上控制有害生物数量"一类设问；不是所有措施题都以降低K值作答。',
      basis: [{ kind: 'site', ref: 'xb2-02/p5', quote: '灭鼠关键是降低K值，不是把数量控制在 K/2' }] },
    { id: 'r-k-fishery', from: 'k-kapply', to: 'k-fishery', type: 'apply', label: '捕捞后剩余量维持在 K/2 左右', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-02/p5', quote: '捕捞后，让剩余量维持在 K/2 左右，种群增长速率最快，可以持续获得较大的捕捞量。' }] },
    { id: 'r-age-fishery', from: 'k-age', to: 'k-fishery', type: 'cause', label: '网眼过小→年龄结构变为衰退型', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-03/p6', quote: '网眼过小会捕捞大量幼鱼，使年龄结构变为衰退型，种群数量下降。' }] },
    { id: 'r-sex-pest', from: 'k-sexratio', to: 'k-pest', type: 'apply', label: '性引诱剂诱杀雄虫→出生率降低', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-01/p7', quote: '用人工合成的性引诱剂诱杀害虫的雄性个体。' }] },
    { id: 'r-info-pest', from: 'k-info-agri', to: 'k-pest', type: 'apply', label: '信息素防治害虫，属于生物防治', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-11/p5', quote: '比如用人工合成的性引诱剂诱捕害虫，或者干扰害虫交配，降低出生率。' }] },
    { id: 'r-adjust-pest', from: 'k-pest', to: 'k-energy-adjust', type: 'instance', label: '除草、灭虫的意义', status: 'site',
      condition: '答题句式只适用于"除草、灭虫这类措施有什么意义"的设问。',
      basis: [{ kind: 'site', ref: 'xb2-09/p6', quote: '除草灭虫的意义：调整能量流动关系，使能量持续高效地流向对人类最有益的部分' }] },

    /* 种群 · 2026-11-16 切片（参考第17讲知识框架图，逐条核对讲义原文） */
    { id: 'r-quadrat-density', from: 'k-quadrat', to: 'k-pop-density', type: 'measure', label: '调查（估算）', status: 'site',
      condition: '适用于植物，以及活动能力弱、活动范围小的动物。',
      basis: [{ kind: 'site', ref: 'xb2-01/p2', quote: '最后求出各样方种群密度的平均值，作为该种群密度的估算值。' },
        { kind: 'figure', ref: 'IMG_20261115_225536.jpg', note: '教材知识框架第17讲：样方法、标记重捕法 —"调查方法"→ 种群密度。' }] },
    { id: 'r-mark-density', from: 'k-mark', to: 'k-pop-density', type: 'measure', label: '调查（估算）', status: 'editor',
      condition: '适用于活动能力强、活动范围大的动物。',
      basis: [{ kind: 'site', ref: 'xb2-01/p3', quote: '适用于活动能力强、活动范围大的动物，比如田鼠、鸟类、鱼类。' },
        { kind: 'site', ref: 'xb2-01/p3', quote: '按比例相等，N = M × n ÷ m。' },
        { kind: 'figure', ref: 'IMG_20261115_225536.jpg', note: '教材知识框架第17讲：样方法、标记重捕法 —"调查方法"→ 种群密度。' },
        { kind: 'editor', note: '该考点原文写的是估算个体数 N 与适用对象，未逐字写"调查种群密度"；"调查方法→种群密度"据参考图整理，待确认。' }] },
    { id: 'r-model-jcurve', from: 'k-model', to: 'k-jcurve', type: 'measure', label: '用数学模型表征（公式 Nt = N0λ^t）', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-02/p1', quote: '建构种群增长模型的方法' },
        { kind: 'site', ref: 'xb2-02/p2', quote: '种群的数量每年以一定的倍数增长，第 t 年的数量 = 初始数量 × λ 的 t 次方。' },
        { kind: 'figure', ref: 'IMG_20261115_225536.jpg', note: '教材知识框架第17讲："J"形增长、"S"形增长、波动、下降 —"表征方法"→ 建立数学模型。' }] },
    { id: 'r-model-scurve', from: 'k-model', to: 'k-scurve', type: 'measure', label: '用数学模型表征（曲线）', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-02/p1', quote: '数学公式精确，曲线图直观，两种形式各有优点。' },
        { kind: 'site', ref: 'xb2-02/p3', quote: '当出生率等于死亡率时，种群停止增长，数量稳定在一定水平，曲线呈“S”形。' },
        { kind: 'figure', ref: 'IMG_20261115_225536.jpg', note: '教材知识框架第17讲："J"形增长、"S"形增长、波动、下降 —"表征方法"→ 建立数学模型。' }] },
    { id: 'r-jcurve-scurve', from: 'k-jcurve', to: 'k-scurve', type: 'contrast', label: '理想条件 vs 资源和空间有限', status: 'site',
      condition: '比较维度：前提条件（理想条件 vs 资源和空间有限）；有无K值；"J"形 λ 保持不变，"S"形达到K值后停止增长。',
      basis: [{ kind: 'site', ref: 'xb2-02/p2', quote: '条件是食物和空间条件充裕、气候适宜、没有天敌和其他竞争物种等理想条件。' },
        { kind: 'site', ref: 'xb2-02/p3', quote: '自然界的资源和空间总是有限的。' }] },
    { id: 'r-rates-scurve', from: 'k-rates', to: 'k-scurve', type: 'cause', label: '出生率降到等于死亡率时，种群停止增长', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-02/p3', quote: '当出生率等于死亡率时，种群停止增长，数量稳定在一定水平，曲线呈“S”形。' }] },
    { id: 'r-growthrate-kapply', from: 'k-growthrate', to: 'k-kapply', type: 'apply', label: 'K/2 时增长最快：定捕捞剩余量与防治时机', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-02/p4', quote: '种群数量为 K/2 时，增长速率最大。' },
        { kind: 'site', ref: 'xb2-02/p5', quote: '捕捞后，让剩余量维持在 K/2 左右，种群增长速率最快，可以持续获得较大的捕捞量。' },
        { kind: 'site', ref: 'xb2-02/p5', quote: '防治要越早越好，在种群数量达到 K/2 之前进行。' }] },
    { id: 'r-lambda-growthrate', from: 'k-lambda', to: 'k-growthrate', type: 'contrast', label: '临界值不同：λ 看 1，增长速率看 K/2 与 K', status: 'editor',
      condition: '比较维度：判读的临界值（λ 曲线为 1；增长速率曲线最高点对应 K/2、降到零对应 K）。两种曲线都不能按曲线升降直接判断数量增减。',
      basis: [{ kind: 'site', ref: 'xb2-02/p8', quote: '看 λ 和 1 比大小，不看 λ 升还是降' },
        { kind: 'site', ref: 'xb2-02/p4', quote: '增长速率曲线的最高点对应 K/2，降到零的点对应 K 值。' },
        { kind: 'editor', note: '两处判读方法原文可查；把二者并列对比是编辑判断（同推导方法组"看率不看数"）。' }] },
    { id: 'r-kapply-endangered', from: 'k-kapply', to: 'k-endangered', type: 'apply', label: '建立自然保护区，提高K值', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-02/p5', quote: '保护濒危动物，要建立自然保护区，改善栖息环境，提高K值。' }] },
    { id: 'r-age-endangered', from: 'k-age', to: 'k-endangered', type: 'instance', label: '保护前须调查的数量特征之一', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-03/p5', quote: '先调查种群的数量、年龄结构和性别比例，分析影响它们数量变化的因素。' }] },
    { id: 'r-abiotic-fluct', from: 'k-abiotic', to: 'k-fluct', type: 'cause', label: '气候等因素可引起种群爆发或波动', status: 'site',
      condition: '非生物因素的影响往往是综合性的；同一因素对不同种群作用可能相反（干旱使许多植物死亡率升高，却使东亚飞蝗爆发）。',
      basis: [{ kind: 'site', ref: 'xb2-03/p1', quote: '对东亚飞蝗来说，气候干旱正是种群爆发式增长的主要原因。' },
        { kind: 'site', ref: 'xb2-02/p6', quote: '有些则会在短时间内大量增长，比如东亚飞蝗的爆发' },
        { kind: 'figure', ref: 'IMG_20261115_225536.jpg', note: '教材知识框架第17讲："影响种群数量变化的因素"（非生物因素、生物因素）连向种群；种群 —"数量变化"→ "J"形、"S"形、波动、下降。' }] },
    { id: 'r-biotic-fluct', from: 'k-biotic', to: 'k-fluct', type: 'cause', label: '捕食等种间关系可使数量周期性波动', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-03/p2', quote: '其他生物通过捕食、种间竞争、寄生等关系影响种群数量。' },
        { kind: 'site', ref: 'xb2-03/p4', quote: '两者呈现周期性波动' },
        { kind: 'figure', ref: 'IMG_20261115_225536.jpg', note: '教材知识框架第17讲："影响种群数量变化的因素"（非生物因素、生物因素）连向种群；种群 —"数量变化"→ "J"形、"S"形、波动、下降。' }] },

    /* 种群→群落→生态系统（部分之间） */
    { id: 'r-pop-comm', from: 'xb2-pop', to: 'xb2-comm', type: 'compose', label: '各种生物种群的集合构成群落', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-04/p1', quote: '在相同时间聚集在一定地域中各种生物种群的集合，叫做生物群落' }] },
    { id: 'r-comm-eco', from: 'xb2-comm', to: 'xb2-eco', type: 'compose', label: '生物群落＋非生物环境＝生态系统', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-07/p1', quote: '由生物群落与它的非生物环境相互作用而形成的统一整体，叫做生态系统。' }] },
    { id: 'r-eco-human', from: 'xb2-human', to: 'xb2-eco', type: 'cause', label: '人类活动影响生态系统', status: 'editor',
      basis: [{ kind: 'editor', note: '按章节主题归纳的部分间关系，未逐条对照原文。' }] },
    { id: 'r-levels-eco', from: 'k-life-levels', to: 'k-ecosystem', type: 'instance', label: '层次定义一致：群落＋无机环境＝生态系统', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-01/p6', quote: '一定区域内同种生物的所有个体是种群；所有生物是群落；再加上无机环境就是生态系统。' },
        { kind: 'site', ref: 'xb2-07/p1', quote: '由生物群落与它的非生物环境相互作用而形成的统一整体，叫做生态系统。' }] },

    /* 生态系统内部 */
    { id: 'r-web-energy', from: 'k-foodweb', to: 'k-energyflow', type: 'basis', label: '渠道：能量沿食物链和食物网传递', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-08/p1', quote: '传递：沿着食物链和食物网，以有机物中的化学能形式传递。' },
        { kind: 'figure', ref: 'IMG_20261115_225543.jpg', note: '教材知识框架第18讲：营养结构 —"渠道"→ 能量流动、物质循环所在的虚线框。' }] },
    { id: 'r-chain-web', from: 'k-foodchain', to: 'k-foodweb', type: 'compose', label: '食物链相互交错构成食物网', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-07/p6', quote: '许多食物链彼此相互交错，连接成复杂的营养关系，就是食物网。' }] },
    /* 能量与物质的双向作用写成两条：方向不同、关系词不同（2026-11-16 由原单元间"能量是动力，物质是载体"一条拆分）。 */
    { id: 'r-energy-matter', from: 'k-energyflow', to: 'k-carbon', type: 'basis', label: '是物质循环的动力', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-10/p6', quote: '能量是物质循环的动力。' },
        { kind: 'figure', ref: 'IMG_20261115_225543.jpg', note: '教材知识框架第18讲：能量流动 —"动力"→ 物质循环；物质循环 —"载体"→ 能量流动（两条方向相反的箭头）。' }] },
    { id: 'r-carbon-energy', from: 'k-carbon', to: 'k-energyflow', type: 'basis', label: '含碳有机物是能量的载体', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-10/p6', quote: '物质是能量的载体，能量沿着食物链流动，就储存在有机物中' },
        { kind: 'site', ref: 'xb2-10/p2', quote: '在生物群落内部，以含碳有机物的形式传递。' },
        { kind: 'figure', ref: 'IMG_20261115_225543.jpg', note: '教材知识框架第18讲：能量流动 —"动力"→ 物质循环；物质循环 —"载体"→ 能量流动（两条方向相反的箭头）。' }] },

    /* 生态系统 · 2026-11-16 切片（参考第18讲知识框架图，逐条核对讲义原文） */
    { id: 'r-chain-magnify', from: 'k-foodchain', to: 'k-magnify', type: 'basis', label: '渠道：难降解物质沿食物链逐级积累', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-10/p5', quote: '会沿食物链逐级积累，营养级越高，浓度越高。' },
        { kind: 'figure', ref: 'IMG_20261115_225543.jpg', note: '教材知识框架第18讲：营养结构 —"渠道"→ 能量流动、物质循环所在的虚线框；生物富集列在物质循环下。' }] },
    { id: 'r-energyin-assim', from: 'k-energy-in', to: 'k-assim', type: 'seq', label: '先固定（同化），再分为呼吸散失与生长、发育和繁殖', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-08/p2', quote: '每个营养级都拆成：固定或同化 → 呼吸散失 + 用于生长、发育和繁殖' },
        { kind: 'site', ref: 'xb2-08/p4', quote: '同化量 = 呼吸作用散失 + 用于生长、发育和繁殖。' }] },
    { id: 'r-assim-feature', from: 'k-assim', to: 'k-energy-feature', type: 'cause', label: '每级都有呼吸散失、流向分解者和未利用，所以逐级递减', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-08/p6', quote: '原因：每个营养级都有能量在呼吸作用中散失，还有一部分流向分解者，一部分未被利用。' }] },
    { id: 'r-assim-efficiency', from: 'k-assim', to: 'k-efficiency', type: 'basis', label: '计算依据：分子分母都用同化量', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-09/p1', quote: '传递效率 = 下一营养级同化量 ÷ 上一营养级同化量 × 100%。' },
        { kind: 'site', ref: 'xb2-08/p5', quote: '分子分母都必须是同化量，不能用摄入量。' }] },
    { id: 'r-efficiency-feature', from: 'k-efficiency', to: 'k-energy-feature', type: 'measure', label: '定量表示逐级递减（相邻营养级约10%～20%）', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-08/p6', quote: '相邻两个营养级之间的传递效率大约是10%到20%。' }] },
    { id: 'r-web-change', from: 'k-foodweb', to: 'k-web-change', type: 'basis', label: '分析依据：先找营养级，再看食物来源是否多样', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-07/p7', quote: '先看减少的生物处在哪个营养级' }] },
    { id: 'r-feature-webchange', from: 'k-energy-feature', to: 'k-web-change', type: 'basis', label: '解释依据：营养级越低，获得的能量越多', status: 'site',
      condition: '用于"中间营养级减少，高营养级生物改食较低营养级"的情形。',
      basis: [{ kind: 'site', ref: 'xb2-07/p7', quote: '营养级降低，获得的能量反而更多，所以鹰的数量增加。' },
        { kind: 'site', ref: 'xb2-08/p6', quote: '相邻两个营养级之间的传递效率大约是10%到20%。' }] },
    { id: 'r-biotic-webchange', from: 'k-biotic', to: 'k-web-change', type: 'cause', label: '种内竞争加剧，使失去天敌的被捕食者回落并趋于稳定', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-07/p7', quote: '天敌减少：被捕食者先增加，后因种内竞争加剧而减少，最后趋于稳定。' },
        { kind: 'site', ref: 'xb2-03/p2', quote: '随着种群密度增大，种内竞争加剧，从而使种群的增长受到限制。' }] },
    { id: 'r-web-selfreg', from: 'k-foodweb', to: 'k-selfreg', type: 'cause', label: '食物网越复杂，自我调节能力越强', status: 'site',
      condition: '原文为"一般来说"；北极冻原、荒漠等结构简单的生态系统两种稳定性都低，不能反推"简单就恢复快"。',
      basis: [{ kind: 'site', ref: 'xb2-12/p4', quote: '一般来说，生态系统中的组分越多，食物网越复杂，自我调节能力就越强。' }] },
    { id: 'r-info-energy', from: 'u-xb2-info', to: 'u-xb2-energy', type: 'cause', label: '决定能量流动的方向和状态', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-11/p6', quote: '信息传递决定着能量流动和物质循环的方向和状态。' },
        { kind: 'editor', note: '依据仅为讲义原文；第18讲参考图信息传递旁"调节"细箭头的终点待放大核对，未作为本关系依据。' }] },
    { id: 'r-info-matter', from: 'u-xb2-info', to: 'u-xb2-matter', type: 'cause', label: '决定物质循环的方向和状态', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-11/p6', quote: '信息传递决定着能量流动和物质循环的方向和状态。' },
        { kind: 'editor', note: '依据仅为讲义原文；第18讲参考图信息传递旁"调节"细箭头的终点待放大核对，未作为本关系依据。' }] },
    { id: 'r-feature-magnify', from: 'k-energy-feature', to: 'k-magnify', type: 'contrast', label: '沿食物链：能量逐级递减，富集物浓度逐级升高', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-08/p6', quote: '只能沿食物链由低营养级流向高营养级' },
        { kind: 'site', ref: 'xb2-10/p5', quote: '会沿食物链逐级积累，营养级越高，浓度越高。' }] },
    { id: 'r-feedback-selfreg', from: 'k-eco-feedback', to: 'k-selfreg', type: 'basis', label: '负反馈调节是自我调节能力的基础', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-12/p2', quote: '负反馈调节是自我调节能力的基础' }] },

    /* 能量主线（跨册） */
    { id: 'r-photo-input', from: 'k-photo-eq', to: 'k-energy-in', type: 'scale', label: '生态系统的能量输入，由生产者的光合作用完成', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-08/p2', quote: '生产者通过光合作用，把太阳能固定在有机物中。' }] },
    { id: 'r-resp-assim', from: 'k-aerobic-energy', to: 'k-assim', type: 'scale', label: '同化量中的"呼吸作用散失"就是各营养级生物的细胞呼吸', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-08/p2', quote: '这些能量，一部分在生产者的呼吸作用中以热能的形式散失。' },
        { kind: 'site', ref: 'xb2-08/p4', quote: '同化量 = 呼吸作用散失 + 用于生长、发育和繁殖。' }] },
    { id: 'r-photo-carbon', from: 'k-photo-eq', to: 'k-carbon', type: 'scale', label: '碳进入生物群落主要靠光合作用', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-10/p2', quote: '碳进入生物群落，主要靠生产者的光合作用，还有化能合成作用。' }] },
    { id: 'r-chemo-carbon', from: 'k-chemo', to: 'k-carbon', type: 'scale', label: '化能合成作用也使碳进入生物群落', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-10/p2', quote: '碳进入生物群落，主要靠生产者的光合作用，还有化能合成作用。' }] },
    { id: 'r-resp-carbon', from: 'k-aerobic-energy', to: 'k-carbon', type: 'scale', label: '呼吸作用使碳返回非生物环境', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-10/p2', quote: '碳返回非生物环境，靠动植物的呼吸作用、分解者的分解作用，以及化石燃料的燃烧。' }] },
    { id: 'r-photo-atp', from: 'k-photo-eq', to: 'k-atp-source', type: 'cause', label: '绿色植物合成ATP的能量来源之一', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-16/p4', quote: '对于绿色植物来说，能量来自细胞呼吸和光合作用。' }] },
    { id: 'r-resp-atp', from: 'k-aerobic-energy', to: 'k-atp-source', type: 'cause', label: '细胞呼吸为合成ATP提供能量', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-16/p4', quote: '对于动物、人、真菌和大多数细菌来说，能量来自细胞呼吸。' }] },
    { id: 'r-grossnet-assim', from: 'k-gross-net', to: 'k-assim', type: 'analogy', label: '都是"总量＝自身呼吸消耗＋余下部分"的收支拆分', status: 'editor',
      condition: '对象不同（一株植物的光合速率 vs 一个营养级的能量），数值不能互换。',
      basis: [{ kind: 'site', ref: 'bx1-21/p4', quote: '总光合速率 = 净光合速率 + 呼吸速率。' },
        { kind: 'site', ref: 'xb2-08/p4', quote: '同化量 = 呼吸作用散失 + 用于生长、发育和繁殖。' },
        { kind: 'editor', note: '两式结构相似是编辑归纳，讲义未直接这样比较。' }] },

    /* 调节与反馈主线（跨册类比） */
    { id: 'r-thyroid-glucose', from: 'k-feedback-thyroid', to: 'k-feedback-glucose', type: 'instance', label: '同为激素分泌的负反馈实例', status: 'site',
      basis: [{ kind: 'site', ref: 'xb1-11/p3', quote: '甲状腺激素的负反馈同时作用于下丘脑和垂体两处' }] },
    { id: 'r-glucose-eco', from: 'k-feedback-glucose', to: 'k-eco-feedback', type: 'analogy', label: '同属负反馈：结果反过来抑制起因；调节对象与机制不同', status: 'editor',
      condition: '个体层面靠激素，生态系统层面靠种间关系等，不能互相代替解释。',
      basis: [{ kind: 'site', ref: 'xb1-10/p4', quote: '负反馈调节是生命系统中非常普遍的调节机制' },
        { kind: 'site', ref: 'xb2-12/p1', quote: '维持生态平衡的机制是负反馈调节。' },
        { kind: 'editor', note: '两处均写明"负反馈"；把二者并列为类比是编辑判断。' }] },

    /* 进化与适应主线 */
    { id: 'r-coevo-niche', from: 'k-coevolution', to: 'k-niche', type: 'cause', label: '相对稳定的生态位是协同进化的结果', status: 'site',
      basis: [{ kind: 'site', ref: 'xb2-04/p7', quote: '群落中每种生物都占据着相对稳定的生态位，有利于不同生物充分利用环境资源，这是协同进化的结果。' }] },
    { id: 'r-coevo-diversity', from: 'k-coevolution', to: 'k-diversity', type: 'cause', label: '协同进化形成多种多样的物种和生态系统', status: 'site',
      basis: [{ kind: 'site', ref: 'bx2-24/p1', quote: '通过漫长的协同进化过程，地球上不仅出现了千姿百态的物种，而且形成了多种多样的生态系统。' }] },
    { id: 'r-adapt-comm', from: 'k-adapt-form', to: 'k-comm-adapt', type: 'cause', label: '用自然选择解释群落中生物的适应', status: 'editor',
      basis: [{ kind: 'site', ref: 'bx2-21/p4', quote: '适应是自然选择的结果' },
        { kind: 'editor', note: '选必2 该考点按"结构与功能相适应"作答，未提自然选择；跨册解释关系是编辑判断。' }] },

    /* 技术回扣原理主线 */
    { id: 'r-rep-pcr', from: 'k-dna-rep', to: 'k-pcr', type: 'apply', label: 'PCR 的原理是 DNA 半保留复制', status: 'site',
      basis: [{ kind: 'site', ref: 'xb3-13/p3', quote: 'PCR是聚合酶链式反应，原理是DNA半保留复制。' }] },
    { id: 'r-dogma-protein', from: 'k-dogma', to: 'k-protein-eng', type: 'contrast', label: '蛋白质工程的思路与中心法则方向相反', status: 'site',
      basis: [{ kind: 'site', ref: 'xb3-16/p2', quote: '这条思路与中心法则的方向相反' }] },
    { id: 'r-transcribe-promoter', from: 'k-transcribe', to: 'k-promoter', type: 'basis', label: '启动子、终止子控制转录', status: 'site',
      basis: [{ kind: 'site', ref: 'xb3-13/p7', quote: '启动子和终止子，是DNA上的一段序列，控制的是转录。' }] },
    { id: 'r-codon-promoter', from: 'k-codon', to: 'k-promoter', type: 'contrast', label: '起始、终止密码子在 mRNA 上，控制翻译', status: 'site',
      basis: [{ kind: 'site', ref: 'xb3-13/p7', quote: '起始密码子和终止密码子，位于mRNA上，控制的是翻译的开始和结束。' }] },

    /* ==== 必修1 · 关系整理区（以下按册追加；每条末尾带逗号） ==== */
    /* ---- 必修1 · 组成细胞的分子（参考第1讲知识框架图，逐条核对讲义原文） ---- */
    { id: 'r-monomer-carbon', from: 'k-monomer-polymer', to: 'k-carbon-core', type: 'basis', label: '依据：单体以碳链为骨架', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-07/p7', quote: '每个单体都以若干个相连的碳原子构成的碳链为基本骨架，所以说“碳是生命的核心元素”。' },
        { kind: 'site', ref: 'bx1-03/p3', quote: '生物大分子以碳链为基本骨架，所以说碳是生命的核心元素。' }] },
    { id: 'r-amino-dehydration', from: 'k-amino-acid-struct', to: 'k-dehydration', type: 'seq', label: '脱水缩合连接成肽链', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-06/p4', quote: '两个氨基酸形成二肽，多个氨基酸形成多肽，多肽通常呈链状，叫肽链。' },
        { kind: 'figure', ref: 'IMG_20261115_225351.jpg', note: '教材知识框架第1讲：蛋白质下 C、H、O、N → 氨基酸 → 多肽 → 蛋白质（向下箭头）。' }] },
    { id: 'r-pdiversity-func', from: 'k-protein-diversity', to: 'k-protein-func', type: 'cause', label: '结构多样性决定功能多样性', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-06/p7', quote: '结构的多样性决定了功能的多样性，体现了结构与功能相适应。' }] },
    { id: 'r-biuret-denature', from: 'k-protein-test', to: 'k-protein-denature', type: 'measure', label: '肽键未断，变性后仍显紫色', status: 'site',
      condition: '双缩脲试剂检出的是肽键，不能据此判断蛋白质是否仍有活性。',
      basis: [{ kind: 'site', ref: 'bx1-06/p8', quote: '变性时肽键没有断裂，所以变性后的蛋白质仍能与双缩脲试剂发生紫色反应。' }] },
    { id: 'r-amino-monomer', from: 'k-amino-acid-struct', to: 'k-monomer-polymer', type: 'instance', label: '蛋白质的单体是氨基酸', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-07/p7', quote: '多糖的单体是单糖，蛋白质的单体是氨基酸，核酸的单体是核苷酸。' }] },
    { id: 'r-nucleotide-monomer', from: 'k-nucleotide-unit', to: 'k-monomer-polymer', type: 'instance', label: '核酸的单体是核苷酸', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-07/p7', quote: '多糖的单体是单糖，蛋白质的单体是氨基酸，核酸的单体是核苷酸。' },
        { kind: 'figure', ref: 'IMG_20261115_225351.jpg', note: '教材知识框架第1讲：核酸下 C、H、O、N、P → 核苷酸 → 核酸（遗传信息的携带者）。' }] },
    { id: 'r-polysac-monomer', from: 'k-polysaccharide', to: 'k-monomer-polymer', type: 'instance', label: '多糖的单体都是葡萄糖', status: 'site',
      condition: '淀粉、糖原、纤维素单体相同，连接方式不同；脂肪不是生物大分子。',
      basis: [{ kind: 'site', ref: 'bx1-07/p7', quote: '淀粉、糖原、纤维素的单体都是葡萄糖。' }] },
    { id: 'r-nucleotide-info', from: 'k-nucleotide-unit', to: 'k-nucleic-acid-func', type: 'basis', label: '排列顺序储存遗传信息', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-07/p6', quote: '核苷酸虽然只有4种，但数量多、排列顺序千变万化，所以DNA能储存大量的遗传信息。' }] },

    /* ---- 必修1 · 细胞的基本结构（参考第2讲知识框架图：细胞膜、细胞器膜、核膜跨分支“组成”生物膜系统） ---- */
    { id: 'r-cellmem-biomem', from: 'k-membrane-fluid-mosaic', to: 'k-biomembrane-system', type: 'compose', label: '细胞膜参与构成', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-10/p5', quote: '细胞膜、核膜和细胞器膜等结构，共同构成细胞的生物膜系统。' },
        { kind: 'figure', ref: 'IMG_20261115_225400.jpg', note: '教材知识框架第2讲：细胞膜、内质网等单层膜细胞器、叶绿体与线粒体、核膜，以虚线汇合，—“组成”→ 生物膜系统。' }] },
    { id: 'r-nucmem-biomem', from: 'k-nucleus-struct', to: 'k-biomembrane-system', type: 'compose', label: '核膜参与构成', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-10/p5', quote: '细胞膜、核膜和细胞器膜等结构，共同构成细胞的生物膜系统。' },
        { kind: 'figure', ref: 'IMG_20261115_225400.jpg', note: '教材知识框架第2讲：细胞膜、内质网等单层膜细胞器、叶绿体与线粒体、核膜，以虚线汇合，—“组成”→ 生物膜系统。' }] },
    { id: 'r-orgmem-biomem', from: 'k-organelle-summary', to: 'k-biomembrane-system', type: 'compose', label: '细胞器膜参与构成', status: 'site',
      condition: '只计具膜细胞器；核糖体、中心体无膜。生物膜系统指细胞内的膜，原核细胞没有生物膜系统。',
      basis: [{ kind: 'site', ref: 'bx1-10/p5', quote: '细胞膜、核膜和细胞器膜等结构，共同构成细胞的生物膜系统。' },
        { kind: 'site', ref: 'bx1-09/p7', quote: '双层膜：线粒体、叶绿体；无膜：核糖体、中心体；其余是单层膜。' },
        { kind: 'figure', ref: 'IMG_20261115_225400.jpg', note: '教材知识框架第2讲：细胞膜、内质网等单层膜细胞器、叶绿体与线粒体、核膜，以虚线汇合，—“组成”→ 生物膜系统。' }] },
    { id: 'r-phospholipid-membrane', from: 'k-lipid-kinds', to: 'k-membrane-fluid-mosaic', type: 'compose', label: '磷脂双分子层是膜的基本支架', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-05/p5', quote: '磷脂是构成细胞膜和多种细胞器膜的重要成分。' },
        { kind: 'site', ref: 'bx1-08/p5', quote: '磷脂双分子层是膜的基本支架' }] },
    { id: 'r-mosaic-fluidity', from: 'k-membrane-fluid-mosaic', to: 'k-membrane-traits', type: 'basis', label: '磷脂与多数蛋白质能运动', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-08/p5', quote: '磷脂分子可以侧向自由移动，大多数蛋白质分子也能运动。' },
        { kind: 'site', ref: 'bx1-08/p7', quote: '细胞膜的结构特点是具有一定的流动性。' }] },
    { id: 'r-fusion-fluidity', from: 'k-membrane-fusion-exp', to: 'k-membrane-traits', type: 'instance', label: '证据：膜具有流动性', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-08/p4', quote: '37℃下经过40分钟，两种颜色均匀分布，说明细胞膜具有流动性。' }] },
    { id: 'r-ribosome-pathway', from: 'k-organelle-ribosome', to: 'k-secretory-pathway', type: 'seq', label: '起点：核糖体上合成肽链', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-10/p3', quote: '先在游离的核糖体上合成一段肽链，再与核糖体一起转移到粗面内质网上继续合成。' }] },
    { id: 'r-ergolgi-pathway', from: 'k-organelle-er-golgi', to: 'k-secretory-pathway', type: 'seq', label: '内质网加工→高尔基体再加工', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-10/p3', quote: '肽链在内质网腔内加工、折叠，形成有一定空间结构的蛋白质，再由囊泡包裹着运到高尔基体。' },
        { kind: 'site', ref: 'bx1-10/p3', quote: '高尔基体对蛋白质做进一步的修饰加工，再由囊泡运到细胞膜' }] },
    { id: 'r-mito-pathway', from: 'k-organelle-mito', to: 'k-secretory-pathway', type: 'basis', label: '全程供能', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-10/p3', quote: '整个过程需要的能量，主要来自线粒体。' }] },
    { id: 'r-pathway-fluidity', from: 'k-secretory-pathway', to: 'k-membrane-traits', type: 'instance', label: '囊泡与膜融合体现流动性', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-10/p6', quote: '囊泡与膜融合，体现了生物膜的流动性，也说明不同生物膜之间可以相互转化。' }] },
    { id: 'r-ribosome-dehydration', from: 'k-organelle-ribosome', to: 'k-dehydration', type: 'basis', label: '场所：脱水缩合在核糖体', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-06/p4', quote: '脱水缩合的场所是核糖体。' }] },
    { id: 'r-nucstruct-func', from: 'k-nucleus-struct', to: 'k-nucleus-func', type: 'basis', label: 'DNA主要在核内：遗传信息库', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-11/p1', quote: '原因是DNA主要存在于细胞核中，DNA上储存着遗传信息。' },
        { kind: 'site', ref: 'bx1-11/p4', quote: '染色质主要由DNA和蛋白质组成，DNA是遗传信息的载体。' }] },
    { id: 'r-nucexp-func', from: 'k-nucleus-exp', to: 'k-nucleus-func', type: 'instance', label: '证据：核控制遗传和分裂', status: 'site',
      basis: [{ kind: 'site', ref: 'bx1-11/p2', quote: '说明美西螈皮肤颜色的遗传是由细胞核控制的。' },
        { kind: 'site', ref: 'bx1-11/p2', quote: '说明细胞核控制着细胞的分裂、分化。' }] },
    { id: 'r-nucleolus-ribosome', from: 'k-nucleus-struct', to: 'k-organelle-ribosome', type: 'basis', label: '核仁与核糖体的形成有关', status: 'site',
      condition: '原文为“有关”，不写成核仁单独决定核糖体。',
      basis: [{ kind: 'site', ref: 'bx1-11/p4', quote: '核仁与某种RNA的合成以及核糖体的形成有关。' }] },
    /* （必修1 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */

    /* ==== 必修2 · 关系整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （必修2 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */

    /* ==== 选必1 · 关系整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （选必1 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */

    /* ==== 选必2 · 关系整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （选必2 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */

    /* ==== 选必3 · 关系整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （选必3 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */

    /* ==== 跨册 · 关系整理区（以下按册追加；每条末尾带逗号） ==== */
    /* （跨册 整理区结束） */
    /* 分隔：保持本行不变，便于各册并行合并 */
  ],

  /* 跨章或跨册的复习问题集合。成员全是引用（概念 id 或考点 "期/锚点"）；分组是复习问题分组，不是知识组成。 */
  topics: [
    { id: 't-popnum', book: 'xb2', name: '种群数量：怎么测、怎么变、为什么变、怎么调', status: 'editor',
      note: '编辑整理的跨章复习专题（第1–3章）。分组按复习时要回答的问题划分，不表示知识上的"属于"。',
      groups: [
        { id: 'tg-popnum-measure', name: '怎么测', items: ['k-pop-density', 'k-quadrat', 'k-mark', 'k-survey-other'] },
        { id: 'tg-popnum-predict', name: '靠什么预测', items: ['k-rates', 'k-age', 'k-sexratio', 'k-traits'] },
        { id: 'tg-popnum-change', name: '怎么变', items: ['k-model', 'k-jcurve', 'k-scurve', 'k-growthrate', 'k-fluct', 'k-lambda'] },
        { id: 'tg-popnum-why', name: '为什么变', items: ['k-abiotic',
          { id: 'k-biotic', children: ['k-interspecific', 'k-intercurve', 'k-predprey', 'k-web-change'] },
          'k-density-dep', 'k-eco-feedback'] },
        { id: 'tg-popnum-control', name: '怎么调', items: ['k-kapply', 'k-endangered', 'k-pest', 'k-fishery', 'k-info-agri', 'k-energy-adjust'] }
      ] },
    { id: 't-flow', book: 'xb2', name: '物质和能量怎么走', status: 'proposal',
      note: '提议中的专题，待确认。收录生态系统中物质、能量沿营养结构流动的相关知识。',
      groups: [
        { id: 'tg-flow-path', name: '渠道', items: ['k-foodchain', 'k-foodweb'] },
        { id: 'tg-flow-energy', name: '能量', items: ['k-energy-in', 'k-assim', 'k-energy-feature', 'k-efficiency'] },
        { id: 'tg-flow-matter', name: '物质', items: ['k-carbon', 'k-magnify', 'k-energy-matter', 'k-cycle-principle'] }
      ] },
    { id: 't-stable', book: 'xb2', name: '系统为什么稳、怎么护', status: 'proposal',
      note: '提议中的专题，待确认。',
      groups: [
        { id: 'tg-stable-why', name: '为什么稳', items: ['k-eco-feedback', 'k-selfreg', 'xb2-12/p4'] },
        { id: 'tg-stable-protect', name: '怎么护', items: ['xb2-12/p5', 'k-diversity', 'xb2-14/p5'] }
      ] }
  ],

  /* 学科图的跨册主线：站点按顺序排列，edges 为上面的关系 id。主线是一组跨册联系，不暗示连续因果。 */
  lines: [
    { id: 'l-energy', name: '能量', note: '从细胞的能量转换到生态系统的能量流动与碳循环。边的类型多为"跨尺度对应"，不是因果。',
      stations: ['k-atp-source', 'k-photo-eq', 'k-chemo', 'k-aerobic-energy', 'k-gross-net', 'k-energy-in', 'k-assim', 'k-carbon'],
      edges: ['r-photo-atp', 'r-resp-atp', 'r-photo-input', 'r-resp-assim', 'r-photo-carbon', 'r-chemo-carbon', 'r-resp-carbon', 'r-grossnet-assim'] },
    { id: 'l-feedback', name: '调节与反馈', note: '个体稳态与生态平衡都用到负反馈；跨册部分是类比，机制不同。',
      stations: ['k-feedback-thyroid', 'k-feedback-glucose', 'k-predprey', 'k-eco-feedback', 'k-selfreg'],
      edges: ['r-thyroid-glucose', 'r-glucose-eco', 'r-predprey-feedback', 'r-feedback-selfreg'] },
    { id: 'l-evolution', name: '进化与适应', note: '必修2 的进化观点在选必2 群落与多样性中的落点；"生物多样性三层次"是两册讲到的同一概念。',
      stations: ['k-adapt-form', 'k-coevolution', 'k-niche', 'k-comm-adapt', 'k-diversity'],
      edges: ['r-coevo-niche', 'r-coevo-diversity', 'r-adapt-comm'] },
    { id: 'l-tech', name: '技术回扣原理', note: '选必3 的技术与必修1、必修2 的原理对应；"细胞的全能性"是两册讲到的同一概念。',
      stations: ['k-dna-rep', 'k-pcr', 'k-transcribe', 'k-codon', 'k-promoter', 'k-dogma', 'k-protein-eng', 'k-totipotency'],
      edges: ['r-rep-pcr', 'r-transcribe-promoter', 'r-codon-promoter', 'r-dogma-protein'] }
  ],

  /* 大题任务：步骤先后 + 每步用到的知识 + 适用条件。均为示意，未对照真题。
   * how 中 kind:'site' 的句子取自讲义（考法、解题方法、易错），同样逐字校验。 */
  tasks: [
    { id: 'task-pest', book: 'xb2', domain: 'd-eco', name: '有害生物防治方案分析', status: 'sketch',
      note: '示意：按讲义中的考法与解题方法整理步骤，未对照真题；步骤划分与适用条件待用真题校正。',
      steps: [
        { id: 'task-pest.s1', name: '估数量', use: ['k-quadrat', 'k-mark', 'k-survey-other'],
          when: '设问要求调查或估算种群密度时。',
          how: [{ kind: 'site', ref: 'xb2-01/p4', quote: '先问它动不动、跑多远，再看有没有趋光性、是否难以接近。' }] },
        { id: 'task-pest.s2', name: '判趋势', use: ['k-age', 'k-lambda'],
          when: '给出年龄结构或 λ 随时间变化的曲线时。',
          how: [{ kind: 'site', ref: 'xb2-01/p6', quote: '年龄结构只能预测变化趋势。' }, { kind: 'site', ref: 'xb2-02/p8', quote: '看 λ 和 1 比大小，不看 λ 升还是降' }] },
        { id: 'task-pest.s3', name: '找原因', use: ['k-abiotic', 'k-biotic', 'k-density-dep', 'k-predprey'],
          when: '设问要求分析数量变化的原因时。',
          how: [{ kind: 'site', ref: 'xb2-03/p2', quote: '种内竞争是种群内部因素，不属于种间关系；捕食、竞争、寄生才是种间关系' }] },
        { id: 'task-pest.s4', name: '定措施', use: ['k-kapply', 'k-pest', 'k-sexratio', 'k-info-agri'],
          when: '按设问选机制：问"从根本上控制数量"时才以降低K值作答；性引诱剂等措施说明的是降低出生率。',
          not: '不要把"先说降低K值"当作所有措施题的统一开头。',
          how: [{ kind: 'site', ref: 'xb2-02/p5', quote: '灭鼠关键是降低K值，不是把数量控制在 K/2' }, { kind: 'site', ref: 'xb2-11/p5', quote: '利用信息素防治害虫属于生物防治，不是化学防治。' }] },
        { id: 'task-pest.s5', name: '说意义', use: ['k-energy-adjust'],
          when: '只适用于"除草、灭虫这类措施有什么意义"的设问。',
          how: [{ kind: 'site', ref: 'xb2-09/p6', quote: '除草灭虫的意义：调整能量流动关系，使能量持续高效地流向对人类最有益的部分' }] }
      ] },
    { id: 'task-energy', book: 'xb2', domain: 'd-eco', name: '能量流动图解与计算', status: 'sketch',
      note: '示意：按讲义中的解题方法整理步骤，未对照真题。',
      steps: [
        { id: 'task-energy.s1', name: '认图找同化量', use: ['k-energy-in', 'xb2-09/p4'],
          when: '给出能量流动图或字母模型图时。',
          how: [{ kind: 'site', ref: 'xb2-09/p4', quote: '先找同化量，再往下拆。' }] },
        { id: 'task-energy.s2', name: '分清摄入、同化、粪便', use: ['xb2-08/p3', 'k-assim'],
          when: '图中同时出现摄入量与粪便量时。',
          how: [{ kind: 'site', ref: 'xb2-08/p3', quote: '粪便中的能量不属于本营养级的同化量，属于上一营养级同化的能量' }] },
        { id: 'task-energy.s3', name: '算传递效率', use: ['k-efficiency'],
          when: '问相邻两个营养级之间的传递效率时。',
          how: [{ kind: 'site', ref: 'xb2-09/p1', quote: '传递效率 = 下一营养级同化量 ÷ 上一营养级同化量 × 100%。' }] },
        { id: 'task-energy.s4', name: '极值或按比例分配', use: ['xb2-09/p2', 'xb2-09/p3'],
          when: '问"至少""最多"或给出食物来源比例时。',
          how: [{ kind: 'site', ref: 'xb2-09/p2', quote: '至少——短链 × 20%；最多——长链 × 10%' }] },
        { id: 'task-energy.s5', name: '写实践意义', use: ['xb2-09/p5', 'k-energy-adjust'],
          when: '问研究能量流动的实践意义时；措施不同，对应的意义不同。',
          how: [{ kind: 'site', ref: 'xb2-09/p6', quote: '帮助人们合理地调整能量流动关系，使能量持续高效地流向对人类最有益的部分。' }] }
      ] }
  ],

  /* 推导方法：推理结构相同的一组知识，与章节无关。成员归组为编辑判断。 */
  methods: [
    { id: 'm-negfb', name: '负反馈链：A 增多 → B 随之增多 → A 被抑制', status: 'editor',
      common: '结果反过来抑制起因，使数量或含量回到一定范围。',
      members: [
        { id: 'k-predprey', note: '捕食者与被捕食者：讲义写明"这种调节属于负反馈"。' },
        { id: 'k-eco-feedback', note: '害虫—食虫鸟：讲义举例说明负反馈维持生态平衡。' },
        { id: 'k-intercurve', note: '曲线读法：交替波动是捕食，是同一现象的图像。' },
        { id: 'k-feedback-glucose', note: '个体层面：胰岛素使血糖降低，血糖降低后又使胰岛素分泌减少。' },
        { id: 'k-feedback-thyroid', note: '个体层面：甲状腺激素抑制下丘脑和垂体。' },
        { id: 'k-scurve', note: '"S"形成因能否归入此组待确认：讲义写的是种内竞争和天敌增加，未写"负反馈"。', pending: true }
      ],
      differences: '调节对象不同：种群数量、激素含量；机制不同：种间关系、激素分泌，不能互相代替。正反馈（如排尿、分娩）不属于此组。' },
    { id: 'm-rate', name: '看"率"不看"数"', status: 'editor',
      common: '判断数量变化，看增长速率或 λ 与临界值的关系，不看曲线本身的升降。',
      members: [
        { id: 'k-growthrate', note: '增长速率最大在 K/2，此时数量并不最多。' },
        { id: 'k-lambda', note: 'λ 在下降但仍大于 1，数量仍在增加。' }
      ],
      differences: '增长速率曲线的临界点是 K/2 与 K；λ 曲线的临界值是 1。' },
    { id: 'm-budget', name: '收支拆分：总量 ＝ 自身消耗 ＋ 余下部分', status: 'editor',
      common: '先确定总量，再扣除自身呼吸消耗，余下部分才可积累或传给下一环节。',
      members: [
        { id: 'k-gross-net', note: '总光合速率 = 净光合速率 + 呼吸速率（必修1）。' },
        { id: 'k-assim', note: '同化量 = 呼吸作用散失 + 用于生长、发育和繁殖（选必2）。' },
        { id: 'xb2-09/p4', note: '字母模型图：a = b + c，b = d + e。' }
      ],
      differences: '对象不同：一株植物的速率与一个营养级的能量，数值不能互换。' },
    { id: 'm-chain', name: '沿食物链逐级推', status: 'editor',
      common: '沿营养级一级一级推算或判断。',
      members: [
        { id: 'k-energy-feature', note: '能量逐级递减。' },
        { id: 'k-efficiency', note: '相邻营养级之间按传递效率计算。' },
        { id: 'xb2-09/p2', note: '至少与最多消耗：选链长短与 10%/20%。' },
        { id: 'k-magnify', note: '生物富集：营养级越高，浓度越高。' }
      ],
      differences: '能量逐级递减，而难降解物质的浓度逐级升高，方向相反。' }
  ],

  /* 题型证据：逐题记录。每条需写年份、地区卷别、题号、题型、涉及概念。当前没有任何记录。 */
  evidence: []
};
