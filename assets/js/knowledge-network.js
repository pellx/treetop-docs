/* 树梢文档 —— 知识网络（学科网络 / 五册全书网络 / 局部聚焦）
 *
 * 外壳 index.html 里的一种页面，与总索引、讲义 iframe 并列；由 app.js 调用：
 *   TreetopKN.init(api)      外壳启动时调用一次（api: route()、current()）
 *   TreetopKN.show(args)     路由 #/map/<范围>/<逻辑>/<焦点>[@来源] 时调用，返回 { book, title }
 *   TreetopKN.hide()         切到总索引、讲义或使用说明时调用
 *   TreetopKN.onView(info)   每次路由后调用，用于讲义顶栏的"网络"按钮
 *
 * 数据：window.KN_DATA（手工维护，knowledge-network-data.js）＋ window.SITE / SEARCH_DATA（生成，只读）。
 * 未整理的部分在运行时用"期→考点"补全，保证每个考点都能从所在册的网络到达。
 * 地址只存范围、逻辑、焦点；选中、展开、滚动存在 sessionStorage（按地址），"回到网络"的返回凭据带标签页标识。
 */
(function () {
  'use strict';
  var D = document, WIN = window;
  var SITE = WIN.SITE || { books: [] };
  var SD = WIN.SEARCH_DATA || [];
  var RAW = (WIN.KN_DATA && typeof WIN.KN_DATA === 'object') ? WIN.KN_DATA : {};

  /* ---------- 小工具 ---------- */
  function arr(x) { return Array.isArray(x) ? x : []; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, c) { return (c || D).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || D).querySelectorAll(s)); }
  function on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var memStore = {};
  function sGet(area, k) { try { var v = WIN[area].getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return memStore[area + k] === undefined ? null : memStore[area + k]; } }
  function sSet(area, k, v) { memStore[area + k] = v; try { WIN[area].setItem(k, JSON.stringify(v)); } catch (e) { /* 存储不可用：只保留在内存中 */ } }
  function rand() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  var REDUCED = WIN.matchMedia && WIN.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function narrow() { return WIN.innerWidth < 900; }

  /* =====================================================================
   * 一、模型：把手工数据与站点数据合成为实体表，并记录校验问题
   * ===================================================================== */
  var KIND_LABEL = {
    bio: '学科', book: '全书', domain: '领域', part: '部分', unit: '单元', ep: '期', point: '考点', concept: '概念',
    topic: '专题', tgroup: '专题分组', line: '主线', task: '大题任务', step: '任务步骤', method: '方法组', group: '分组'
  };
  var STATUS_LABEL = { site: '原文可查', editor: '编辑判断·待确认', title: '仅据标题·待核', proposal: '提议·待确认', sketch: '示意·未对照真题' };
  var CONTAINER = { bio: 1, book: 1, domain: 1, part: 1, unit: 1, ep: 1 };
  var SCOPES = ['bio'].concat(SITE.books.map(function (b) { return b.key; }));
  var LOGICS = { rel: '知识关系', task: '大题任务', method: '推导方法' };

  function refToPid(ref) {
    var m = /^([a-z]{2}\d-\d{2})\/(p\d+)$/.exec(String(ref || ''));
    return m ? m[1] + '.' + m[2] : null;
  }

  function buildModel(raw) {
    var M = { ent: {}, issues: [], books: [], ptConcepts: {}, unitOfEp: {}, partOfEp: {}, rels: [], relsOf: {}, raw: raw };
    function add(o) { if (M.ent[o.id]) { issue('error', 'ID 重复：' + o.id, [o.id]); return M.ent[o.id]; } M.ent[o.id] = o; return o; }
    function issue(level, msg, ids) { M.issues.push({ level: level, msg: msg, ids: ids || [] }); }
    M.issue = issue;

    add({ id: 'bio', kind: 'bio', name: '高中生物' });
    SITE.books.forEach(function (b) {
      M.books.push(b.key);
      var be = add({ id: b.key, kind: 'book', name: b.name, full: b.full, book: b.key, eps: [], parts: [] });
      b.chapters.forEach(function (ch) {
        ch.eps.forEach(function (e) {
          var ee = add({ id: e.slug, kind: 'ep', name: e.short, full: e.full, code: e.code, sec: e.sec, book: b.key, chapter: ch.title, chn: ch.n, pts: [] });
          be.eps.push(e.slug);
          arr(e.points).forEach(function (t, i) {
            var pid = e.slug + '.p' + (i + 1);
            add({ id: pid, kind: 'point', name: t, book: b.key, ep: e.slug, a: 'p' + (i + 1), n: i + 1 });
            ee.pts.push(pid);
          });
        });
      });
    });

    var idOk = function (id, what) {
      if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id)) { issue('error', what + ' 的 ID 不合规：' + id); return false; }
      if (/^[a-z]{2}\d-\d{2}$/.test(id) || M.ent[id]) { issue('error', what + ' 的 ID 与已有 ID 冲突：' + id, [id]); return false; }
      return true;
    };

    arr(raw.domains).forEach(function (d) { if (idOk(d.id, '领域')) add({ id: d.id, kind: 'domain', name: d.name, parts: [] }); });

    /* 部分与"每期登记到唯一部分" */
    arr(raw.parts).forEach(function (p) {
      if (!idOk(p.id, '部分')) return;
      if (!M.ent[p.book] || M.ent[p.book].kind !== 'book') { issue('error', '部分 ' + p.id + ' 的册不存在：' + p.book, [p.id]); return; }
      var dom = M.ent[p.domain] && M.ent[p.domain].kind === 'domain' ? p.domain : null;
      if (!dom) issue('warn', '部分 ' + p.id + ' 未指定有效领域，学科图中归入"未分领域"', [p.id]);
      var pe = add({ id: p.id, kind: 'part', name: p.name, book: p.book, domain: dom, eps: [] });
      arr(p.eps).forEach(function (ep) {
        var e = M.ent[ep];
        if (!e || e.kind !== 'ep') { issue('warn', '部分 ' + p.id + ' 登记的期不存在：' + ep + '（已忽略）', [p.id]); return; }
        if (e.book !== p.book) { issue('warn', '部分 ' + p.id + ' 登记了别册的期：' + ep + '（已忽略）', [p.id]); return; }
        if (M.partOfEp[ep]) { issue('warn', '期 ' + ep + ' 重复登记到 ' + M.partOfEp[ep] + ' 和 ' + p.id + '，以前者为准', [ep]); return; }
        M.partOfEp[ep] = p.id; pe.eps.push(ep);
      });
      M.ent[p.book].parts.push(p.id);
      if (dom) M.ent[dom].parts.push(p.id);
    });
    /* 未登记的期：自动归入"未登记的期"部分（保证可达），并报告 */
    M.books.forEach(function (bk) {
      var miss = M.ent[bk].eps.filter(function (ep) { return !M.partOfEp[ep]; });
      if (!miss.length) return;
      var id = 'auto-' + bk;
      add({ id: id, kind: 'part', name: '未登记的期', book: bk, domain: null, eps: miss, auto: true });
      miss.forEach(function (ep) { M.partOfEp[ep] = id; });
      M.ent[bk].parts.push(id);
      issue('warn', M.ent[bk].name + ' 有 ' + miss.length + ' 期未登记到部分：' + miss.join('、') + '（已暂列于"未登记的期"）', miss);
    });
    if (M.books.some(function (bk) { return M.ent[bk].parts.some(function (p) { return !M.ent[p].domain; }); })) {
      add({ id: 'd-none', kind: 'domain', name: '未分领域', parts: [], auto: true });
      M.books.forEach(function (bk) { M.ent[bk].parts.forEach(function (p) { if (!M.ent[p].domain) { M.ent[p].domain = 'd-none'; M.ent['d-none'].parts.push(p); } }); });
    }

    /* 单元（可跨期；未整理的部分不写单元，运行时用期顶替） */
    arr(raw.units).forEach(function (u) {
      if (!idOk(u.id, '单元')) return;
      var part = M.ent[u.part];
      if (!part || part.kind !== 'part') { issue('error', '单元 ' + u.id + ' 的部分不存在：' + u.part, [u.id]); return; }
      var ue = add({ id: u.id, kind: 'unit', name: u.name, book: part.book, part: u.part, eps: [] });
      arr(u.eps).forEach(function (ep) {
        if (M.partOfEp[ep] !== u.part) { issue('warn', '单元 ' + u.id + ' 的期 ' + ep + ' 不在部分 ' + u.part + ' 中（已忽略）', [u.id]); return; }
        if (M.unitOfEp[ep]) { issue('warn', '期 ' + ep + ' 重复登记到多个单元', [ep]); return; }
        M.unitOfEp[ep] = u.id; ue.eps.push(ep);
      });
    });

    /* 概念：讲义位置带标题快照；第一个有效位置决定主位置 */
    arr(raw.concepts).forEach(function (c) {
      if (!idOk(c.id, '概念')) return;
      var ce = add({ id: c.id, kind: 'concept', name: c.name, alias: arr(c.alias), brief: c.brief || '', briefRef: c.briefRef || '', targets: [], note: c.note || '' });
      arr(c.targets).forEach(function (t) {
        var tg = resolveTarget(M, t.ref, t.t, c.id);
        ce.targets.push(tg);
        if (tg.pid) (M.ptConcepts[tg.pid] = M.ptConcepts[tg.pid] || []).push(c.id);
      });
      var first = ce.targets.filter(function (t) { return t.pid; })[0];
      if (!first) { issue('error', '概念 ' + c.id + ' 没有有效的讲义位置，无法放进骨架', [c.id]); return; }
      ce.book = M.ent[first.ep].book;
      ce.home = (c.home && M.ent[c.home] && (M.ent[c.home].kind === 'unit' || M.ent[c.home].kind === 'ep')) ? c.home : (M.unitOfEp[first.ep] || first.ep);
      ce.books = [];
      ce.targets.forEach(function (t) { if (t.ep && M.ent[t.ep] && ce.books.indexOf(M.ent[t.ep].book) < 0) ce.books.push(M.ent[t.ep].book); });
    });

    /* 关系 */
    var types = raw.relTypes || {};
    arr(raw.relations).forEach(function (r) {
      if (!r || !r.id) return;
      var bad = [r.from, r.to].filter(function (x) { return !M.ent[x]; });
      if (bad.length) { issue('error', '关系 ' + r.id + ' 的端点不存在：' + bad.join('、'), [r.id]); return; }
      if (!types[r.type]) issue('warn', '关系 ' + r.id + ' 的类型未定义：' + r.type, [r.id]);
      if (!arr(r.basis).length) issue('warn', '关系 ' + r.id + ' 缺少依据', [r.id]);
      var re = { id: r.id, from: r.from, to: r.to, type: r.type, label: r.label || '', status: STATUS_LABEL[r.status] ? r.status : 'editor', basis: arr(r.basis), condition: r.condition || '' };
      M.rels.push(re); M.relById = M.relById || {}; M.relById[r.id] = re;
      (M.relsOf[r.from] = M.relsOf[r.from] || []).push(re);
      if (r.to !== r.from) (M.relsOf[r.to] = M.relsOf[r.to] || []).push(re);
    });
    M.relById = M.relById || {};

    function memberId(x, where) {
      var id = refToPid(x) || x;
      if (!M.ent[id]) { issue('warn', where + ' 引用的条目不存在：' + x + '（已忽略）', [where]); return null; }
      return id;
    }
    M.memberId = memberId;

    /* 专题（成员是引用；允许专题内的下级，但不允许成环） */
    M.topics = [];
    arr(raw.topics).forEach(function (t) {
      if (!idOk(t.id, '专题')) return;
      if (t.book && !M.ent[t.book]) issue('warn', '专题 ' + t.id + ' 的册不存在：' + t.book, [t.id]);
      var te = add({ id: t.id, kind: 'topic', name: t.name, book: M.ent[t.book] ? t.book : '', status: t.status || 'editor', note: t.note || '', groups: [] });
      arr(t.groups).forEach(function (g) {
        if (!idOk(g.id, '专题分组')) return;
        var ge = add({ id: g.id, kind: 'tgroup', name: g.name, topic: t.id, items: [] });
        function walk(items, depth, seen) {
          var out = [];
          arr(items).forEach(function (it) {
            var raw0 = typeof it === 'string' ? it : (it && it.id);
            var id = memberId(raw0, t.id); if (!id) return;
            if (seen.indexOf(id) >= 0 || depth > 6) { issue('error', '专题 ' + t.id + ' 的下级成环：' + id, [t.id]); return; }
            out.push({ id: id, children: it && it.children ? walk(it.children, depth + 1, seen.concat(id)) : [] });
          });
          return out;
        }
        ge.items = walk(g.items, 0, []);
        te.groups.push(g.id);
      });
      M.topics.push(t.id);
    });

    /* 主线 */
    M.lines = [];
    arr(raw.lines).forEach(function (l) {
      if (!idOk(l.id, '主线')) return;
      var le = add({ id: l.id, kind: 'line', name: l.name, note: l.note || '', stations: [], edges: [] });
      arr(l.stations).forEach(function (s) { var id = memberId(s, l.id); if (id) le.stations.push(id); });
      arr(l.edges).forEach(function (e) { if (M.relById[e]) le.edges.push(e); else issue('warn', '主线 ' + l.id + ' 的边不存在：' + e, [l.id]); });
      M.lines.push(l.id);
    });

    /* 大题任务 */
    M.tasks = [];
    arr(raw.tasks).forEach(function (t) {
      if (!idOk(t.id, '大题任务')) return;
      var te = add({ id: t.id, kind: 'task', name: t.name, book: M.ent[t.book] ? t.book : '', domain: M.ent[t.domain] ? t.domain : '', status: t.status || 'sketch', note: t.note || '', steps: [] });
      arr(t.steps).forEach(function (s, i) {
        if (!s || !s.id || M.ent[s.id]) { issue('error', '任务 ' + t.id + ' 的步骤 ID 缺失或重复', [t.id]); return; }
        var se = add({ id: s.id, kind: 'step', name: s.name, task: t.id, n: i + 1, use: [], when: s.when || '', not: s.not || '', how: arr(s.how) });
        arr(s.use).forEach(function (u) { var id = memberId(u, s.id); if (id) se.use.push(id); });
        te.steps.push(s.id);
      });
      M.tasks.push(t.id);
    });

    /* 推导方法 */
    M.methods = [];
    arr(raw.methods).forEach(function (m) {
      if (!idOk(m.id, '方法组')) return;
      var me = add({ id: m.id, kind: 'method', name: m.name, status: m.status || 'editor', common: m.common || '', differences: m.differences || '', members: [] });
      arr(m.members).forEach(function (x) { var id = memberId(x && x.id, m.id); if (id) me.members.push({ id: id, note: x.note || '', pending: !!x.pending }); });
      M.methods.push(m.id);
    });

    add({ id: 'g-topics', kind: 'group', name: '跨章专题' });
    add({ id: 'g-lines', kind: 'group', name: '跨册主线' });
    M.evidence = arr(raw.evidence);
    M.relTypes = types;
    return M;
  }

  /* 讲义位置：期存在而考点失效 → 回退该期；期不存在 → 回退本册目录；标题对不上 → 提示并给出同期内唯一同名候选 */
  function resolveTarget(M, ref, snap, owner) {
    var m = /^([a-z]{2}\d-\d{2})\/(p\d+)$/.exec(String(ref || ''));
    var tg = { ref: ref, t: snap || '', pid: null, ep: m ? m[1] : '', a: m ? m[2] : '', warn: '' };
    var book = m ? m[1].slice(0, 3) : '';
    if (!m) { tg.warn = '讲义位置格式无效'; tg.href = '#/'; M.issues.push({ level: 'error', msg: owner + ' 的讲义位置格式无效：' + ref, ids: [owner] }); return tg; }
    var e = M.ent[m[1]];
    if (!e || e.kind !== 'ep') {
      tg.warn = '该期不存在，讲义位置可能已变动'; tg.href = M.ent[book] ? '#/' + book : '#/';
      M.issues.push({ level: 'error', msg: owner + ' 的讲义位置所在期不存在：' + ref, ids: [owner] }); return tg;
    }
    var pid = m[1] + '.' + m[2];
    if (!M.ent[pid]) {
      tg.warn = '考点序号已不存在，讲义位置可能已变动'; tg.href = '#/' + m[1];
      M.issues.push({ level: 'error', msg: owner + ' 的考点不存在：' + ref + '（已回退到该期开头）', ids: [owner] }); return tg;
    }
    tg.pid = pid; tg.href = '#/' + m[1] + '/' + m[2];
    var now = M.ent[pid].name;
    if (snap && now !== snap) {
      tg.warn = '标题快照「' + snap + '」与当前标题「' + now + '」不一致，讲义位置可能已变动';
      var same = e.pts.filter(function (p) { return M.ent[p].name === snap; });
      if (same.length === 1) tg.suggest = same[0];
      M.issues.push({ level: 'warn', msg: owner + '：' + ref + ' 标题快照「' + snap + '」≠ 当前「' + now + '」' + (tg.suggest ? '；同期内同名考点为 ' + M.ent[tg.suggest].a + '（仅作修复候选）' : ''), ids: [owner] });
    }
    return tg;
  }

  /* =====================================================================
   * 二、骨架树：同一批实体在（范围 × 逻辑）下的摆法；节点 key 为路径，可区分主位置与引用
   * ===================================================================== */
  var M = null, TREES = {};
  function tree(scope, logic) {
    var k = scope + '|' + logic;
    if (!TREES[k]) TREES[k] = buildTree(scope, logic);
    return TREES[k];
  }
  function buildTree(scope, logic) {
    var T = { scope: scope, logic: logic, byKey: {}, byId: {} };
    function mk(id, parent, ref, extra) {
      var key = parent ? parent.key + '/' + id : id, k2 = key, i = 2;
      while (T.byKey[k2]) k2 = key + '~' + (i++);
      var n = { key: k2, id: id, parent: parent || null, ref: !!ref, children: [], depth: parent ? parent.depth + 1 : 0 };
      if (extra) for (var p in extra) n[p] = extra[p];
      T.byKey[k2] = n; (T.byId[id] = T.byId[id] || []).push(n);
      if (parent) parent.children.push(n);
      return n;
    }
    function fill(container, eps) {
      var placed = {};
      eps.forEach(function (ep) {
        M.ent[ep].pts.forEach(function (pid) {
          var cs = M.ptConcepts[pid] || [];
          if (!cs.length) { mk(pid, container); return; }
          cs.forEach(function (cid) {
            if (placed[cid] || !M.ent[cid].home) return;
            placed[cid] = 1;
            mk(cid, container, M.ent[cid].home !== container.id);
          });
        });
      });
    }
    function partBody(pn, part) {
      var done = {};
      part.eps.forEach(function (ep) {
        var u = M.unitOfEp[ep];
        if (u) { if (done[u]) return; done[u] = 1; var un = mk(u, pn); fill(un, M.ent[u].eps); }
        else { var en = mk(ep, pn); fill(en, [ep]); }
      });
    }
    function topicBody(parent, tid) {
      var tn = mk(tid, parent);
      M.ent[tid].groups.forEach(function (gid) {
        var gn = mk(gid, tn);
        (function walk(items, p) { items.forEach(function (it) { var n = mk(it.id, p, true); walk(it.children, n); }); })(M.ent[gid].items, gn);
      });
    }
    var root = mk(scope);
    T.root = root;
    var isBio = scope === 'bio';
    if (logic === 'rel') {
      if (isBio) {
        arr(RAW.domains).map(function (d) { return d.id; }).concat(M.ent['d-none'] ? ['d-none'] : []).forEach(function (did) {
          if (!M.ent[did]) return;
          var dn = mk(did, root);
          var parts = M.ent[did].parts.slice().sort(function (a, b) { return M.books.indexOf(M.ent[a].book) - M.books.indexOf(M.ent[b].book); });
          parts.forEach(function (pid) { partBody(mk(pid, dn), M.ent[pid]); });
        });
        if (M.topics.length) { var gt = mk('g-topics', root); M.topics.forEach(function (t) { topicBody(gt, t); }); }
        if (M.lines.length) {
          var gl = mk('g-lines', root);
          M.lines.forEach(function (l) { var ln = mk(l, gl); M.ent[l].stations.forEach(function (s) { mk(s, ln, true); }); });
        }
      } else {
        M.ent[scope].parts.forEach(function (pid) { partBody(mk(pid, root), M.ent[pid]); });
        var tops = M.topics.filter(function (t) { return M.ent[t].book === scope; });
        if (tops.length) { var g = mk('g-topics', root); tops.forEach(function (t) { topicBody(g, t); }); }
      }
    } else if (logic === 'task') {
      var taskBody = function (parent, tid) {
        var tn = mk(tid, parent);
        M.ent[tid].steps.forEach(function (sid) { var sn = mk(sid, tn); M.ent[sid].use.forEach(function (u) { mk(u, sn, true); }); });
      };
      if (isBio) {
        arr(RAW.domains).forEach(function (d) {
          if (!M.ent[d.id]) return;
          var dn = mk(d.id, root);
          M.tasks.filter(function (t) { return M.ent[t].domain === d.id; }).forEach(function (t) { taskBody(dn, t); });
        });
        var loose = M.tasks.filter(function (t) { return !M.ent[t].domain; });
        if (loose.length) { var dl = mk('d-none-task', root, false, { virtualName: '未分领域' }); loose.forEach(function (t) { taskBody(dl, t); }); }
      } else {
        M.tasks.filter(function (t) { return M.ent[t].book === scope; }).forEach(function (t) { taskBody(root, t); });
      }
    } else {
      M.methods.forEach(function (mid) {
        var me = M.ent[mid];
        if (!isBio && !me.members.some(function (x) { return inBook(x.id, scope); })) return;
        var mn = mk(mid, root);
        me.members.forEach(function (x) { mk(x.id, mn, true, { note: x.note, pending: x.pending }); });
      });
    }
    return T;
  }
  function inBook(id, bk) {
    var e = M.ent[id]; if (!e) return false;
    if (e.kind === 'concept') return arr(e.books).indexOf(bk) >= 0;
    return e.book === bk;
  }
  function bookOf(id) { var e = M.ent[id]; if (!e) return ''; return e.book || ''; }
  function bookName(bk) { return M.ent[bk] ? M.ent[bk].name : ''; }
  function primary(T, id) {
    var list = T.byId[id] || [];
    for (var i = 0; i < list.length; i++) if (!list[i].ref) return list[i];
    return list[0] || null;
  }
  function pathOf(n) { var out = []; while (n) { out.unshift(n); n = n.parent; } return out; }
  function nodeName(n) { return n.virtualName || (M.ent[n.id] ? M.ent[n.id].name : n.id); }

  /* 统计：考点数按站点数据计；"已整理"分别给出概念数（主位置在其下的概念） */
  var STAT = {};
  function epsUnder(id) {
    var e = M.ent[id]; if (!e) return [];
    switch (e.kind) {
      case 'bio': return M.books.reduce(function (s, b) { return s.concat(M.ent[b].eps); }, []);
      case 'book': return e.eps;
      case 'domain': return e.parts.reduce(function (s, p) { return s.concat(M.ent[p].eps); }, []);
      case 'part': case 'unit': return e.eps;
      case 'ep': return [id];
    }
    return [];
  }
  function stat(T, n) {
    var k = T.scope + '|' + T.logic + '|' + n.key;
    if (STAT[k]) return STAT[k];
    var s = { pts: 0, concepts: 0, kids: n.children.length };
    var e = M.ent[n.id];
    if (e && CONTAINER[e.kind]) {
      epsUnder(n.id).forEach(function (ep) { s.pts += M.ent[ep].pts.length; });
      var seen = {};
      (function walk(x) { x.children.forEach(function (c) { if (!c.ref && M.ent[c.id] && M.ent[c.id].kind === 'concept' && !seen[c.id]) { seen[c.id] = 1; s.concepts++; } walk(c); }); })(n);
    }
    STAT[k] = s;
    return s;
  }
  function metaText(T, n) {
    var e = M.ent[n.id] || { kind: 'group' }, s = stat(T, n), bits = [];
    switch (e.kind) {
      case 'bio': bits.push(s.kids + ' 项', s.pts + ' 考点'); break;
      case 'book': bits.push(e.parts.length + ' 部分', s.pts + ' 考点'); break;
      case 'domain':
        if (T.logic === 'rel') bits.push(e.parts.length + ' 部分', s.pts + ' 考点');
        else bits.push(n.children.length ? n.children.length + ' 个任务' : '任务 0 · 尚未整理');
        break;
      case 'part':
        var units = n.children.filter(function (c) { return M.ent[c.id] && M.ent[c.id].kind === 'unit'; }).length;
        bits.push(units ? units + ' 单元' : n.children.length + ' 期 · 单元未整理');
        bits.push(s.pts + ' 考点');
        break;
      case 'unit': bits.push(s.pts + ' 考点'); break;
      case 'ep': bits.push(e.code, s.pts + ' 考点'); break;
      case 'point': bits.push(bookName(e.book) + ' ' + M.ent[e.ep].code + '/' + e.a); if (!n.ref) bits.push('未整理'); break;
      case 'concept':
        bits.push('概念'); if (e.targets.length > 1) bits.push(e.targets.length + ' 处讲义');
        if ((M.relsOf[e.id] || []).length) bits.push((M.relsOf[e.id] || []).length + ' 条关系');
        if (T.scope !== 'bio' && e.books.indexOf(T.scope) < 0) bits.push(bookName(e.book));
        else if (T.scope === 'bio' || n.ref) bits.push(bookName(e.book));
        break;
      case 'topic': bits.push(e.groups.length + ' 组', STATUS_LABEL[e.status] || ''); break;
      case 'tgroup': bits.push(n.children.length + ' 项'); break;
      case 'line': bits.push(e.stations.length + ' 站', e.edges.length + ' 条关系'); break;
      case 'task': bits.push(e.steps.length + ' 步', STATUS_LABEL[e.status] || ''); break;
      case 'step': bits.push('第 ' + e.n + ' 步', n.children.length + ' 项'); break;
      case 'method': bits.push(e.members.length + ' 成员', STATUS_LABEL[e.status] || ''); break;
      case 'group': bits.push(n.children.length + (n.id === 'g-lines' ? ' 条主线' : ' 个专题')); break;
    }
    if (n.ref) bits.push('引用');
    return bits.filter(Boolean).join(' · ');
  }

  /* 覆盖与校验报告：索引覆盖（可达考点 / 当前考点总数）与"关系已整理"（概念数、关系数）分开给出 */
  function report() {
    var out = { books: [], points: 0, reachable: 0, concepts: 0, relations: { total: M.rels.length, site: 0, editor: 0, title: 0 }, issues: M.issues.slice(), evidence: M.evidence.length };
    M.rels.forEach(function (r) { out.relations[r.status] = (out.relations[r.status] || 0) + 1; });
    M.books.forEach(function (bk) {
      var T = tree(bk, 'rel'), reach = {}, all = 0;
      M.ent[bk].eps.forEach(function (ep) { all += M.ent[ep].pts.length; });
      Object.keys(T.byKey).forEach(function (k) {
        var n = T.byKey[k], e = M.ent[n.id]; if (!e) return;
        if (e.kind === 'point' && e.book === bk) reach[n.id] = 1;
        if (e.kind === 'concept') e.targets.forEach(function (t) { if (t.pid && M.ent[t.pid].book === bk) reach[t.pid] = 1; });
      });
      var nc = Object.keys(M.ent).filter(function (id) { var e = M.ent[id]; return e.kind === 'concept' && e.book === bk && e.home; }).length;
      var r = Object.keys(reach).length;
      out.books.push({ book: bk, name: M.ent[bk].name, eps: M.ent[bk].eps.length, points: all, reachable: r, concepts: nc, parts: M.ent[bk].parts.length, units: Object.keys(M.ent).filter(function (id) { return M.ent[id].kind === 'unit' && M.ent[id].book === bk; }).length });
      out.points += all; out.reachable += r; out.concepts += nc;
    });
    return out;
  }

  /* 讲义线索：从既有旁白中摘出"考法""高考常…"句（不是考频） */
  var NARR = {};
  SD.forEach(function (x) { if (x.k === 'pt' && x.a) NARR[x.ep + '.' + x.a] = x.o || ''; });
  function sentences(s) { return String(s || '').match(/[^。！？]+[。！？]?/g) || []; }
  function hintsOfPid(pid) { return sentences(NARR[pid]).map(function (z) { return z.trim(); }).filter(function (z) { return /^考法|^高考|常考/.test(z); }); }
  function excerpt(pid) {
    var ss = sentences(NARR[pid]).map(function (z) { return z.trim(); });
    if (ss.length && /^考点[一二三四五六七八九十]+[，,]/.test(ss[0])) ss[0] = ss[0].replace(/^考点[一二三四五六七八九十]+[，,]\s*/, '');
    var t = ss.slice(0, 2).join('');
    return t.length > 110 ? t.slice(0, 108) + '…' : t;
  }
  function pidsOf(id) {
    var e = M.ent[id]; if (!e) return [];
    if (e.kind === 'point') return [id];
    if (e.kind === 'concept') return e.targets.filter(function (t) { return t.pid; }).map(function (t) { return t.pid; });
    if (CONTAINER[e.kind]) return epsUnder(id).reduce(function (s, ep) { return s.concat(M.ent[ep].pts); }, []);
    return [];
  }
  /* 某实体（含容器内的全部内容）出现在哪些任务、方法组中 */
  function idsInside(id) {
    var e = M.ent[id], set = {}; set[id] = 1;
    if (e && CONTAINER[e.kind]) {
      pidsOf(id).forEach(function (p) { set[p] = 1; (M.ptConcepts[p] || []).forEach(function (c) { set[c] = 1; }); });
    } else if (e && e.kind === 'point') (M.ptConcepts[id] || []).forEach(function (c) { set[c] = 1; });
    return set;
  }
  function tasksFor(id) {
    var set = idsInside(id), out = [];
    M.tasks.forEach(function (t) { M.ent[t].steps.forEach(function (s) { if (M.ent[s].use.some(function (u) { return set[u]; })) out.push(s); }); });
    return out;
  }
  function methodsFor(id) {
    var set = idsInside(id);
    return M.methods.filter(function (m) { return M.ent[m].members.some(function (x) { return set[x.id]; }); });
  }

  /* =====================================================================
   * 三、地址、会话状态与返回凭据
   * ===================================================================== */
  var TAB = (function () {
    try { if (/^kn-tab-/.test(WIN.name)) return WIN.name; if (!WIN.name) { WIN.name = 'kn-tab-' + rand(); return WIN.name; } } catch (e) { /* ignore */ }
    return 'kn-mem-' + rand();
  })();
  function mapUrl(scope, logic, focus, via) {
    var s = '#/map/' + scope;
    if (logic !== 'rel' || (focus && focus !== scope)) s += '/' + logic;
    if (focus && focus !== scope) s += '/' + encodeURIComponent(focus) + (via ? '@' + encodeURIComponent(via) : '');
    return s;
  }
  function viewStates() { return sGet('sessionStorage', 'tt-kn-view') || {}; }
  function getView(url) { var v = viewStates()[url]; return v && typeof v === 'object' ? v : null; }
  function putView(url, patch) {
    var all = viewStates(), v = all[url] || {};
    for (var k in patch) v[k] = patch[k];
    v.at = Date.now(); all[url] = v;
    var keys = Object.keys(all);
    if (keys.length > 150) keys.sort(function (a, b) { return (all[a].at || 0) - (all[b].at || 0); }).slice(0, keys.length - 150).forEach(function (k) { delete all[k]; });
    sSet('sessionStorage', 'tt-kn-view', all);
  }
  function visited() { return sGet('sessionStorage', 'tt-kn-visited') || []; }
  function markVisited(id) { var v = visited(); if (v.indexOf(id) < 0) { v.push(id); if (v.length > 400) v.shift(); sSet('sessionStorage', 'tt-kn-visited', v); } }
  function trail() { var t = sGet('sessionStorage', 'tt-kn-trail'); return Array.isArray(t) ? t : []; }
  function pushTrail(item) { var t = trail(); if (t.length && t[t.length - 1].url === item.url) return; t.push(item); if (t.length > 20) t.shift(); sSet('sessionStorage', 'tt-kn-trail', t); }
  /* 返回凭据：只属于创建它的标签页；active 表示"当前这段阅读确实是从网络进入的"。
   * 从网络打开讲义时生效；在讲义之间连续翻期保持；回到网络、去总索引/目录/使用说明、或从非讲义页面独立打开讲义时失效；
   * 浏览器前进/后退回到那条"由网络打开"的历史项（history.state.kn 与凭据一致）时重新生效。 */
  function readCtx() {
    var c = sGet('sessionStorage', 'tt-kn-return');
    return c && c.tab === TAB && typeof c.url === 'string' && c.url.indexOf('#/map/') === 0 ? c : null;
  }
  function stateToken() { try { return history.state && history.state.kn; } catch (e) { return ''; } }
  function returnCtx() {
    var c = readCtx(); if (!c) return null;
    return c.active || stateToken() === c.token ? c : null;
  }
  function setCtxActive(v) { var c = readCtx(); if (c && !!c.active !== v) { c.active = v; sSet('sessionStorage', 'tt-kn-return', c); } }

  /* =====================================================================
   * 四、页面状态与渲染
   * ===================================================================== */
  var api = null, root = null, refs = {};
  var S = { scope: 'bio', logic: 'rel', focusKey: '', sel: '', selId: '', exp: [], more: [], url: '', notice: '', shown: false, lines: [], preview: '' };
  var gen = 0;

  function T() { return tree(S.scope, S.logic); }
  function cur() { return T().byKey[S.focusKey] || T().root; }
  function scopeLabel(s) { return s === 'bio' ? '学科' : bookName(s); }
  function scopeFull(s) { return s === 'bio' ? '高中生物（学科）' : (M.ent[s] ? M.ent[s].full : s); }

  function buildDom() {
    var stage = $('#stage'); if (!stage) return false;
    root = D.createElement('section');
    root.id = 'kn'; root.className = 'kn'; root.hidden = true;
    root.setAttribute('aria-label', '知识网络');
    var scopeMenu = SCOPES.map(function (s) {
      return '<button type="button" role="menuitemradio" data-act="scope" data-v="' + s + '">' + esc(scopeFull(s)) + '</button>';
    }).join('');
    root.innerHTML =
      '<div class="kn-bar">' +
        '<div class="kn-scope"><button type="button" class="kn-scope-btn" aria-haspopup="true" aria-expanded="false" data-act="scope-menu"><span class="kn-k">范围</span><b></b><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5z"/></svg></button>' +
          '<div class="kn-menu" role="menu" hidden>' + scopeMenu + '</div></div>' +
        '<div class="kn-logic" role="tablist" aria-label="组织逻辑">' +
          Object.keys(LOGICS).map(function (l) { return '<button type="button" role="tab" data-act="logic" data-v="' + l + '">' + LOGICS[l] + '</button>'; }).join('') + '</div>' +
        '<div class="kn-form" role="group" aria-label="呈现形式"><button type="button" data-act="form" data-v="graph" aria-pressed="false">图</button><button type="button" data-act="form" data-v="list" aria-pressed="false">列表</button></div>' +
        '<div class="kn-find"><input type="search" class="kn-find-q" placeholder="在网络中查找概念、考点…" aria-label="在知识网络中查找" autocomplete="off"><div class="kn-find-res" role="listbox" hidden></div></div>' +
        '<button type="button" class="kn-info-btn" data-act="report">覆盖与说明</button>' +
      '</div>' +
      '<div class="kn-sub"><nav class="kn-crumbs" aria-label="在结构中的位置"></nav><div class="kn-from"></div></div>' +
      '<div class="kn-notice" role="status" hidden></div>' +
      '<div class="kn-hint" hidden><span>单击节点只选中并显示信息卡；用"展开 ▸"看下一层，用"读讲义 ›"进入正文。键盘：Tab 选到节点后按 Enter，方向键在网络内移动，空格仍控制播放器。</span><button type="button" data-act="hint-close">知道了</button></div>' +
      '<div class="kn-body">' +
        '<div class="kn-view">' +
          '<div class="kn-canvas" role="group" aria-label="知识网络图"><div class="kn-world"><svg class="kn-edges" aria-hidden="true"></svg><div class="kn-nodes"></div></div></div>' +
          '<div class="kn-list" hidden></div>' +
        '</div>' +
        '<aside class="kn-card" aria-label="信息卡" tabindex="-1"></aside>' +
      '</div>' +
      '<div class="kn-report" role="dialog" aria-modal="false" aria-label="覆盖与说明" hidden></div>';
    var frame = $('#frame');
    stage.insertBefore(root, frame || null);
    refs = {
      scopeBtn: $('.kn-scope-btn', root), menu: $('.kn-menu', root), crumbs: $('.kn-crumbs', root), from: $('.kn-from', root),
      notice: $('.kn-notice', root), hint: $('.kn-hint', root), canvas: $('.kn-canvas', root), world: $('.kn-world', root),
      svg: $('.kn-edges', root), nodes: $('.kn-nodes', root), list: $('.kn-list', root), card: $('.kn-card', root),
      q: $('.kn-find-q', root), res: $('.kn-find-res', root), report: $('.kn-report', root)
    };
    return true;
  }

  /* ---------- 路由入口 ---------- */
  function show(args) {
    if (!root) return { book: '', title: '知识网络' };
    var parts = String(args || '').split('/').filter(function (x) { return x !== ''; });
    var scope = parts[0] || 'bio', logic = parts[1] || 'rel', fraw = parts.slice(2).join('/');
    var notes = [];
    if (SCOPES.indexOf(scope) < 0) { notes.push('范围「' + scope + '」不存在，已回到学科网络。'); scope = 'bio'; }
    if (!LOGICS[logic]) { notes.push('组织逻辑「' + logic + '」不存在，已改用知识关系。'); logic = 'rel'; }
    var fid = '', via = '';
    if (fraw) { var at = fraw.split('@'); try { fid = decodeURIComponent(at[0]); via = at[1] ? decodeURIComponent(at[1]) : ''; } catch (e) { fid = at[0]; } }
    var tr = tree(scope, logic), focus = tr.root, selKey = '';
    if (fid && fid !== scope) {
      var inst = pickInstance(tr, fid, via);
      if (!inst && placeId(fid) !== fid && pickInstance(tr, placeId(fid), '')) {
        /* 已整理的考点、并入单元的期：落到代替它的概念或单元 */
        notes.push(placeNote(fid, placeId(fid)));
        inst = pickInstance(tr, placeId(fid), '');
      }
      if (!inst) {
        /* 深链失效时逐级退回：考点 → 所在期或单元；期 → 单元；其余 → 范围根 */
        var e = M.ent[fid], alt = null;
        if (!e && /^[a-z]{2}\d-\d{2}\.p\d+$/.test(fid) && M.ent[fid.split('.')[0]]) alt = pickInstance(tr, M.unitOfEp[fid.split('.')[0]] || fid.split('.')[0], '');
        else if (e && e.kind === 'point') alt = pickInstance(tr, M.unitOfEp[e.ep] || e.ep, '');
        else if (e && e.kind === 'ep') alt = pickInstance(tr, M.unitOfEp[fid] || fid, '');
        notes.push((e ? '「' + e.name + '」不在' + scopeLabel(scope) + '的' + LOGICS[logic] + '视图中' : '节点「' + fid + '」不存在或已更名') + (alt ? '，已定位到上一级。' : '，已回到' + scopeLabel(scope) + '总览。'));
        focus = alt || tr.root;
      } else if (!inst.children.length && inst.parent) { focus = inst.parent; selKey = inst.key; }
      else focus = inst;
    }
    S.scope = scope; S.logic = logic; S.focusKey = focus.key;
    var url = urlFor(tr, focus, selKey ? tr.byKey[selKey] : null);
    if (location.hash !== url) { try { history.replaceState(history.state, '', url); } catch (e) { /* ignore */ } }
    S.url = url;
    var v = getView(url);
    if (v) {
      S.sel = v.sel && tr.byKey[v.sel] ? v.sel : '';
      S.selId = S.sel ? tr.byKey[S.sel].id : (v.selId && M.ent[v.selId] ? v.selId : '');
      S.exp = arr(v.exp).filter(function (k) { return tr.byKey[k]; });
      S.more = arr(v.more).filter(function (k) { return tr.byKey[k]; });
    } else {
      S.sel = selKey; S.selId = selKey ? tr.byKey[selKey].id : (S.carrySel && M.ent[S.carrySel] ? S.carrySel : ''); S.exp = defaultExp(tr, focus); S.more = [];
    }
    /* 地址优先：叶子地址一定选中该叶子；焦点地址不恢复旧会话里的叶子选中（否则地址与选中不一致） */
    if (selKey) { S.sel = selKey; S.selId = tr.byKey[selKey].id; }
    else if (S.sel && isLeafSel(focus, tr.byKey[S.sel])) { S.sel = ''; S.selId = ''; }
    S.carrySel = '';
    if (S.pendingNotice) { notes.unshift(S.pendingNotice); S.pendingNotice = ''; }
    S.notice = notes.join(' ');
    S.preview = '';
    /* 刚从讲义回来时，回执的地址与当前一致就清掉"来路"末项 */
    var tl = trail(); if (tl.length && tl[tl.length - 1].url === url) { tl.pop(); sSet('sessionStorage', 'tt-kn-trail', tl); }
    sSet('localStorage', 'tt-kn-last', { url: url, label: placeLabel() });
    root.hidden = false; S.shown = true;
    root.classList.remove('kn-drawer-open');
    render();
    var sv = v || {};
    restoreScroll(sv.sx || 0, sv.sy || 0);
    return { book: scope === 'bio' ? '' : scope, title: '知识网络 · ' + scopeLabel(scope) + (focus === tr.root ? '' : ' · ' + nodeName(focus)) };
  }
  function hide() { if (root) { root.hidden = true; S.shown = false; closePop(); } }

  /* 落点映射：已整理的考点在骨架里由概念代替，已并入单元的期由单元代替。返回网络里实际存在的条目 ID */
  function placeId(id) {
    var e = M.ent[id]; if (!e) return id;
    if (e.kind === 'point') { var cs = (M.ptConcepts[id] || []).filter(function (c) { return M.ent[c].home; }); return cs.length ? cs[0] : id; }
    if (e.kind === 'ep' && M.unitOfEp[id]) return M.unitOfEp[id];
    return id;
  }
  function placeNote(from, to) {
    if (from === to || !M.ent[from] || !M.ent[to]) return '';
    var f = M.ent[from], t = M.ent[to];
    if (f.kind === 'point') {
      var cs = (M.ptConcepts[from] || []).filter(function (c) { return M.ent[c].home; });
      var where = '考点「' + f.name + '」（' + M.ent[f.ep].code + '/' + f.a + '）';
      if (cs.length > 1) return where + '已整理为 ' + cs.length + ' 个概念：' + cs.map(function (c) { return '「' + M.ent[c].name + '」'; }).join('') + '，已定位到「' + t.name + '」。';
      return where + '已整理为概念「' + t.name + '」，已定位到该概念。';
    }
    if (f.kind === 'ep') return M.ent[from].code + '「' + f.name + '」在网络中整理为单元「' + t.name + '」，已定位到该单元。';
    return '';
  }
  function pickInstance(tr, id, via) {
    var list = tr.byId[id] || [];
    if (!list.length) return null;
    if (via) for (var i = 0; i < list.length; i++) if (list[i].parent && list[i].parent.id === via) return list[i];
    return primary(tr, id);
  }
  function viaFor(tr, n) {
    if (!n || !n.parent) return '';
    var p = primary(tr, n.id);
    return p === n ? '' : n.parent.id;
  }
  function defaultExp(tr, focus) {
    if (focus === tr.root && tr.logic === 'rel') return [];
    var kids = focus.children, total = 0;
    kids.forEach(function (c) { total += c.children.length; });
    if (kids.length <= 7 && total <= 44) return kids.filter(function (c) { return c.children.length; }).map(function (c) { return c.key; });
    return [];
  }
  function saveView(extra) {
    if (!S.url) return;
    var p = { sel: S.sel, selId: S.selId, exp: S.exp, more: S.more };
    if (extra) for (var k in extra) p[k] = extra[k];
    putView(S.url, p);
  }
  function placeLabel() {
    var n = cur(), bits = [scopeLabel(S.scope)];
    if (n !== T().root) bits.push(nodeName(n));
    if (S.logic !== 'rel') bits.push(LOGICS[S.logic]);
    return bits.join(' › ');
  }

  /* ---------- 导航动作（各算一步历史） ---------- */
  function go(url) { if (location.hash === url) { api && api.route(); } else location.hash = url; }
  function focusNode(n, opts) {
    opts = opts || {};
    var tr = T();
    var url = urlFor(tr, n, opts.sel ? tr.byKey[opts.sel] : null);
    if (opts.sel) putView(url, { sel: opts.sel, selId: tr.byKey[opts.sel] ? tr.byKey[opts.sel].id : '', exp: getView(url) ? getView(url).exp : defaultExp(tr, n), more: [] });
    go(url);
  }
  function addNote(m) { if (m && (S.pendingNotice || '').indexOf(m) < 0) S.pendingNotice = (S.pendingNotice ? S.pendingNotice + ' ' : '') + m; }
  /* 地址：焦点地址；若选中的是焦点下的叶子，则用叶子地址（打开时显示其上级并选中它），便于复制和分享 */
  function isLeafSel(focus, n) { return !!(n && n.parent === focus && !n.children.length); }
  function urlFor(tr, focus, selNode) {
    if (isLeafSel(focus, selNode)) return mapUrl(tr.scope, tr.logic, selNode.id, viaFor(tr, selNode));
    return mapUrl(tr.scope, tr.logic, focus === tr.root ? '' : focus.id, viaFor(tr, focus));
  }
  /* 选中变化后用 replaceState 同步地址（不新增历史），会话状态随地址迁移 */
  function syncUrl() {
    if (!S.shown) return;
    var tr = T(), want = urlFor(tr, cur(), S.sel ? tr.byKey[S.sel] : null);
    if (want === S.url) return;
    var v = getView(S.url) || {};
    v.sel = S.sel; v.selId = S.selId; v.exp = S.exp; v.more = S.more;
    putView(want, v);
    S.url = want;
    try { history.replaceState(history.state, '', want); } catch (e) { /* ignore */ }
    sSet('localStorage', 'tt-kn-last', { url: want, label: placeLabel() });
  }
  /* 前往某实体：在给定范围（缺省为当前范围，不在则扩大到学科）的当前逻辑里定位；叶子则聚焦其上级并选中 */
  function goEntity(id, opts) {
    opts = opts || {};
    var scope = opts.scope || S.scope, logic = opts.logic || S.logic;
    var tr = tree(scope, logic), inst = pickInstance(tr, id, opts.via || '');
    if (!inst && placeId(id) !== id) {
      var to = placeId(id), note = placeNote(id, to);
      addNote(note);
      id = to; inst = pickInstance(tr, id, '');
    }
    if (!inst && !opts.scope && scope !== 'bio') {
      var tb = tree('bio', logic), ib = pickInstance(tb, id, '');
      if (ib) { addNote('范围已由' + scopeLabel(scope) + '变为学科：「' + M.ent[id].name + '」不在' + scopeLabel(scope) + '的' + LOGICS[logic] + '视图中。'); scope = 'bio'; tr = tb; inst = ib; }
    }
    if (!inst && logic !== 'rel') {
      var trr = tree(scope, 'rel'), ir = pickInstance(trr, id, '');
      if (!ir && scope !== 'bio') { trr = tree('bio', 'rel'); ir = pickInstance(trr, id, ''); if (ir) scope = 'bio'; }
      if (ir) { addNote('「' + M.ent[id].name + '」不在' + LOGICS[logic] + '视图中，已切到知识关系。'); logic = 'rel'; tr = trr; inst = ir; }
    }
    if (!inst) { S.pendingNotice = ''; flash('「' + (M.ent[id] ? M.ent[id].name : id) + '」暂时无法在网络中定位。'); return; }
    if (opts.trail !== false) pushTrail({ url: S.url, label: placeLabel() });
    var focus = inst, sel = '';
    if (!inst.children.length && inst.parent) { focus = inst.parent; sel = inst.key; }
    else if (opts.selectSelf && inst.parent) { focus = inst.parent; sel = inst.key; }
    var url = urlFor(tr, focus, sel ? tr.byKey[sel] : null);
    var old = getView(url);
    putView(url, { sel: sel, selId: sel ? id : '', exp: old ? old.exp : defaultExp(tr, focus), more: old ? old.more : [] });
    if (scope !== S.scope && S.shown && !opts.fromLecture && (S.pendingNotice || '').indexOf('范围已由') < 0) addNote('范围已由' + scopeLabel(S.scope) + '变为' + scopeLabel(scope) + '。');
    go(url);
  }
  function setScope(s) {
    if (s === S.scope) return;
    var keepId = S.selId || (cur() !== T().root ? cur().id : '');
    var tr = tree(s, S.logic);
    var from = scopeLabel(S.scope);
    if (keepId && pickInstance(tr, keepId, '')) { S.pendingNotice = '范围已由' + from + '变为' + scopeLabel(s) + '。'; goEntity(keepId, { scope: s, trail: false }); return; }
    if (keepId) S.pendingNotice = '范围已由' + from + '变为' + scopeLabel(s) + '；「' + M.ent[keepId].name + '」不在新范围中，已回到总览。';
    go(mapUrl(s, S.logic, '', ''));
  }
  function setLogic(l) {
    if (l === S.logic) return;
    var keepId = S.selId || (cur() !== T().root ? cur().id : '');
    var tr = tree(S.scope, l);
    if (keepId && pickInstance(tr, keepId, '')) { goEntity(keepId, { logic: l, scope: S.scope, trail: false }); return; }
    if (keepId) { S.pendingNotice = '「' + M.ent[keepId].name + '」不在' + LOGICS[l] + '视图中，信息卡仍显示它；此处是' + scopeLabel(S.scope) + '的' + LOGICS[l] + '总览。'; S.carrySel = keepId; }
    go(mapUrl(S.scope, l, '', ''));
  }
  function select(key) {
    var tr = T(), n = tr.byKey[key];
    if (!n) return;
    S.sel = key; S.selId = n.id; S.preview = '';
    saveView(); syncUrl();
    render({ keepScroll: true });
    if (narrow()) openDrawer(true);
  }
  function selectId(id) { S.sel = ''; S.selId = id; S.preview = ''; saveView(); syncUrl(); render({ keepScroll: true }); if (narrow()) openDrawer(true); }
  function toggleExp(key) {
    var i = S.exp.indexOf(key);
    if (i >= 0) S.exp.splice(i, 1);
    else {
      S.exp.push(key);
      /* 同屏控制：同一焦点下最多同时展开 4 个分支，超出时收起最早展开的 */
      var n = T().byKey[key], sibs = n && n.parent ? n.parent.children.map(function (c) { return c.key; }) : [];
      var open = S.exp.filter(function (k) { return sibs.indexOf(k) >= 0; });
      while (open.length > 4) { var drop = open.shift(); S.exp.splice(S.exp.indexOf(drop), 1); }
    }
    saveView(); render({ keepScroll: true });
  }
  function toggleMore(key) { var i = S.more.indexOf(key); if (i >= 0) S.more.splice(i, 1); else S.more.push(key); saveView(); render({ keepScroll: true }); }
  function openLecture(pid, href, label) {
    var tg = href || (M.ent[pid] ? '#/' + M.ent[pid].ep + '/' + M.ent[pid].a : '#/');
    var token = rand();
    saveView(scrollPos());
    sSet('sessionStorage', 'tt-kn-return', { tab: TAB, token: token, url: S.url, label: label || placeLabel(), at: Date.now(), active: true });
    if (S.selId) markVisited(S.selId);
    if (pid) markVisited(pid);
    try { history.pushState({ kn: token }, '', tg); if (api) api.route(); }
    catch (e) { location.hash = tg; }
  }

  /* ---------- 渲染 ---------- */
  function form() {
    var p = sGet('localStorage', 'tt-kn-form');
    if (p === 'graph' || p === 'list') return p;
    return narrow() ? 'list' : 'graph';
  }
  function render(opts) {
    opts = opts || {};
    gen++;
    var tr = T(), focus = cur();
    if (S.sel && !tr.byKey[S.sel]) { S.sel = ''; }
    refs.scopeBtn.querySelector('b').textContent = scopeLabel(S.scope);
    $$('.kn-menu [data-act="scope"]', root).forEach(function (b) { b.setAttribute('aria-checked', b.getAttribute('data-v') === S.scope ? 'true' : 'false'); });
    $$('.kn-logic [data-act="logic"]', root).forEach(function (b) { var on1 = b.getAttribute('data-v') === S.logic; b.setAttribute('aria-selected', on1 ? 'true' : 'false'); b.tabIndex = on1 ? 0 : -1; });
    var f = form();
    $$('.kn-form [data-act="form"]', root).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === f ? 'true' : 'false'); });
    renderCrumbs(tr, focus);
    renderFrom();
    refs.notice.hidden = !S.notice;
    refs.notice.innerHTML = S.notice ? '<span>' + esc(S.notice) + '</span><button type="button" data-act="notice-close" aria-label="关闭提示">×</button>' : '';
    refs.hint.hidden = !!sGet('localStorage', 'tt-kn-hint');
    root.classList.toggle('kn-is-list', f === 'list');
    refs.canvas.hidden = f === 'list'; refs.list.hidden = f !== 'list';
    if (f === 'graph') renderGraph(tr, focus, opts);
    else {
      /* 列表整体重绘后，把键盘焦点放回同一个控件 */
      var ae = D.activeElement, inList = ae && refs.list.contains(ae);
      var aAct = inList ? ae.getAttribute('data-act') : '', aKey = inList ? ae.getAttribute('data-key') : '';
      var ly = refs.list.scrollTop;
      renderList(tr, focus);
      if (opts.keepScroll) refs.list.scrollTop = ly;
      if (inList && aKey) {
        var again = $('[data-act="' + aAct + '"][data-key="' + cssEsc(aKey) + '"]', refs.list) || $('.kn-l-main[data-key="' + cssEsc(aKey) + '"]', refs.list);
        if (again) again.focus({ preventScroll: true });
      }
    }
    renderCard();
  }
  function renderCrumbs(tr, focus) {
    var p = pathOf(focus), html = p.map(function (n, i) {
      var last = i === p.length - 1;
      return (i ? '<span class="kn-sep" aria-hidden="true">›</span>' : '') +
        (last ? '<span aria-current="location">' + esc(nodeName(n)) + '</span>' : '<button type="button" data-act="focus" data-key="' + esc(n.key) + '">' + esc(nodeName(n)) + '</button>');
    }).join('');
    var all = (tr.byId[focus.id] || []).length;
    if (all > 1) html += '<span class="kn-multi" title="同一个条目在本视图中有多处位置">共 ' + all + ' 处</span>';
    if (S.logic !== 'rel') html += '<span class="kn-crumb-logic">' + LOGICS[S.logic] + '</span>';
    refs.crumbs.innerHTML = html;
  }
  function renderFrom() {
    var t = trail(), last = t[t.length - 1];
    refs.from.innerHTML = last ? '<button type="button" data-act="trail" title="回到这次跳转前的位置">↩ ' + esc(last.label) + '</button>' : '';
  }

  /* ---- 图：总览（中心发散）与展开（主干收到左侧，子集向右） ---- */
  var GEO = { pad: 18, colW: 184, chipH: 34, chipGap: 8, sibH: 28, sibGap: 4, focusH: 96, childW: 212, childH: 58, childGap: 10,
    grandW: 196, grandH: 34, grandGap: 6, colGap: 36, portW: 200, portH: 32, ringW: 164, ringH: 86, centerW: 196, centerH: 80 };
  var LIMIT_KIDS = 12, SHOW_KIDS = 10, LIMIT_GRAND = 8, SHOW_GRAND = 7;

  function visibleKids(n, limit, show) {
    var kids = n.children;
    if (kids.length <= limit || S.more.indexOf(n.key) >= 0) return { list: kids, extra: 0 };
    return { list: kids.slice(0, show), extra: kids.length - show };
  }
  function overlap(a, b, m) { return a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m; }
  function layout(tr, focus, Wv, Hv) {
    var L = { nodes: [], edges: [], w: 0, h: 0, overview: false };
    var g = GEO;
    if (focus === tr.root && S.logic === 'rel') {
      /* 总览：中心向外发散，第一圈之外只给数量角标；半径按"互不重叠"自动加大，超出视口时可滚动 */
      L.overview = true;
      var ring = focus.children.filter(function (c) { return c.id !== 'g-lines'; });
      var hasLines = focus.children.some(function (c) { return c.id === 'g-lines'; });
      var linesH = hasLines ? 74 : 0;
      var W0 = Math.max(Wv, 600), H0 = Math.max(Hv - linesH, 420);
      var rx = clamp(W0 / 2 - g.ringW / 2 - g.pad, 190, 480), ry = clamp(H0 / 2 - g.ringH / 2 - g.pad, 130, 300);
      var boxes = [], center;
      for (var it = 0; it < 40; it++) {
        W0 = Math.max(W0, 2 * rx + g.ringW + 2 * g.pad); H0 = Math.max(H0, 2 * ry + g.ringH + 2 * g.pad);
        var cx = W0 / 2, cy = H0 / 2;
        center = { x: cx - g.centerW / 2, y: cy - g.centerH / 2, w: g.centerW, h: g.centerH };
        /* 沿以中心为心的矩形周边等距排布（顺时针），比椭圆更能用满矩形视口；同一尺寸下先试不同起点，都重叠才加大 */
        var bad = true;
        for (var ph = 0; ph < 10 && bad; ph++) {
          boxes = ringBoxes(ring.length, rx, ry, cx, cy, (ph + 5) % 10 / 10);
          bad = false;
          for (var i = 0; i < boxes.length && !bad; i++) {
            if (overlap(boxes[i], center, 10)) bad = true;
            for (var j = i + 1; j < boxes.length && !bad; j++) if (overlap(boxes[i], boxes[j], 6)) bad = true;
          }
        }
        if (!bad) break;
        /* 先加高（竖向滚动更自然），高到一定程度再加宽 */
        if (ry < 300) ry *= 1.06; else rx *= 1.05;
      }
      L.nodes.push({ key: focus.key, n: focus, role: 'center', x: center.x, y: center.y, w: center.w, h: center.h });
      ring.forEach(function (c, i) {
        var b = boxes[i];
        L.nodes.push({ key: c.key, n: c, role: 'ring', x: b.x, y: b.y, w: b.w, h: b.h });
        L.edges.push({ d: 'M' + (W0 / 2) + ' ' + (H0 / 2) + 'L' + (b.x + b.w / 2) + ' ' + (b.y + b.h / 2), cls: 'kn-e-spoke' + (c.id === 'g-topics' ? ' kn-e-dash' : '') });
      });
      L.w = W0; L.h = H0 + linesH; L.cx = W0 / 2; L.cy = H0 / 2;
      if (hasLines) L.linesY = H0;
      return L;
    }
    /* 展开：左列是收拢的主干（根与各级祖先各一个小牌）＋焦点＋同级；子集向右，最多再展开一层 */
    var anc = pathOf(focus).slice(0, -1);
    var x0 = g.pad, xC = x0 + g.colW + g.colGap, xG = xC + g.childW + g.colGap;
    var ty = g.pad;
    anc.forEach(function (a, i) {
      L.nodes.push({ key: a.key, n: a, role: 'trunk', x: x0, y: ty, w: g.colW, h: g.chipH, sibs: a.parent ? a.parent.children.length - 1 : 0 });
      if (i) L.edges.push({ d: 'M' + (x0 + 14) + ' ' + (ty - g.chipGap) + 'V' + ty, cls: 'kn-e-trunk' });
      ty += g.chipH + g.chipGap;
    });
    if (anc.length) L.edges.push({ d: 'M' + (x0 + 14) + ' ' + (ty - g.chipGap) + 'V' + ty, cls: 'kn-e-trunk' });
    var fy = ty;
    L.nodes.push({ key: focus.key, n: focus, role: 'focus', x: x0, y: fy, w: g.colW, h: g.focusH });
    ty += g.focusH + 10;
    /* 当前层的同级按原顺序排成一列（当前项高亮），可横向换焦点 */
    if (focus.parent && focus.parent.children.length > 1) {
      var sv = visibleKids(focus.parent, 14, 12);
      L.sibLabel = { x: x0, y: ty }; ty += 22;
      sv.list.forEach(function (s) {
        L.nodes.push({ key: 'sib:' + s.key, n: s, role: 'sib', x: x0, y: ty, w: g.colW, h: g.sibH, current: s === focus });
        ty += g.sibH + g.sibGap;
      });
      if (sv.extra) { L.nodes.push({ key: 'more:' + focus.parent.key, n: focus.parent, role: 'more', x: x0, y: ty, w: g.colW, h: g.sibH, extra: sv.extra }); ty += g.sibH + g.sibGap; }
    }
    /* 子集与原地展开的孙级 */
    var y = g.pad, mids = [];
    var kv = visibleKids(focus, LIMIT_KIDS, SHOW_KIDS);
    kv.list.forEach(function (c) {
      var expanded = S.exp.indexOf(c.key) >= 0 && c.children.length;
      L.nodes.push({ key: c.key, n: c, role: 'child', x: xC, y: y, w: g.childW, h: g.childH, expanded: !!expanded });
      mids.push(y + g.childH / 2);
      if (expanded) {
        var gy = y, gm = [];
        var gv = visibleKids(c, LIMIT_GRAND, SHOW_GRAND);
        gv.list.forEach(function (gc) { L.nodes.push({ key: gc.key, n: gc, role: 'grand', x: xG, y: gy, w: g.grandW, h: g.grandH }); gm.push(gy + g.grandH / 2); gy += g.grandH + g.grandGap; });
        if (gv.extra) { L.nodes.push({ key: 'more:' + c.key, n: c, role: 'more', x: xG, y: gy, w: g.grandW, h: g.grandH, extra: gv.extra }); gm.push(gy + g.grandH / 2); gy += g.grandH + g.grandGap; }
        L.edges.push(bracket(xC + g.childW, y + g.childH / 2, xG, gm, 'kn-e-grand'));
        y = Math.max(y + g.childH + g.childGap, gy - g.grandGap + g.childGap + 8);
      } else y += g.childH + g.childGap;
    });
    if (kv.extra || (S.more.indexOf(focus.key) >= 0 && focus.children.length > LIMIT_KIDS)) { L.nodes.push({ key: 'more:' + focus.key, n: focus, role: 'more', x: xC, y: y, w: g.childW, h: 36, extra: kv.extra }); mids.push(y + 18); y += 36 + g.childGap; }
    if (mids.length) L.edges.push(bracket(x0 + g.colW, fy + g.focusH / 2, xC, mids, 'kn-e-child'));
    var maxX = L.nodes.reduce(function (m, nd) { return Math.max(m, nd.x + nd.w); }, 0);
    L.portX = maxX + g.colGap;
    L.w = maxX + g.pad; L.h = Math.max(ty, y, fy + g.focusH + 40) + g.pad;
    return L;
  }
  function ringBoxes(n, rx, ry, cx, cy, phase) {
    var g = GEO, out = [], P = 4 * (rx + ry);
    for (var i = 0; i < n; i++) {
      var sp = (P * (i + phase) / n) % P, px, py;
      if (sp < rx) { px = sp; py = -ry; }
      else if (sp < rx + 2 * ry) { px = rx; py = -ry + (sp - rx); }
      else if (sp < 3 * rx + 2 * ry) { px = rx - (sp - rx - 2 * ry); py = ry; }
      else if (sp < 3 * rx + 4 * ry) { px = -rx; py = ry - (sp - 3 * rx - 2 * ry); }
      else { px = -rx + (sp - 3 * rx - 4 * ry); py = -ry; }
      out.push({ x: cx + px - g.ringW / 2, y: cy + py - g.ringH / 2, w: g.ringW, h: g.ringH });
    }
    return out;
  }
  function bracket(x1, y1, x2, ys, cls) {
    var xm = x1 + (x2 - x1) / 2, top = Math.min.apply(null, ys.concat(y1)), bot = Math.max.apply(null, ys.concat(y1));
    var d = 'M' + x1 + ' ' + y1 + 'H' + xm + 'M' + xm + ' ' + top + 'V' + bot;
    ys.forEach(function (yy) { d += 'M' + xm + ' ' + yy + 'H' + x2; });
    return { d: d, cls: cls };
  }

  function nodeHtml(tr, nd) {
    var n = nd.n, e = M.ent[n.id] || { kind: 'group' }, kind = e.kind, role = nd.role;
    var name = nodeName(n), sel = S.sel === n.key && role !== 'sib' && role !== 'trunk';
    var vis = visited().indexOf(n.id) >= 0;
    var fallback = (kind === 'point' && !n.ref) || (kind === 'ep');
    var cls = 'kn-node kn-r-' + role + ' kn-k-' + kind + (n.ref ? ' kn-ref' : '') + (fallback ? ' kn-fb' : '') + (sel ? ' is-sel' : '') + (nd.current ? ' is-cur' : '') + (nd.expanded ? ' is-exp' : '') + (n.pending ? ' kn-pending' : '');
    if (kind === 'group' || kind === 'topic' || kind === 'tgroup') cls += ' kn-dashed';
    var meta = role === 'sib' || role === 'trunk' ? '' : metaText(tr, n);
    var aria = KIND_LABEL[kind] || '分组';
    var inner = '';
    if (role === 'more') {
      var shown = S.more.indexOf(n.key) >= 0;
      return { cls: 'kn-node kn-r-more', html: '<button type="button" class="kn-n-main" data-act="more" data-key="' + esc(n.key) + '">' + (shown ? '收起' : '显示更多（+' + nd.extra + '）') + '</button>' };
    }
    if (role === 'trunk') {
      inner = '<button type="button" class="kn-n-main" data-act="focus" data-key="' + esc(n.key) + '" aria-label="' + esc('回到' + aria + '：' + name) + '"><span class="kn-n-name">' + esc(name) + '</span>' + (nd.sibs ? '<span class="kn-n-sib">+' + nd.sibs + ' 同级</span>' : '') + '</button>';
      return { cls: cls, html: inner };
    }
    if (role === 'sib') {
      inner = '<button type="button" class="kn-n-main" ' + (nd.current ? 'aria-current="true" data-act="none"' : 'data-act="focus"') + ' data-key="' + esc(n.key) + '" title="' + esc(name) + '"><span class="kn-n-name">' + esc(name) + '</span></button>';
      return { cls: cls, html: inner };
    }
    var tag = n.ref ? '<span class="kn-tag">引用</span>' : (fallback ? '<span class="kn-tag kn-tag-fb">未整理</span>' : '');
    if (vis) tag += '<span class="kn-tag kn-tag-vis">访问过</span>';
    if (n.pending) tag += '<span class="kn-tag kn-tag-fb">待确认</span>';
    inner = '<button type="button" class="kn-n-main" data-act="sel" data-key="' + esc(n.key) + '" aria-pressed="' + (sel ? 'true' : 'false') + '" aria-label="' + esc(aria + '：' + name + (meta ? '（' + meta + '）' : '')) + '">' +
      '<span class="kn-n-kind">' + esc(role === 'center' || role === 'focus' ? aria : '') + '</span>' +
      '<span class="kn-n-name">' + esc(name) + '</span>' + (meta || tag ? '<span class="kn-n-meta">' + tag + esc(meta) + '</span>' : '') + '</button>';
    if (role === 'child' && n.children.length) {
      var ex = S.exp.indexOf(n.key) >= 0;
      inner += '<button type="button" class="kn-n-exp" data-act="exp" data-key="' + esc(n.key) + '" aria-expanded="' + (ex ? 'true' : 'false') + '" aria-label="' + (ex ? '收起' : '原地展开') + '：' + esc(name) + '" title="' + (ex ? '收起下一层' : '原地展开下一层') + '">' + (ex ? '◂' : '▸') + '<span>' + n.children.length + '</span></button>';
    }
    /* 选中节点在自身框内浮出"展开 ▸""读讲义 ›"，不遮挡相邻节点 */
    if (sel) { var acts = actionsFor(tr, n, role); if (acts) { inner += '<span class="kn-n-acts">' + acts + '</span>'; cls += ' has-acts'; } }
    return { cls: cls, html: inner };
  }

  function renderGraph(tr, focus, opts) {
    var cw = refs.canvas.clientWidth || 800, ch = refs.canvas.clientHeight || 520;
    if (!tr.root.children.length) { refs.nodes.innerHTML = ''; refs.svg.innerHTML = ''; refs.world.style.width = 'auto'; refs.world.style.height = 'auto'; var lr0 = $('.kn-lines-row', refs.world); if (lr0) lr0.remove(); renderEmpty(tr); return; }
    $$('.kn-empty', refs.nodes).forEach(function (x) { x.remove(); });
    var L = layout(tr, focus, cw, ch);
    var keep = {}, nodesBox = refs.nodes;
    /* 选中节点的动作条与关系 */
    var selNd = null;
    L.nodes.forEach(function (nd) { if (nd.n.key === S.sel && (nd.role === 'child' || nd.role === 'grand' || nd.role === 'focus' || nd.role === 'ring' || nd.role === 'center')) selNd = nd; });
    var extraEdges = [], ports = [], labels = [];
    if (selNd && !L.overview) {
      var visById = {};
      L.nodes.forEach(function (nd) { if (nd.role === 'child' || nd.role === 'grand' || nd.role === 'focus') (visById[nd.n.id] = visById[nd.n.id] || nd); });
      var rels = M.relsOf[selNd.n.id] || [], py = selNd.y, hidden = [];
      rels.forEach(function (r) {
        var other = r.from === selNd.n.id ? r.to : r.from, ond = visById[other];
        if (ond && ond !== selNd) {
          var x1 = selNd.x + selNd.w, y1 = selNd.y + selNd.h / 2, x2 = ond.x + ond.w, y2 = ond.y + ond.h / 2;
          var bx = Math.max(x1, x2) + 46;
          extraEdges.push({ d: 'M' + x1 + ' ' + y1 + 'C' + bx + ' ' + y1 + ' ' + bx + ' ' + y2 + ' ' + x2 + ' ' + y2, cls: 'kn-e-rel kn-st-' + r.status });
          labels.push({ x: bx - 4, y: (y1 + y2) / 2, t: r.label });
        } else if (!ond) hidden.push(r);
      });
      hidden.slice(0, 6).forEach(function (r, i) {
        var other = r.from === selNd.n.id ? r.to : r.from;
        ports.push({ key: 'port:' + r.id, r: r, other: other, x: L.portX, y: py + i * (GEO.portH + 6), w: GEO.portW, h: GEO.portH });
      });
      if (hidden.length > 6) ports.push({ key: 'port:more', more: hidden.length - 6, x: L.portX, y: py + 6 * (GEO.portH + 6), w: GEO.portW, h: GEO.portH });
      ports.forEach(function (p) { extraEdges.push({ d: 'M' + (selNd.x + selNd.w) + ' ' + (selNd.y + selNd.h / 2) + 'C' + (p.x - 20) + ' ' + (selNd.y + selNd.h / 2) + ' ' + (p.x - 24) + ' ' + (p.y + p.h / 2) + ' ' + p.x + ' ' + (p.y + p.h / 2), cls: 'kn-e-port' + (p.r ? ' kn-st-' + p.r.status : '') }); });
      if (ports.length) { L.w = Math.max(L.w, L.portX + GEO.portW + GEO.pad); L.h = Math.max(L.h, ports[ports.length - 1].y + GEO.portH + GEO.pad); }
    }
    /* 主线叠加（学科总览） */
    var lineChips = '';
    if (L.overview && S.scope === 'bio') {
      var pos = {};
      L.nodes.forEach(function (nd) { if (nd.role === 'ring') pos[nd.n.id] = { x: nd.x + nd.w / 2, y: nd.y + nd.h / 2 }; });
      M.lines.forEach(function (lid, li) {
        var on1 = S.lines.indexOf(lid) >= 0;
        lineChips += '<button type="button" class="kn-line-chip kn-line-' + (li % 4) + '" data-act="line" data-id="' + lid + '" aria-pressed="' + (on1 ? 'true' : 'false') + '"><i aria-hidden="true"></i>' + esc(M.ent[lid].name) + '</button>';
        if (!on1) return;
        var doms = [];
        M.ent[lid].stations.forEach(function (s) { var d = domainOf(s); if (d && doms.indexOf(d) < 0) doms.push(d); });
        var pts = doms.map(function (d) { return pos[d]; }).filter(Boolean);
        if (pts.length < 2) return;
        var off = (li - 1.5) * 7;
        extraEdges.push({ d: pts.map(function (p, i) { return (i ? 'L' : 'M') + (p.x + off) + ' ' + (p.y + off); }).join(''), cls: 'kn-e-line kn-line-' + (li % 4) });
        labels.push({ x: pts[0].x + off + 8, y: pts[0].y + off - GEO.ringH / 2 - 8, t: '主线：' + M.ent[lid].name, cls: 'kn-line-lab kn-line-' + (li % 4) });
      });
    }
    refs.world.style.width = L.w + 'px'; refs.world.style.height = L.h + 'px';
    var svg = '';
    L.edges.concat(extraEdges).forEach(function (e) { if (e.d) svg += '<path d="' + e.d + '" class="' + e.cls + '"/>'; });
    refs.svg.setAttribute('width', L.w); refs.svg.setAttribute('height', L.h);
    refs.svg.style.width = L.w + 'px'; refs.svg.style.height = L.h + 'px';
    refs.svg.setAttribute('viewBox', '0 0 ' + L.w + ' ' + L.h);
    refs.svg.innerHTML = svg;
    /* 节点：按 key 复用 DOM，位置用 transform，便于过渡；连续点击时直接改目标，不排队 */
    var existing = {};
    $$('.kn-node', nodesBox).forEach(function (el) { existing[el.getAttribute('data-k')] = el; });
    var items = L.nodes.map(function (nd) { var hh = nodeHtml(tr, nd); return { k: nd.role === 'sib' || nd.role === 'more' ? nd.key : nd.n.key, nd: nd, cls: hh.cls, html: hh.html }; });
    ports.forEach(function (p) {
      var html, cls = 'kn-node kn-r-port';
      if (p.more) html = '<button type="button" class="kn-n-main" data-act="card-focus">另有 ' + p.more + ' 条，见信息卡</button>';
      else {
        var o = M.ent[p.other], dir = p.r.from === p.other ? '←' : '→';
        cls += ' kn-st-' + p.r.status;
        html = '<button type="button" class="kn-n-main" data-act="preview" data-id="' + esc(p.other) + '" data-rel="' + esc(p.r.id) + '" title="' + esc(p.r.label + ' · ' + o.name) + '"><span class="kn-n-name">' + dir + ' ' + esc(o.name) + '</span><span class="kn-n-meta">' + esc(relTypeName(p.r.type)) + (bookOf(p.other) && bookOf(p.other) !== S.scope ? ' · ' + esc(bookName(bookOf(p.other))) : '') + '</span></button>';
      }
      items.push({ k: p.key, nd: p, cls: cls, html: html });
    });
    labels.forEach(function (lb, i) { items.push({ k: 'lab:' + i + ':' + lb.t, nd: { x: lb.x, y: lb.y - 10, w: 0, h: 20 }, cls: 'kn-node kn-lab ' + (lb.cls || ''), html: '<span>' + esc(lb.t) + '</span>' }); });
    var activeKey = D.activeElement && D.activeElement.closest && D.activeElement.closest('.kn-node') ? D.activeElement.closest('.kn-node').getAttribute('data-k') : '';
    var activeAct = D.activeElement && D.activeElement.getAttribute ? D.activeElement.getAttribute('data-act') : '';
    items.forEach(function (it) {
      var el = existing[it.k];
      var fresh = !el;
      if (fresh) { el = D.createElement('div'); el.setAttribute('data-k', it.k); if (!REDUCED) el.classList.add('kn-enter'); nodesBox.appendChild(el); }
      else delete existing[it.k];
      if (el.getAttribute('data-sig') !== it.cls + it.html) { el.className = it.cls + (fresh && !REDUCED ? ' kn-enter' : ''); el.innerHTML = it.html; el.setAttribute('data-sig', it.cls + it.html); }
      el.style.transform = 'translate(' + Math.round(it.nd.x) + 'px,' + Math.round(it.nd.y) + 'px)';
      if (it.nd.w) el.style.width = it.nd.w + 'px';
      if (it.nd.h) el.style.height = it.nd.h + 'px';
      keep[it.k] = el;
      if (fresh && !REDUCED) requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.remove('kn-enter'); }); });
    });
    Object.keys(existing).forEach(function (k) { existing[k].remove(); });
    /* 主线开关条 */
    var lr = $('.kn-lines-row', refs.world);
    if (L.overview && S.scope === 'bio' && M.lines.length) {
      if (!lr) { lr = D.createElement('div'); lr.className = 'kn-lines-row'; refs.world.appendChild(lr); }
      lr.style.top = (L.linesY || 0) + 'px';
      lr.innerHTML = '<span class="kn-lines-k">跨册主线（可叠加显示；是跨册联系，不表示连续因果）</span>' + lineChips;
    } else if (lr) lr.remove();
    /* 焦点回到原节点；被移除时落到焦点节点 */
    if (activeKey && !keep[activeKey] && root.contains(D.activeElement) === false) {
      var fk = keep[cur().key]; var b = fk && fk.querySelector('.kn-n-main'); if (b) b.focus({ preventScroll: true });
    } else if (activeKey && keep[activeKey] && activeAct) {
      var again = keep[activeKey].querySelector('[data-act="' + activeAct + '"]'); if (again && D.activeElement !== again) again.focus({ preventScroll: true });
    }
    if (!opts.keepScroll && !opts.noScroll) { refs.canvas.scrollLeft = 0; refs.canvas.scrollTop = 0; }
    if (L.overview && !opts.keepScroll) {
      refs.canvas.scrollLeft = Math.max(0, (L.w - cw) / 2); refs.canvas.scrollTop = Math.max(0, (L.h - ch) / 2);
    }
    var sl = $('.kn-sib-label', refs.world);
    if (L.sibLabel) { if (!sl) { sl = D.createElement('div'); sl.className = 'kn-sib-label'; sl.textContent = '同级'; refs.world.appendChild(sl); } sl.style.transform = 'translate(' + L.sibLabel.x + 'px,' + L.sibLabel.y + 'px)'; }
    else if (sl) sl.remove();
  }
  function domainOf(id) {
    var e = M.ent[id]; if (!e) return '';
    if (e.kind === 'concept') { var h = M.ent[e.home]; if (!h) return ''; var part = h.kind === 'unit' ? h.part : M.partOfEp[h.id]; return M.ent[part] ? M.ent[part].domain : ''; }
    if (e.kind === 'point') return M.ent[M.partOfEp[e.ep]] ? M.ent[M.partOfEp[e.ep]].domain : '';
    return '';
  }
  function relTypeName(t) { return (M.relTypes[t] && M.relTypes[t].name) || t; }
  function actionsFor(tr, n, role) {
    var e = M.ent[n.id]; if (!e) return '';
    var b = '';
    var nm = esc(nodeName(n));
    if (n.children.length && role !== 'focus' && role !== 'center') b += '<button type="button" data-act="focus" data-key="' + esc(n.key) + '" aria-label="展开：' + nm + '">展开 ▸</button>';
    var tg = targetsOf(n.id);
    if (tg.length === 1) b += '<button type="button" data-act="read" data-pid="' + esc(tg[0].pid || '') + '" data-href="' + esc(tg[0].href) + '" aria-label="读讲义：' + nm + '">读讲义 ›</button>';
    else if (tg.length > 1) b += '<button type="button" data-act="card-focus" aria-label="读讲义（' + tg.length + ' 处，在信息卡中选择）：' + nm + '">讲义 ' + tg.length + ' 处 ›</button>';
    return b;
  }
  function targetsOf(id) {
    var e = M.ent[id]; if (!e) return [];
    if (e.kind === 'concept') return e.targets;
    if (e.kind === 'point') return [{ pid: id, href: '#/' + e.ep + '/' + e.a, ep: e.ep, a: e.a, t: e.name }];
    if (e.kind === 'ep') return [{ pid: '', href: '#/' + id, ep: id, a: '', t: e.name, whole: true }];
    return [];
  }
  function renderEmpty(tr) {
    var box = D.createElement('div');
    box.className = 'kn-empty';
    box.innerHTML = emptyHtml(tr.scope, tr.logic);
    refs.nodes.appendChild(box);
    refs.world.style.height = 'auto'; refs.world.style.width = 'auto';
  }
  function emptyHtml(scope, logic) {
    var h = '<h3>' + esc(scopeLabel(scope)) + ' · ' + LOGICS[logic] + '：0 个 · 尚未整理</h3><p>不为凑数编造内容。' + (logic === 'task' ? '下面只列讲义里现成的考法提示（旁白摘录，说明讲义讲到了哪些考法，不是考频），可直接链回考点。' : '推导方法组需要逐组整理；整理前可以先用知识关系视图或讲义中的解题方法。') + '</p>';
    if (logic === 'task' && scope !== 'bio') h += hintsByPart(scope);
    if (logic === 'task') {
      var others = M.tasks.length;
      if (others) h += '<p class="kn-muted">学科范围内共有 ' + others + ' 个已整理（示意）任务。<button type="button" class="kn-link" data-act="scope" data-v="bio">在学科范围查看</button></p>';
    }
    return h;
  }
  function hintsByPart(bk) {
    return M.ent[bk].parts.map(function (p) {
      var list = [];
      M.ent[p].eps.forEach(function (ep) { M.ent[ep].pts.forEach(function (pid) { hintsOfPid(pid).forEach(function (t) { list.push({ pid: pid, t: t }); }); }); });
      if (!list.length) return '';
      return '<details class="kn-hints"><summary>' + esc(M.ent[p].name) + ' · ' + list.length + ' 条考法提示</summary><ul>' + list.map(function (x) {
        var pe = M.ent[x.pid];
        return '<li><button type="button" class="kn-link" data-act="read" data-pid="' + esc(x.pid) + '" data-href="#/' + pe.ep + '/' + pe.a + '">' + esc(M.ent[pe.ep].code + ' ' + pe.name) + '</button>：' + esc(x.t) + '</li>';
      }).join('') + '</ul></details>';
    }).join('');
  }

  /* ---- 列表形态：与图等价，所有操作都能完成 ---- */
  function renderList(tr, focus) {
    var h = '';
    var fe = M.ent[focus.id];
    h += '<div class="kn-l-head"><div><span class="kn-n-kind">' + esc(KIND_LABEL[fe ? fe.kind : 'group'] || '') + '</span><h2>' + esc(nodeName(focus)) + '</h2><div class="kn-n-meta">' + esc(metaText(tr, focus)) + '</div></div>' +
      '<div class="kn-l-acts">' + (focus.parent ? '<button type="button" data-act="focus" data-key="' + esc(focus.parent.key) + '">↑ 上一级</button>' : '') +
      '<button type="button" data-act="sel" data-key="' + esc(focus.key) + '">信息卡</button></div></div>';
    if (focus.parent && focus.parent.children.length > 1) {
      h += '<div class="kn-l-sibs" role="group" aria-label="同级"><span class="kn-k">同级</span>' + focus.parent.children.map(function (s) {
        return s === focus ? '<span class="is-cur" aria-current="true">' + esc(nodeName(s)) + '</span>' : '<button type="button" data-act="focus" data-key="' + esc(s.key) + '">' + esc(nodeName(s)) + '</button>';
      }).join('') + '</div>';
    }
    if (!focus.children.length) h += '<div class="kn-empty">' + (focus === tr.root ? emptyHtml(tr.scope, tr.logic) : '<p>没有下级条目。</p>') + '</div>';
    else h += '<ul class="kn-tree" role="tree" aria-label="' + esc(nodeName(focus)) + ' 的下级">' + listItems(tr, focus, 1) + '</ul>';
    if (focus === tr.root && S.scope === 'bio' && S.logic === 'rel' && M.lines.length) {
      h += '<p class="kn-muted">跨册主线在"跨册主线"分组中，可展开查看各站与关系。</p>';
    }
    refs.list.innerHTML = h;
  }
  function listItems(tr, n, level) {
    var kv = visibleKids(n, level === 1 ? 30 : LIMIT_GRAND, level === 1 ? 28 : SHOW_GRAND), out = '';
    kv.list.forEach(function (c) {
      var e = M.ent[c.id] || { kind: 'group' }, ex = S.exp.indexOf(c.key) >= 0 && c.children.length;
      var sel = S.sel === c.key, tg = targetsOf(c.id), vis = visited().indexOf(c.id) >= 0;
      var fallback = (e.kind === 'point' && !c.ref) || e.kind === 'ep';
      out += '<li role="treeitem" aria-level="' + level + '"' + (c.children.length ? ' aria-expanded="' + (ex ? 'true' : 'false') + '"' : '') + ' aria-selected="' + (sel ? 'true' : 'false') + '" class="kn-li' + (c.ref ? ' kn-ref' : '') + (fallback ? ' kn-fb' : '') + (sel ? ' is-sel' : '') + '">' +
        '<div class="kn-row">' +
        (c.children.length ? '<button type="button" class="kn-l-tog" data-act="exp" data-key="' + esc(c.key) + '" aria-label="' + (ex ? '收起' : '展开') + '：' + esc(nodeName(c)) + '">' + (ex ? '▾' : '▸') + '</button>' : '<span class="kn-l-tog kn-l-leaf" aria-hidden="true"></span>') +
        '<button type="button" class="kn-l-main" data-act="sel" data-key="' + esc(c.key) + '"><span class="kn-n-name">' + esc(nodeName(c)) + '</span><span class="kn-n-meta">' +
          (c.ref ? '<span class="kn-tag">引用</span>' : fallback ? '<span class="kn-tag kn-tag-fb">未整理</span>' : '') + (vis ? '<span class="kn-tag kn-tag-vis">访问过</span>' : '') + esc(metaText(tr, c)) + '</span></button>' +
        '<span class="kn-l-go">' + (c.children.length ? '<button type="button" data-act="focus" data-key="' + esc(c.key) + '" aria-label="以「' + esc(nodeName(c)) + '」为焦点展开">展开 ▸</button>' : '') +
          (tg.length === 1 ? '<button type="button" data-act="read" data-pid="' + esc(tg[0].pid || '') + '" data-href="' + esc(tg[0].href) + '" aria-label="读讲义：' + esc(nodeName(c)) + '">读讲义 ›</button>' : '') + '</span>' +
        '</div>' +
        (ex ? '<ul role="group">' + listItems(tr, c, level + 1) + '</ul>' : '') + '</li>';
    });
    if (kv.extra || S.more.indexOf(n.key) >= 0 && n.children.length > (level === 1 ? 30 : LIMIT_GRAND)) out += '<li class="kn-li kn-li-more"><button type="button" data-act="more" data-key="' + esc(n.key) + '">' + (kv.extra ? '显示更多（+' + kv.extra + '）' : '收起') + '</button></li>';
    return out;
  }

  /* ---- 信息卡：同一实体在任何范围、逻辑、形态下内容相同；只有"本视图中的位置"随视图变化 ---- */
  function renderCard() {
    var tr = T(), n = S.sel ? tr.byKey[S.sel] : null;
    var id = n ? n.id : (S.selId || cur().id);
    var e = M.ent[id];
    var c = refs.card;
    if (!e) { c.innerHTML = ''; return; }
    var h = '<div class="kn-c-top"><span class="kn-n-kind">' + esc(KIND_LABEL[e.kind] || '') + (n && n.ref ? ' · 引用' : '') + '</span>' +
      '<button type="button" class="kn-c-close" data-act="card-close" aria-label="关闭信息卡">×</button></div>' +
      '<h2 class="kn-c-name">' + esc(n ? nodeName(n) : e.name) + '</h2>';
    if (!n && S.selId && !(tr.byId[id] || []).length) h += '<p class="kn-c-warn">不在当前视图（' + esc(scopeLabel(S.scope) + ' · ' + LOGICS[S.logic]) + '）中。</p>';
    var books = e.kind === 'concept' ? e.books : (e.book ? [e.book] : []);
    if (books.length) h += '<div class="kn-c-books">' + books.map(function (b) { return '<span>' + esc(bookName(b)) + '</span>'; }).join('') + '</div>';
    h += cardBody(tr, n, e);
    c.innerHTML = h;
  }
  function sec(title, body, cls) { return body ? '<section class="kn-c-sec' + (cls ? ' ' + cls : '') + '"><h3>' + title + '</h3>' + body + '</section>' : ''; }
  function cardBody(tr, n, e) {
    var h = '';
    /* 主要动作 */
    var acts = '';
    if (n && n.children.length && n !== cur()) acts += '<button type="button" class="btn-primary" data-act="focus" data-key="' + esc(n.key) + '">展开 ▸</button>';
    if (n && n === cur() && n.parent) acts += '<button type="button" class="btn-ghost" data-act="focus" data-key="' + esc(n.parent.key) + '">↑ 上一级</button>';
    if (e.kind === 'part' && S.scope === 'bio') acts += '<button type="button" class="btn-ghost" data-act="goto" data-id="' + esc(e.id) + '" data-scope="' + esc(e.book) + '">以' + esc(bookName(e.book)) + '为范围打开</button>';
    if (e.kind === 'concept' || e.kind === 'point') {
      var bs = e.kind === 'concept' ? e.books : [e.book];
      bs.forEach(function (b) { if (b !== S.scope) acts += '<button type="button" class="btn-ghost" data-act="goto" data-id="' + esc(e.id) + '" data-scope="' + esc(b) + '" data-logic="rel">在' + esc(bookName(b)) + '网络中定位</button>'; });
      if (S.scope !== 'bio') acts += '<button type="button" class="btn-ghost" data-act="goto" data-id="' + esc(e.id) + '" data-scope="bio" data-logic="rel">在学科网络中定位</button>';
    }
    if (acts) h += '<div class="kn-c-acts">' + acts + '</div>';
    /* 摘要与说明 */
    if (e.kind === 'concept' && e.brief) h += sec('摘要', '<blockquote>' + esc(e.brief) + '</blockquote><p class="kn-src">摘自讲义 ' + esc(refLabel(e.briefRef)) + '</p>');
    if (e.kind === 'point') { var ex = excerpt(e.id); h += sec('旁白摘录', ex ? '<blockquote>' + esc(ex) + '</blockquote>' : '<p class="kn-muted">没有可用的旁白文本。</p>'); h += '<p class="kn-c-fb">这个考点尚未整理成概念：按讲义顺序列出，关系未整理。</p>'; }
    if (e.note) h += sec('说明', '<p>' + esc(e.note) + '</p>');
    if (e.status && STATUS_LABEL[e.status] && (e.kind === 'topic' || e.kind === 'task' || e.kind === 'method')) h += '<p class="kn-badge kn-st-' + esc(e.status) + '">' + STATUS_LABEL[e.status] + '</p>';
    /* 讲义位置 */
    var tg = targetsOf(e.id);
    if (tg.length) h += sec('讲义位置' + (tg.length > 1 ? '（' + tg.length + ' 处）' : ''), '<ul class="kn-c-targets">' + tg.map(function (t) {
      var ep = M.ent[t.ep], title = t.pid ? M.ent[t.pid].name : (ep ? ep.full : t.ref);
      return '<li><div><b>' + esc(ep ? bookName(ep.book) + ' ' + ep.code + (t.a ? '/' + t.a : '') : t.ref) + '</b> ' + esc(title) + (t.warn ? '<div class="kn-c-warn">' + esc(t.warn) + (t.suggest ? '；候选：' + esc(M.ent[t.suggest].a + ' ' + M.ent[t.suggest].name) : '') + '</div>' : '') + '</div>' +
        '<button type="button" class="btn-ghost" data-act="read" data-pid="' + esc(t.pid || '') + '" data-href="' + esc(t.href) + '">读讲义 ›</button></li>';
    }).join('') + '</ul>');
    /* 容器统计与覆盖 */
    if (n && CONTAINER[e.kind]) {
      var s = stat(tr, n);
      var fbNote = '';
      if (e.kind === 'part' && !n.children.some(function (c) { return M.ent[c.id] && M.ent[c.id].kind === 'unit'; })) fbNote = '<p class="kn-c-fb">单元未整理：下面按讲义顺序列出各期与考点，样式较素。</p>';
      if (e.kind === 'ep') fbNote = '<p class="kn-c-fb">按讲义顺序 · 未整理关系。</p>';
      h += sec('覆盖', '<p>' + esc(metaText(tr, n)) + '</p><p class="kn-muted">考点数按站点现有讲义计；"已整理"是人工整理的概念数，不等于考点数。</p>' + fbNote);
    }
    /* 本视图中的步骤或方法组备注 */
    if (n && n.parent && M.ent[n.parent.id] && M.ent[n.parent.id].kind === 'step') {
      var st = M.ent[n.parent.id];
      h += sec('在本任务中', '<p>第 ' + st.n + ' 步「' + esc(st.name) + '」用到它。</p>' + stepHow(st));
    }
    if (n && n.note) h += sec('在本方法组中', '<p>' + esc(n.note) + '</p>' + (n.pending ? '<p class="kn-badge kn-st-editor">归组待确认</p>' : ''));
    if (e.kind === 'step') h += sec('怎么写', stepHow(e)) + sec('用到的知识', idList(e.use));
    if (e.kind === 'task') h += sec('步骤', '<ol class="kn-c-steps">' + e.steps.map(function (sid) { return '<li><button type="button" class="kn-link" data-act="goto" data-id="' + esc(sid) + '" data-logic="task">' + esc(M.ent[sid].name) + '</button><div class="kn-muted">' + esc(M.ent[sid].when) + '</div></li>'; }).join('') + '</ol>');
    if (e.kind === 'method') h += sec('共同点', '<p>' + esc(e.common) + '</p>') + sec('不同点', '<p>' + esc(e.differences) + '</p>') + sec('成员', '<ul class="kn-c-list">' + e.members.map(function (x) { return '<li>' + entLink(x.id) + (x.pending ? ' <span class="kn-tag kn-tag-fb">待确认</span>' : '') + '<div class="kn-muted">' + esc(x.note) + '</div></li>'; }).join('') + '</ul>');
    if (e.kind === 'line') h += sec('站点', idList(e.stations)) + sec('关系', '<ul class="kn-c-rels">' + e.edges.map(function (rid) { return relRow(M.relById[rid], null); }).join('') + '</ul>');
    if (e.kind === 'topic') h += sec('分组', '<ul class="kn-c-list">' + e.groups.map(function (g) { return '<li>' + esc(M.ent[g].name) + ' <span class="kn-muted">' + M.ent[g].items.length + ' 项</span></li>'; }).join('') + '</ul>');
    /* 关系（逐条，关系词处处相同） */
    var rels = M.relsOf[e.id] || [];
    if (rels.length) h += sec('关系（' + rels.length + '）', '<ul class="kn-c-rels">' + rels.map(function (r) { return relRow(r, e.id); }).join('') + '</ul>');
    if (n && (e.kind === 'domain' || e.kind === 'part' || e.kind === 'unit') && S.logic === 'rel') h += sec('跨枝联系', portsHtml(tr, n));
    /* 所在位置 */
    h += sec('所在位置', positionsHtml(e.id));
    /* 三种组织逻辑中的情况 */
    h += sec('大题任务', tasksHtml(e)) + sec('推导方法', methodsHtml(e));
    /* 题型证据：只在概念与考点上出现 */
    if (e.kind === 'concept' || e.kind === 'point') h += sec('题型证据', evidenceHtml(e));
    return h;
  }
  function refLabel(ref) {
    var pid = refToPid(ref); if (!pid || !M.ent[pid]) return ref;
    var p = M.ent[pid]; return bookName(p.book) + ' ' + M.ent[p.ep].code + '/' + p.a + '「' + p.name + '」';
  }
  function entLink(id) {
    var e = M.ent[id]; if (!e) return esc(id);
    var b = bookOf(id);
    return '<button type="button" class="kn-link" data-act="goto" data-id="' + esc(id) + '">' + esc(e.name) + '</button>' + (b ? ' <span class="kn-muted">' + esc(bookName(b)) + '</span>' : '');
  }
  function idList(ids) { return '<ul class="kn-c-list">' + ids.map(function (id) { return '<li>' + entLink(id) + '</li>'; }).join('') + '</ul>'; }
  function stepHow(st) {
    var h = '';
    if (st.when) h += '<p><b>适用：</b>' + esc(st.when) + '</p>';
    if (st.not) h += '<p class="kn-c-warn"><b>不适用：</b>' + esc(st.not) + '</p>';
    st.how.forEach(function (b) { h += quoteHtml(b); });
    return h;
  }
  function quoteHtml(b) {
    if (b.kind === 'site') {
      var pid = refToPid(b.ref), p = pid && M.ent[pid];
      return '<blockquote>' + esc(b.quote) + '</blockquote><p class="kn-src">讲义原文 · ' + (p ? '<button type="button" class="kn-link" data-act="read" data-pid="' + esc(pid) + '" data-href="#/' + p.ep + '/' + p.a + '">' + esc(refLabel(b.ref)) + ' ›</button>' : esc(b.ref)) + '</p>';
    }
    if (b.kind === 'editor') return '<p class="kn-src">编辑判断：' + esc(b.note || '') + '</p>';
    if (b.kind === 'title') return '<p class="kn-src">仅依据考点标题：' + esc(b.ref || '') + '</p>';
    if (b.kind === 'figure') return '<p class="kn-src">参考图：' + esc(b.note || b.ref || '') + '</p>';
    return '';
  }
  function relRow(r, selfId) {
    if (!r) return '';
    var other = selfId == null ? null : (r.from === selfId ? r.to : r.from);
    var dir = selfId == null ? '' : (r.from === selfId ? '→' : '←');
    var head = selfId == null ? entLink(r.from) + ' <span aria-hidden="true">→</span> ' + entLink(r.to)
      : '<span class="kn-dir" aria-label="' + (dir === '→' ? '指向' : '来自') + '">' + dir + '</span> <button type="button" class="kn-link" data-act="preview" data-id="' + esc(other) + '" data-rel="' + esc(r.id) + '" aria-expanded="' + (S.preview === r.id ? 'true' : 'false') + '">' + esc(M.ent[other].name) + '</button>' + (bookOf(other) ? ' <span class="kn-muted">' + esc(bookName(bookOf(other))) + '</span>' : '');
    var body = '<div class="kn-r-head">' + head + '</div><div class="kn-r-label"><span class="kn-type">' + esc(relTypeName(r.type)) + '</span>' + esc(r.label) + '</div>' +
      '<span class="kn-badge kn-st-' + esc(r.status) + '">' + esc(STATUS_LABEL[r.status]) + '</span>' +
      (r.condition ? '<p class="kn-c-warn">' + esc(r.condition) + '</p>' : '') +
      '<details class="kn-basis"><summary>依据</summary>' + r.basis.map(quoteHtml).join('') + '</details>';
    if (other && S.preview === r.id) body += previewHtml(other);
    return '<li class="kn-st-' + esc(r.status) + '">' + body + '</li>';
  }
  function previewHtml(id) {
    var e = M.ent[id], tg = targetsOf(id), pos = positions(id)[0];
    return '<div class="kn-preview"><b>' + esc(e.name) + '</b> <span class="kn-muted">' + esc(KIND_LABEL[e.kind]) + (bookOf(id) ? ' · ' + esc(bookName(bookOf(id))) : '') + '</span>' +
      (e.brief ? '<p>' + esc(e.brief) + '</p>' : (e.kind === 'point' ? '<p>' + esc(excerpt(id)) + '</p>' : '')) +
      (pos ? '<p class="kn-muted">位于 ' + esc(pos.label) + '</p>' : '') +
      '<div class="kn-c-acts"><button type="button" class="btn-primary" data-act="goto" data-id="' + esc(id) + '">前往 ›</button>' +
      (tg.length === 1 ? '<button type="button" class="btn-ghost" data-act="read" data-pid="' + esc(tg[0].pid || '') + '" data-href="' + esc(tg[0].href) + '">读讲义 ›</button>' : '') + '</div></div>';
  }
  /* 聚焦到领域或部分时，跨出该枝的关系聚合成端口 */
  function portsHtml(tr, n) {
    var inside = {};
    (function walk(x) { x.children.forEach(function (c) { if (!c.ref) inside[c.id] = 1; walk(c); }); })(n);
    inside[n.id] = 1;
    var groups = {};
    M.rels.forEach(function (r) {
      var a = inside[r.from], b = inside[r.to];
      if (a === b) return;
      var other = a ? r.to : r.from;
      var top = topContainer(tr, other);
      var k = top ? top.id : 'other';
      (groups[k] = groups[k] || { label: top ? (nodeName(top) + (S.scope !== 'bio' && bookOf(other) !== S.scope ? '' : '')) : '其他范围', rels: [], scopeOut: !top, other: other }).rels.push(r);
    });
    var keys = Object.keys(groups);
    if (!keys.length) return '';
    return '<ul class="kn-c-ports">' + keys.map(function (k) {
      var g = groups[k];
      var label = g.scopeOut ? '本范围之外（' + g.rels.map(function (r) { var o = inside[r.from] ? r.to : r.from; return bookName(bookOf(o)) || M.ent[o].name; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join('、') + '）' : g.label;
      return '<li><details><summary>↔ ' + esc(label) + ' · ' + g.rels.length + ' 条关系</summary><ul class="kn-c-rels">' + g.rels.map(function (r) { return relRow(r, null); }).join('') + '</ul></details></li>';
    }).join('') + '</ul>';
  }
  function topContainer(tr, id) {
    var inst = primary(tr, id); if (!inst) return null;
    var p = pathOf(inst); return p[1] || null;
  }
  /* 所在位置：学科知识骨架中的主位置、引用位置，以及专题、主线、任务、方法组中的位置 */
  function positions(id) {
    var out = [];
    [['bio', 'rel'], ['bio', 'task'], ['bio', 'method']].forEach(function (sl) {
      var tr = tree(sl[0], sl[1]);
      (tr.byId[id] || []).forEach(function (n) {
        var p = pathOf(n).slice(0, -1);
        if (!p.length) return;
        out.push({ label: p.map(nodeName).join(' › '), primary: !n.ref && sl[1] === 'rel', logic: sl[1], key: n.key, via: n.parent ? n.parent.id : '' });
      });
    });
    out.sort(function (a, b) { return (b.primary ? 1 : 0) - (a.primary ? 1 : 0); });
    return out;
  }
  function positionsHtml(id) {
    var ps = positions(id);
    if (!ps.length) return '<p class="kn-muted">' + (M.ent[id].kind === 'bio' ? '学科网络的中心。' : '范围根节点。') + '</p>';
    return '<ul class="kn-c-pos">' + ps.map(function (p) {
      return '<li><button type="button" class="kn-link" data-act="pos" data-id="' + esc(id) + '" data-logic="' + p.logic + '" data-via="' + esc(p.via) + '">' + esc(p.label) + '</button>' +
        (p.primary ? ' <span class="kn-tag">主位置</span>' : p.logic === 'rel' ? ' <span class="kn-tag">引用</span>' : ' <span class="kn-tag">' + LOGICS[p.logic] + '</span>') + '</li>';
    }).join('') + '</ul>';
  }
  function tasksHtml(e) {
    if (e.kind === 'task' || e.kind === 'step' || e.kind === 'method' || e.kind === 'line' || e.kind === 'group' || e.kind === 'tgroup') return '';
    var steps = tasksFor(e.id);
    if (steps.length && CONTAINER[e.kind]) {
      var ts = []; steps.forEach(function (sid) { var t = M.ent[sid].task; if (ts.indexOf(t) < 0) ts.push(t); });
      return '<ul class="kn-c-list">' + ts.map(function (t) { return '<li><button type="button" class="kn-link" data-act="goto" data-id="' + esc(t) + '" data-logic="task" data-scope="' + esc(S.scope) + '">' + esc(M.ent[t].name) + '</button> <span class="kn-badge kn-st-sketch">示意</span> <span class="kn-muted">' + M.ent[t].steps.length + ' 步</span></li>'; }).join('') + '</ul>';
    }
    if (steps.length) return '<ul class="kn-c-list">' + steps.map(function (sid) { var s = M.ent[sid]; return '<li><button type="button" class="kn-link" data-act="goto" data-id="' + esc(sid) + '" data-logic="task" data-scope="bio">' + esc(M.ent[s.task].name + ' · 第 ' + s.n + ' 步 ' + s.name) + '</button> <span class="kn-badge kn-st-sketch">示意</span></li>'; }).join('') + '</ul>';
    var h = '<p class="kn-muted">任务 0 · 尚未整理。</p>';
    var pids = pidsOf(e.id), hints = [];
    if (pids.length <= 40) pids.forEach(function (pid) { hintsOfPid(pid).forEach(function (t) { hints.push({ pid: pid, t: t }); }); });
    if (hints.length) {
      h += '<p class="kn-muted">讲义里现成的考法提示（旁白摘录，不是考频）：</p><ul class="kn-c-hints">' + hints.slice(0, 8).map(function (x) {
        var p = M.ent[x.pid];
        return '<li>' + esc(x.t) + ' <button type="button" class="kn-link" data-act="read" data-pid="' + esc(x.pid) + '" data-href="#/' + p.ep + '/' + p.a + '">' + esc(M.ent[p.ep].code + '/' + p.a) + ' ›</button></li>';
      }).join('') + '</ul>' + (hints.length > 8 ? '<p class="kn-muted">另有 ' + (hints.length - 8) + ' 条，见各考点讲义。</p>' : '');
    }
    var up = upperWithTasks(e.id);
    if (up) h += '<p class="kn-muted">上一级范围「' + esc(up.name) + '」内有 ' + up.n + ' 个任务。</p>';
    return h;
  }
  function upperWithTasks(id) {
    var tr = tree('bio', 'rel'), inst = primary(tr, id); if (!inst) return null;
    var p = inst.parent;
    while (p) {
      var steps = tasksFor(p.id), tasks = {};
      steps.forEach(function (s) { tasks[M.ent[s].task] = 1; });
      var n = Object.keys(tasks).length;
      if (n) return { name: nodeName(p), n: n };
      p = p.parent;
    }
    return null;
  }
  function methodsHtml(e) {
    if (e.kind === 'task' || e.kind === 'step' || e.kind === 'method' || e.kind === 'line' || e.kind === 'group' || e.kind === 'tgroup') return '';
    var ms = methodsFor(e.id);
    if (!ms.length) return '<p class="kn-muted">尚未整理。</p>';
    return '<ul class="kn-c-list">' + ms.map(function (mid) { return '<li><button type="button" class="kn-link" data-act="goto" data-id="' + esc(mid) + '" data-logic="method" data-scope="bio">' + esc(M.ent[mid].name) + '</button> <span class="kn-badge kn-st-editor">编辑判断</span></li>'; }).join('') + '</ul>';
  }
  function evidenceHtml(e) {
    var recs = M.evidence.filter(function (r) { return arr(r.concepts).indexOf(e.id) >= 0; });
    var h = '';
    if (recs.length) {
      h += '<p>逐题记录 ' + recs.length + ' 条（只列题数，不给比例）：</p><ul class="kn-c-list">' + recs.map(function (r) {
        var p = r.paper || {}; return '<li>' + esc([p.year, p.region, r.q, r.sub, r.form].filter(Boolean).join(' · ')) + '</li>';
      }).join('') + '</ul>';
    } else h += '<p class="kn-muted">逐题记录：暂无（没有真题数据，不显示比例或"高频"）。</p>';
    var hints = [];
    pidsOf(e.id).forEach(function (pid) { hintsOfPid(pid).forEach(function (t) { hints.push(t); }); });
    if (hints.length) h += '<p class="kn-muted">讲义线索：讲义旁白中有考法提示（说明讲义讲到了怎么考，不代表考频）。</p>';
    return h;
  }

  /* ---------- 抽屉（手机）与提示 ---------- */
  function openDrawer(open) {
    root.classList.toggle('kn-drawer-open', !!open);
    if (!open) return;
    refs.card.scrollTop = 0;
    /* 选中行滚到抽屉上方，不被遮住 */
    var row = $('.kn-li.is-sel > .kn-row', refs.list);
    if (row && !refs.list.hidden) {
      var r = row.getBoundingClientRect(), top = refs.card.getBoundingClientRect().top, lr = refs.list.getBoundingClientRect();
      if (r.bottom > top - 8) refs.list.scrollTop += r.bottom - top + 16;
      else if (r.top < lr.top) refs.list.scrollTop -= lr.top - r.top + 8;
    }
  }
  var flashT = 0;
  function flash(msg) { S.notice = msg; refs.notice.hidden = false; refs.notice.innerHTML = '<span>' + esc(msg) + '</span><button type="button" data-act="notice-close" aria-label="关闭提示">×</button>'; clearTimeout(flashT); }
  function scrollPos() { return { sx: refs.canvas.scrollLeft, sy: refs.canvas.scrollTop, ly: refs.list.scrollTop }; }
  function restoreScroll(sx, sy) {
    var apply = function () { if (sx || sy) { refs.canvas.scrollLeft = sx; refs.canvas.scrollTop = sy; } var v = getView(S.url); if (v && v.ly) refs.list.scrollTop = v.ly; };
    apply(); requestAnimationFrame(apply);
  }

  /* ---------- 网络内搜索 ---------- */
  var IDX = null;
  function buildIndex() {
    IDX = [];
    Object.keys(M.ent).forEach(function (id) {
      var e = M.ent[id];
      if (e.kind === 'group' || e.kind === 'bio') return;
      var keys = [e.name].concat(arr(e.alias));
      if (e.kind === 'ep') keys.push(e.code, e.full);
      if (e.kind === 'point') keys.push(M.ent[e.ep].code + ' ' + e.name);
      IDX.push({ id: id, k: keys.join(' ').toLowerCase(), name: e.name, kind: e.kind });
    });
  }
  var KIND_RANK = { concept: 0, unit: 1, part: 2, domain: 3, topic: 4, line: 5, task: 6, method: 7, point: 8, ep: 9, step: 10, tgroup: 11, book: 12 };
  var findSel = -1, findCur = [];
  function runFind() {
    if (!IDX) buildIndex();
    var v = refs.q.value.trim().toLowerCase();
    if (!v) { refs.res.hidden = true; refs.res.innerHTML = ''; findCur = []; return; }
    var terms = v.split(/\s+/).filter(Boolean);
    var res = IDX.filter(function (x) { return terms.every(function (t) { return x.k.indexOf(t) >= 0; }); });
    res.sort(function (a, b) {
      var ia = inBook(a.id, S.scope) || S.scope === 'bio' ? 0 : 1, ib = inBook(b.id, S.scope) || S.scope === 'bio' ? 0 : 1;
      return ia - ib || (a.name.toLowerCase().indexOf(terms[0]) === 0 ? 0 : 1) - (b.name.toLowerCase().indexOf(terms[0]) === 0 ? 0 : 1) || (KIND_RANK[a.kind] - KIND_RANK[b.kind]);
    });
    findCur = res.slice(0, 30); findSel = findCur.length ? 0 : -1;
    if (!findCur.length) { refs.res.innerHTML = '<div class="kn-find-empty">没有找到"' + esc(refs.q.value) + '"</div>'; refs.res.hidden = false; return; }
    refs.res.innerHTML = findCur.map(function (x, i) {
      var e = M.ent[x.id], to = placeId(x.id), mapped = to !== x.id;
      var pos = positions(to)[0];
      var curated = e.kind === 'point' ? (mapped ? '已整理为概念「' + M.ent[to].name + '」' : '未整理') : (e.kind === 'ep' ? (mapped ? '整理为单元「' + M.ent[to].name + '」' : '按讲义顺序') : '');
      if (pos && mapped) pos = { label: pos.label + ' › ' + M.ent[to].name };
      if (e.kind === 'point') pos = { label: (pos ? pos.label + ' · ' : '') + '讲义 ' + M.ent[e.ep].code + '/' + e.a };
      var out = !(inBook(x.id, S.scope) || S.scope === 'bio' || !bookOf(x.id));
      return '<div class="kn-find-item' + (i === findSel ? ' sel' : '') + '" role="option" id="kn-opt-' + i + '" aria-selected="' + (i === findSel ? 'true' : 'false') + '" data-i="' + i + '">' +
        '<div><span class="kn-find-k">' + esc(KIND_LABEL[e.kind]) + '</span><b>' + esc(e.name) + '</b>' + (bookOf(x.id) ? ' <span class="kn-muted">' + esc(bookName(bookOf(x.id))) + '</span>' : '') + (curated ? ' <span class="kn-tag' + (curated === '未整理' ? ' kn-tag-fb' : '') + '">' + esc(curated) + '</span>' : '') + '</div>' +
        (pos ? '<div class="kn-muted">' + esc(pos.label) + (out ? ' · 不在当前范围，将扩大到学科' : '') + '</div>' : '') + '</div>';
    }).join('');
    refs.res.hidden = false;
    refs.q.setAttribute('aria-activedescendant', findSel >= 0 ? 'kn-opt-' + findSel : '');
  }
  function chooseFind(i) {
    var x = findCur[i]; if (!x) return;
    refs.res.hidden = true; refs.q.value = ''; refs.q.blur();
    var logic = S.logic, e = M.ent[x.id];
    if (e.kind === 'task' || e.kind === 'step') logic = 'task';
    else if (e.kind === 'method') logic = 'method';
    else { var to = placeId(x.id); if (!pickInstance(tree(S.scope, logic), to, '') && !pickInstance(tree('bio', logic), to, '')) logic = 'rel'; }
    goEntity(x.id, { logic: logic, selectSelf: CONTAINER[e.kind] ? false : true });
  }
  function markFind() { $$('.kn-find-item', refs.res).forEach(function (el, i) { el.classList.toggle('sel', i === findSel); el.setAttribute('aria-selected', i === findSel ? 'true' : 'false'); if (i === findSel) el.scrollIntoView({ block: 'nearest' }); }); refs.q.setAttribute('aria-activedescendant', findSel >= 0 ? 'kn-opt-' + findSel : ''); }

  /* ---------- 覆盖与说明 ---------- */
  function renderReport() {
    var r = report();
    var rows = r.books.map(function (b) {
      return '<tr><td>' + esc(b.name) + '</td><td class="num">' + b.parts + '</td><td class="num">' + (b.units || '—') + '</td><td class="num">' + b.eps + '</td><td class="num">' + b.points + '</td><td class="num">' + b.reachable + ' / ' + b.points + '</td><td class="num">' + b.concepts + '</td></tr>';
    }).join('');
    var types = Object.keys(M.relTypes).map(function (k) { return '<li><b>' + esc(M.relTypes[k].name) + '</b>：' + esc(M.relTypes[k].note || '') + '</li>'; }).join('');
    refs.report.innerHTML = '<div class="kn-rep-in"><div class="kn-c-top"><h2>覆盖与说明</h2><button type="button" class="kn-c-close" data-act="report-close" aria-label="关闭">×</button></div>' +
      '<section class="kn-c-sec"><h3>两种覆盖，分开统计</h3>' +
      '<p><b>索引覆盖</b>：能从所在册网络到达的现有考点 <b>' + r.reachable + ' / ' + r.points + '</b>。未整理的部分按"期 → 考点"自动列出，所以不会比目录少。</p>' +
      '<p><b>关系已整理</b>：人工整理的概念 <b>' + r.concepts + '</b> 个；关系 <b>' + r.relations.total + '</b> 条，其中原文可查 ' + (r.relations.site || 0) + ' 条、编辑判断待确认 ' + (r.relations.editor || 0) + ' 条' + (r.relations.title ? '、仅据标题 ' + r.relations.title + ' 条' : '') + '。没有定义"全部关系"的总量，所以不给完成百分比。</p>' +
      '<p class="kn-muted">考点数不等于概念数：一个概念可以挂多个讲义位置（如"生物多样性的三个层次"），一个考点也可以拆成多个概念（如"防治与渔业"）。"原文可查"只说明讲义原文这样写，不代表另经专家审定。</p></section>' +
      '<section class="kn-c-sec"><h3>各册</h3><div class="table-wrap"><table><thead><tr><th>册</th><th class="num">部分</th><th class="num">单元</th><th class="num">期</th><th class="num">考点</th><th class="num">索引覆盖</th><th class="num">已整理概念</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +
      '<section class="kn-c-sec"><h3>题型证据</h3><p>分四级：无、讲义线索、个人经验、逐题记录。当前逐题记录 ' + r.evidence + ' 条，因此全站不显示比例或"高频"。讲义线索取自旁白中的考法提示，只说明讲义讲到了怎么考。</p></section>' +
      '<section class="kn-c-sec"><h3>关系类型</h3><ul class="kn-c-list">' + types + '</ul></section></div>';
  }

  /* ---------- 讲义顶栏的"网络"按钮与小浮层 ---------- */
  var topBtn = null, backBtn = null, pop = null, viewInfo = {};
  function buildTop() {
    var title = $('#topTitle'); if (!title) return;
    backBtn = D.createElement('button'); backBtn.type = 'button'; backBtn.className = 'kn-top-back'; backBtn.hidden = true;
    topBtn = D.createElement('button'); topBtn.type = 'button'; topBtn.className = 'kn-top-btn'; topBtn.hidden = true;
    topBtn.setAttribute('aria-haspopup', 'dialog'); topBtn.setAttribute('aria-expanded', 'false');
    topBtn.innerHTML = '网络<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5z"/></svg>';
    title.parentNode.insertBefore(backBtn, title.nextSibling);
    title.parentNode.insertBefore(topBtn, backBtn.nextSibling);
    pop = D.createElement('div'); pop.className = 'kn-pop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', '本考点在知识网络中的位置');
    D.body.appendChild(pop);
    on(topBtn, 'click', function (ev) { ev.stopPropagation(); if (pop.hidden) openPop(); else closePop(); });
    on(backBtn, 'click', backToMap);
    on(pop, 'click', function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'pop-back') { closePop(); backToMap(); }
      else if (act === 'pop-locate') { closePop(); locate(b.getAttribute('data-scope')); }
      else if (act === 'pop-last') { closePop(); location.hash = b.getAttribute('data-url'); }
    });
    on(D, 'click', function (ev) { if (pop && !pop.hidden && !pop.contains(ev.target) && ev.target !== topBtn) closePop(); });
    on(D, 'keydown', function (ev) { if (ev.key === 'Escape' && pop && !pop.hidden) { closePop(); topBtn.focus(); } });
  }
  function closePop() { if (pop && !pop.hidden) { pop.hidden = true; topBtn.setAttribute('aria-expanded', 'false'); } }
  function curLecture() { var c = api && api.current ? api.current() : {}; return { ep: c.ep || '', a: c.a || '' }; }
  function lectureEntity(ep, a) {
    var pid = /^p\d+$/.test(a) ? ep + '.' + a : '';
    if (pid && M.ent[pid]) return placeId(pid);
    return M.ent[ep] ? placeId(ep) : '';
  }
  function openPop() {
    var L = curLecture(); if (!L.ep || !M.ent[L.ep]) return;
    var id = lectureEntity(L.ep, L.a), e = M.ent[id], ctx = returnCtx(), last = sGet('localStorage', 'tt-kn-last');
    var pid = /^p\d+$/.test(L.a) ? L.ep + '.' + L.a : '';
    var bk = M.ent[L.ep].book;
    var h = '<div class="kn-pop-in">';
    h += '<p class="kn-pop-cur"><span class="kn-muted">当前' + (pid ? '考点' : '期') + '：</span><b>' + esc(pid ? M.ent[pid].name : M.ent[L.ep].full) + '</b> <span class="kn-muted">（' + esc(bookName(bk) + ' ' + M.ent[L.ep].code + (pid ? ' 考点' + M.ent[pid].n : '')) + '）</span></p>';
    var pos = positions(id).filter(function (p) { return p.logic === 'rel'; });
    if (pos[0]) h += '<p><span class="kn-muted">所在位置</span> ' + esc(pos[0].label) + ' › ' + esc(e.name) + '</p>';
    if (!pid && e.kind === 'unit') h += '<p class="kn-muted">本期在' + esc(bookName(bk)) + '网络中整理为单元「' + esc(e.name) + '」' + (e.eps.length > 1 ? '（含 ' + esc(e.eps.map(function (x) { return M.ent[x].code; }).join('、')) + '）' : '') + '。</p>';
    var also = [];
    M.lines.forEach(function (l) { if (M.ent[l].stations.indexOf(id) >= 0) also.push('主线：' + M.ent[l].name); });
    M.topics.forEach(function (t) { if ((tree('bio', 'rel').byId[id] || []).some(function (n) { return pathOf(n).some(function (x) { return x.id === t; }); })) also.push('专题：' + M.ent[t].name); });
    if (also.length) h += '<p><span class="kn-muted">也见于</span> ' + esc(also.join('；')) + '</p>';
    if (pid && !M.ptConcepts[pid]) h += '<p class="kn-muted">该考点尚未整理成概念，网络中按讲义顺序列出。</p>';
    h += '<div class="kn-c-acts"><button type="button" class="btn-ghost" data-act="pop-locate" data-scope="' + bk + '">在本册网络中打开</button><button type="button" class="btn-ghost" data-act="pop-locate" data-scope="bio">在学科网络中打开</button></div>';
    if (ctx) h += '<button type="button" class="btn-primary kn-pop-back" data-act="pop-back">↩ 回到网络：' + esc(ctx.label) + '</button>';
    else if (last && last.url) h += '<p class="kn-muted">上次网络位置（仅作提示）：<button type="button" class="kn-link" data-act="pop-last" data-url="' + esc(last.url) + '">' + esc(last.label || last.url) + '</button></p>';
    h += '</div>';
    pop.innerHTML = h;
    pop.hidden = false; topBtn.setAttribute('aria-expanded', 'true');
    var r = topBtn.getBoundingClientRect();
    pop.style.top = (r.bottom + 6) + 'px';
    pop.style.left = Math.max(8, Math.min(r.left, WIN.innerWidth - pop.offsetWidth - 8)) + 'px';
    var f = pop.querySelector('button'); if (f) f.focus();
  }
  /* "在网络中定位"：按"讲义锚点 → 概念"反查 */
  function locate(scope) {
    var L = curLecture(); if (!L.ep) return;
    var id = lectureEntity(L.ep, L.a); if (!id) return;
    if (M.ent[id].kind === 'unit') addNote(placeNote(L.ep, id));
    pushTrail({ url: location.hash, label: '讲义 ' + (M.ent[L.ep] ? M.ent[L.ep].code : L.ep) });
    /* 考点：定位到它（或代替它的概念）并选中；期首页：聚焦它所在的单元或期本身 */
    goEntity(id, { scope: scope, logic: 'rel', trail: false, fromLecture: true, selectSelf: !CONTAINER[M.ent[id].kind] });
  }
  /* "回到网络"是语义动作：本页确由网络打开且历史配对时后退，否则直接前往保存的网络位置 */
  function backToMap() {
    var ctx = returnCtx(); if (!ctx) return;
    if (history.state && history.state.kn === ctx.token) history.back();
    else location.hash = ctx.url;
  }
  var lastView = null;   // 上一次路由的页面类型：null 表示本页刚加载（含刷新）
  function onView(info) {
    viewInfo = info || {};
    var lecture = viewInfo.view === 'frame' && !!viewInfo.ep;
    var prev = lastView;
    lastView = lecture ? 'lecture' : (viewInfo.view || '');
    if (readCtx()) {
      if (!lecture) setCtxActive(false);                         // 回到网络，或去总索引、目录、使用说明
      else if (stateToken() === readCtx().token) setCtxActive(true); // 正是那条由网络打开的历史项
      else if (prev !== null && prev !== 'lecture') setCtxActive(false); // 从非讲义页面独立打开讲义
      /* prev === 'lecture'：在讲义之间连续翻期，保持；prev === null：本标签页刷新，保持原状态 */
    }
    if (!topBtn) return;
    topBtn.hidden = !lecture;
    var ctx = lecture ? returnCtx() : null;
    backBtn.hidden = !ctx;
    if (ctx) { backBtn.textContent = '↩ 回到网络'; backBtn.title = '回到网络：' + ctx.label; }
    if (!lecture) closePop();
  }

  /* ---------- 入口：侧栏、总索引与本册目录（运行时插入，不改生成的 HTML） ---------- */
  function buildEntries() {
    var rp = report();
    $$('.nav-group[data-book]').forEach(function (g) {
      var bk = g.getAttribute('data-book'), ul = $('.nav-top', g); if (!ul || $('[data-special="map"]', ul)) return;
      var li = D.createElement('li');
      li.innerHTML = '<a href="#/map/' + (bk || 'bio') + '" class="nav-link kn-nav-link" data-special="map">' + (bk ? '本册知识网络' : '学科知识网络') + '</a>';
      var anchor = $('[data-special="' + (bk ? 'book' : 'home') + '"]', ul);
      ul.insertBefore(li, anchor && anchor.parentNode ? anchor.parentNode.nextSibling : null);
    });
    var home = $('.home-inner[data-home=""]');
    if (home && !$('.kn-entry', home)) {
      var hero = $('.home-hero', home);
      var doms = arr(RAW.domains).filter(function (d) { return M.ent[d.id]; });
      var box = D.createElement('section'); box.className = 'kn-entry';
      box.innerHTML = '<div class="kn-entry-h"><h2>学科知识网络</h2><a class="btn-primary" href="#/map/bio">打开学科知识网络 ›</a></div>' +
        '<div class="kn-entry-row">' + doms.map(function (d) { return '<a href="#/map/bio/rel/' + d.id + '">' + esc(d.name) + '</a>'; }).join('') + '</div>' +
        (M.lines.length ? '<div class="kn-entry-row kn-entry-lines"><span class="kn-k">主线</span>' + M.lines.map(function (l) { return '<a href="#/map/bio/rel/' + l + '">' + esc(M.ent[l].name) + '</a>'; }).join('') + '</div>' : '');
      if (hero) hero.parentNode.insertBefore(box, hero.nextSibling);
    }
    rp.books.forEach(function (b) {
      var hm = $('.home-inner[data-home="' + b.book + '"]'); if (!hm || $('.kn-entry', hm)) return;
      var acts = $('.hero-actions', hm);
      if (acts) { var a = D.createElement('a'); a.className = 'btn-ghost'; a.href = '#/map/' + b.book; a.textContent = '本册知识网络'; acts.insertBefore(a, acts.children[1] || null); }
      var tops = M.topics.filter(function (t) { return M.ent[t].book === b.book; }).length;
      var box2 = D.createElement('section'); box2.className = 'kn-entry';
      box2.innerHTML = '<div class="kn-entry-h"><h2>本册知识网络</h2><a class="btn-primary" href="#/map/' + b.book + '">打开 ›</a></div>' +
        '<p class="kn-muted">' + b.parts + ' 个部分' + (b.units ? ' · ' + b.units + ' 个单元' : ' · 单元未整理（按期列出）') + (tops ? ' · ' + tops + ' 个跨章专题' : '') + ' · 索引覆盖 ' + b.reachable + '/' + b.points + ' 个考点 · 已整理 ' + b.concepts + ' 个概念</p>' +
        '<div class="kn-entry-row">' + M.ent[b.book].parts.map(function (p) { return '<a href="#/map/' + b.book + '/rel/' + p + '">' + esc(M.ent[p].name) + '</a>'; }).join('') + '</div>';
      var hero2 = $('.home-hero', hm);
      if (hero2) hero2.parentNode.insertBefore(box2, hero2.nextSibling);
    });
  }

  /* ---------- 事件 ---------- */
  function bind() {
    on(root, 'click', function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b || !root.contains(b)) return;
      var act = b.getAttribute('data-act'), key = b.getAttribute('data-key'), id = b.getAttribute('data-id');
      var tr = T();
      switch (act) {
        case 'sel': select(key); break;
        case 'exp': toggleExp(key); break;
        case 'more': toggleMore(key); break;
        case 'focus': if (tr.byKey[key]) { S.preview = ''; focusNode(tr.byKey[key]); } break;
        case 'read': openLecture(b.getAttribute('data-pid'), b.getAttribute('data-href')); break;
        case 'goto': goEntity(id, { scope: b.getAttribute('data-scope') || undefined, logic: b.getAttribute('data-logic') || undefined, selectSelf: !!(M.ent[id] && !CONTAINER[M.ent[id].kind] && M.ent[id].kind !== 'part') }); break;
        case 'pos': goEntity(id, { scope: 'bio', logic: b.getAttribute('data-logic'), via: b.getAttribute('data-via'), selectSelf: true }); break;
        case 'preview':
          var rid = b.getAttribute('data-rel');
          if ((T().byId[id] || []).length && b.closest('.kn-nodes')) { var pi = pickInstance(T(), id, ''); var vis = pi && $('[data-k="' + cssEsc(pi.key) + '"]', refs.nodes); if (vis) { select(pi.key); break; } }
          S.preview = S.preview === rid ? '' : rid; renderCard();
          if (narrow()) openDrawer(true);
          var pv = $('.kn-preview', refs.card); if (pv) pv.scrollIntoView({ block: 'nearest' });
          break;
        case 'scope-menu': toggleMenu(); break;
        case 'scope': toggleMenu(false); setScope(b.getAttribute('data-v')); break;
        case 'logic': setLogic(b.getAttribute('data-v')); break;
        case 'form': sSet('localStorage', 'tt-kn-form', b.getAttribute('data-v')); render(); break;
        case 'line': var li = S.lines.indexOf(id); if (li >= 0) S.lines.splice(li, 1); else S.lines.push(id); selectId(id); break;
        case 'trail': var t = trail(), last = t.pop(); sSet('sessionStorage', 'tt-kn-trail', t); if (last) go(last.url); break;
        case 'report': renderReport(); refs.report.hidden = false; var cl = $('.kn-c-close', refs.report); if (cl) cl.focus(); break;
        case 'report-close': refs.report.hidden = true; $('.kn-info-btn', root).focus(); break;
        case 'notice-close': S.notice = ''; refs.notice.hidden = true; break;
        case 'hint-close': sSet('localStorage', 'tt-kn-hint', 1); refs.hint.hidden = true; break;
        case 'card-close': openDrawer(false); if (!narrow()) { S.sel = ''; S.selId = ''; saveView(); syncUrl(); render({ keepScroll: true }); } break;
        case 'card-focus': if (narrow()) openDrawer(true); refs.card.focus(); var tl = $('.kn-c-targets', refs.card); if (tl) tl.scrollIntoView({ block: 'nearest' }); break;
      }
    });
    on(D, 'click', function (ev) { if (refs.menu && !refs.menu.hidden && !ev.target.closest('.kn-scope')) toggleMenu(false); if (refs.res && !refs.res.hidden && !ev.target.closest('.kn-find')) refs.res.hidden = true; });
    on(refs.q, 'input', runFind);
    on(refs.q, 'focus', function () { if (refs.q.value.trim()) runFind(); });
    on(refs.q, 'keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); if (findCur.length) { findSel = (findSel + 1) % findCur.length; markFind(); } }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (findCur.length) { findSel = (findSel - 1 + findCur.length) % findCur.length; markFind(); } }
      else if (ev.key === 'Enter') { ev.preventDefault(); chooseFind(findSel < 0 ? 0 : findSel); }
      else if (ev.key === 'Escape') { refs.res.hidden = true; refs.q.blur(); }
    });
    on(refs.res, 'click', function (ev) { var it = ev.target.closest('.kn-find-item'); if (it) chooseFind(+it.getAttribute('data-i')); });
    var scT = 0;
    on(refs.canvas, 'scroll', function () { if (scT) return; scT = setTimeout(function () { scT = 0; if (S.shown) saveView(scrollPos()); }, 200); }, { passive: true });
    on(refs.list, 'scroll', function () { if (scT) return; scT = setTimeout(function () { scT = 0; if (S.shown) saveView(scrollPos()); }, 200); }, { passive: true });
    /* 键盘：方向键只在焦点位于网络内时归网络（先于外壳处理并 preventDefault）；空格始终归播放器 */
    on(root, 'keydown', function (ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var t = ev.target;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      if (ev.key === 'Escape') {
        if (!refs.report.hidden) { refs.report.hidden = true; ev.preventDefault(); return; }
        if (refs.menu && !refs.menu.hidden) { toggleMenu(false); refs.scopeBtn.focus(); ev.preventDefault(); return; }
        if (root.classList.contains('kn-drawer-open')) { openDrawer(false); ev.preventDefault(); return; }
        if (S.preview) { S.preview = ''; renderCard(); ev.preventDefault(); return; }
        return;
      }
      if (refs.menu && !refs.menu.hidden && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
        var items = $$('[data-act="scope"]', refs.menu), i = items.indexOf(D.activeElement);
        i = ev.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[i].focus(); ev.preventDefault(); return;
      }
      var tab = t.closest && t.closest('.kn-logic');
      if (tab && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
        var tabs = $$('[data-act="logic"]', root), ti = tabs.indexOf(t);
        if (ti >= 0) { tabs[(ti + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].focus(); ev.preventDefault(); }
        return;
      }
      if (/^[123]$/.test(ev.key) && !ev.shiftKey && root.contains(t)) { setLogic(['rel', 'task', 'method'][+ev.key - 1]); ev.preventDefault(); return; }
      var nodeEl = t.closest && t.closest('.kn-node, .kn-li');
      if (!nodeEl) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(ev.key) < 0) return;
      ev.preventDefault();
      moveFocus(t, ev.key);
    });
    on(D, 'keydown', function (ev) {
      if (!S.shown || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var t = ev.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (ev.key === '/' && !typing) { ev.preventDefault(); refs.q.focus(); }
    });
    var rzT = 0;
    on(WIN, 'resize', function () { clearTimeout(rzT); rzT = setTimeout(function () { if (S.shown) render({ keepScroll: true }); }, 150); });
  }
  function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }
  function toggleMenu(open) {
    var o = open === undefined ? refs.menu.hidden : open;
    refs.menu.hidden = !o; refs.scopeBtn.setAttribute('aria-expanded', o ? 'true' : 'false');
    if (o) { var c = $('[aria-checked="true"]', refs.menu) || $('button', refs.menu); if (c) c.focus(); }
  }
  /* 网络内的方向键：上/下在同列移动，右进入下一层（无可见下级时聚焦展开），左回上一层 */
  function moveFocus(t, key) {
    var form0 = form();
    if (form0 === 'list') {
      var rows = $$('.kn-l-main', refs.list), i = rows.indexOf(t.closest('.kn-row') ? $('.kn-l-main', t.closest('.kn-row')) : t);
      if (i < 0) return;
      var li = rows[i].closest('.kn-li'), k = rows[i].getAttribute('data-key');
      if (key === 'ArrowDown' && rows[i + 1]) rows[i + 1].focus();
      else if (key === 'ArrowUp' && rows[i - 1]) rows[i - 1].focus();
      else if (key === 'Home') rows[0].focus();
      else if (key === 'End') rows[rows.length - 1].focus();
      else if (key === 'ArrowRight') { if (li.getAttribute('aria-expanded') === 'false') { toggleExp(k); refocus('.kn-l-main', k); } else if (li.getAttribute('aria-expanded') === 'true' && rows[i + 1]) rows[i + 1].focus(); }
      else if (key === 'ArrowLeft') { if (li.getAttribute('aria-expanded') === 'true') { toggleExp(k); refocus('.kn-l-main', k); } else { var pl = li.parentNode.closest('.kn-li'); if (pl) $('.kn-l-main', pl).focus(); } }
      return;
    }
    var el = t.closest('.kn-node'); if (!el) return;
    var main = $('.kn-n-main', el); var k2 = main && main.getAttribute('data-key');
    var tr = T(), n = tr.byKey[k2];
    var all = $$('.kn-node .kn-n-main', refs.nodes).filter(function (b) { return b.getAttribute('data-act') === 'sel' || b.getAttribute('data-act') === 'focus' || b.getAttribute('data-act') === 'more'; });
    var col = function (r) { return all.filter(function (b) { return b.closest('.kn-node').classList.contains('kn-r-' + r); }); };
    var role = ['center', 'ring', 'focus', 'child', 'grand', 'trunk', 'sib', 'more'].filter(function (r) { return el.classList.contains('kn-r-' + r); })[0];
    var same = role === 'more' ? all : col(role === 'center' ? 'ring' : role);
    var idx = same.indexOf(main);
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (role === 'center') { var r0 = col('ring')[0]; if (r0) r0.focus(); return; }
      var nx = same[idx + (key === 'ArrowDown' ? 1 : -1)]; if (nx) nx.focus(); return;
    }
    if (key === 'Home' && same[0]) { same[0].focus(); return; }
    if (key === 'End' && same.length) { same[same.length - 1].focus(); return; }
    if (key === 'ArrowRight') {
      if (role === 'center') { var r1 = col('ring')[0]; if (r1) r1.focus(); return; }
      if (role === 'ring' && n) { focusNode(n); return; }
      if (role === 'focus' || role === 'trunk' || role === 'sib') { var c0 = col('child')[0]; if (c0) c0.focus(); return; }
      if (role === 'child' && n && n.children.length) {
        if (S.exp.indexOf(n.key) < 0) { toggleExp(n.key); }
        var gk = n.children[0].key, ge = $('[data-k="' + cssEsc(gk) + '"] .kn-n-main', refs.nodes); if (ge) ge.focus();
        return;
      }
      if (role === 'grand' && n && n.children.length) { focusNode(n); return; }
      return;
    }
    if (key === 'ArrowLeft') {
      if (role === 'grand' && n && n.parent) { var pe = $('[data-k="' + cssEsc(n.parent.key) + '"] .kn-n-main', refs.nodes); if (pe) pe.focus(); return; }
      if (role === 'child') { var fe = $('.kn-r-focus .kn-n-main', refs.nodes); if (fe) fe.focus(); return; }
      if (role === 'focus' || role === 'ring') { var cn = cur(); if (cn.parent) focusNode(cn.parent); else if (role === 'ring') { var ce = $('.kn-r-center .kn-n-main', refs.nodes); if (ce) ce.focus(); } return; }
    }
  }
  function refocus(sel, key) { var b = $(sel + '[data-key="' + cssEsc(key) + '"]', root); if (b) b.focus(); }

  /* ---------- 初始化 ---------- */
  function init(a) {
    api = a || null;
    try { M = buildModel(RAW); }
    catch (e) {
      /* 手工数据损坏时退回只用站点数据，仍保证考点可达 */
      if (WIN.console) console.error('[知识网络] 手工数据无法解析，已只用站点数据生成索引：', e);
      RAW = {}; M = buildModel({}); M.issues.push({ level: 'error', msg: '手工数据无法解析：' + (e && e.message) });
    }
    TREES = {}; STAT = {};
    if (!buildDom()) return false;
    bind(); buildTop(); buildEntries();
    var r = report();
    if (r.issues.length && WIN.console && console.groupCollapsed) {
      console.groupCollapsed('[知识网络] 数据校验：' + r.issues.length + ' 个问题；索引覆盖 ' + r.reachable + '/' + r.points);
      r.issues.forEach(function (x) { console[x.level === 'error' ? 'error' : 'warn'](x.msg); });
      console.groupEnd();
    }
    return true;
  }

  WIN.TreetopKN = { init: init, show: show, hide: hide, onView: onView };
  /* 供自动化测试读取 */
  WIN.__kn = {
    report: function () { return M ? report() : null; },
    tree: function (s, l) { return tree(s, l || 'rel'); },
    model: function () { return M; },
    state: function () { return { scope: S.scope, logic: S.logic, focus: cur().id, focusKey: S.focusKey, sel: S.sel, selId: S.selId, exp: S.exp.slice(), url: S.url, notice: S.notice, form: form() }; },
    tab: function () { return TAB; }
  };
})();
