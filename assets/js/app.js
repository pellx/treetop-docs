/* 树梢文档 —— 交互脚本（外壳与内容页共用）
 * html[data-mode]="shell"：根目录 index.html，外壳；音频播放器在此，内容页放在 iframe 中。
 * html[data-mode]="page" ：内容页；在 iframe 中（embedded）时由外壳播放，独立打开时自带播放器。
 * 外壳 ⇄ 内容页 通过 postMessage 通信，消息均带 src:'bio-docs'。
 *
 * 多册：SITE / PLAYLIST / SEARCH_DATA 收录全部册，按册工作——
 *   外壳路由 #/ 为五册总索引，#/<册key>（如 #/bx1）为本册目录，#/<章id>、#/<期>/<锚点> 同单册；
 *   当前册决定：侧栏显示哪一组 .nav-group、搜索范围、播放清单（连播到本册最后一期停止，不出册）。
 *   内容页只看自己所在的册；共用页面（使用说明）搜索全部册。
 * 路径：页面 data-root 为到站点根的相对前缀；SITE…file、PLAYLIST.src 都相对站点根。
 */
(function () {
  'use strict';
  var D = document, H = D.documentElement;
  var MODE = H.getAttribute('data-mode') || 'page';
  var ROOT = H.getAttribute('data-root') || '';
  var EP = H.getAttribute('data-ep') || '';
  var EMBED = MODE === 'page' && window.self !== window.top;
  var MSG = 'bio-docs';
  var PL = window.PLAYLIST || [];
  var SITE = window.SITE || { books: [] };
  var SD = window.SEARCH_DATA || [];

  function $(s, c) { return (c || D).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || D).querySelectorAll(s)); }
  function on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); }
  function post(w, o) { o.src = MSG; try { w.postMessage(o, '*'); } catch (e) { /* ignore */ } }
  function mmss(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function escH(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- 日夜模式（顶部左侧小按钮；启动时由 head 内联脚本先定好 data-theme） ---------- */
  function themeNow() { return H.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  var themeHook = null;
  function syncThemeBtn() {
    var b = $('.theme-btn'); if (!b) return;
    var dark = themeNow() === 'dark';
    b.classList.toggle('is-dark', dark);
    b.setAttribute('aria-label', dark ? '切换日间模式' : '切换夜间模式');
    b.setAttribute('title', dark ? '切换日间模式' : '切换夜间模式');
  }
  function applyTheme(t, persist) {
    H.setAttribute('data-theme', t);
    if (persist) store('bio-theme', t);
    syncThemeBtn();
    if (themeHook) themeHook(t);
  }
  function initTheme() {
    if (!EMBED) {
      var brand = $('.brand');
      if (brand && !$('.theme-btn', brand)) {
        brand.insertAdjacentHTML('beforeend',
          '<button class="theme-btn" type="button">' +
          '<svg class="ic-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3z"/></svg>' +
          '<svg class="ic-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>' +
          '</button>');
        on($('.theme-btn', brand), 'click', function () { applyTheme(themeNow() === 'dark' ? 'light' : 'dark', true); });
      }
    }
    syncThemeBtn();
  }

  /* ---------- 站点结构索引与统计（所有数量只从 SITE 计算） ---------- */
  var EPS = {}, EP_ORDER = [], CH_OF = {}, CH_BY = {}, BOOK_BY = {}, BOOK_OF = {}, PL_BY = {};
  var SITE_STATS = { books: SITE.books.length, eps: 0, points: 0 }, BOOK_STATS = {};
  SITE.books.forEach(function (b) {
    BOOK_BY[b.key] = b; PL_BY[b.key] = [];
    var bs = BOOK_STATS[b.key] = { chapters: b.chapters.length, eps: 0, points: 0 };
    b.chapters.forEach(function (ch) {
      BOOK_OF[ch.id] = b.key; CH_BY[ch.id] = ch;
      ch.eps.forEach(function (e) {
        e.book = b; e.ch = ch; EPS[e.slug] = e; EP_ORDER.push(e.slug); CH_OF[e.slug] = ch; BOOK_OF[e.slug] = b.key;
        bs.eps++; bs.points += e.points.length; SITE_STATS.eps++; SITE_STATS.points += e.points.length;
      });
    });
  });
  PL.forEach(function (x) { var k = BOOK_OF[x.ep]; if (k) PL_BY[k].push(x); });

  /* 总索引与各册目录的数量、考点清单均由上面的同一份 SITE 数据刷新。 */
  function syncHomeStats() {
    var summary = $('#siteSummary');
    if (summary) {
      var cn = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
      summary.textContent = '共' + (cn[SITE_STATS.books] || SITE_STATS.books) + '册，' + SITE_STATS.eps + '期，' + SITE_STATS.points + '个考点。支持考点检索、思维导图、语音讲解与连续播放。';
    }
    $$('#books tr[data-book]').forEach(function (row) {
      var stats = BOOK_STATS[row.getAttribute('data-book')]; if (!stats) return;
      $$('[data-stat]', row).forEach(function (cell) { cell.textContent = stats[cell.getAttribute('data-stat')]; });
    });
    $$('.home-inner tr[data-ep]').forEach(function (row) {
      var e = EPS[row.getAttribute('data-ep')]; if (!e) return;
      var count = $('td.num', row), list = $('.ep-pts', row);
      if (count) count.textContent = e.points.length;
      if (list) list.textContent = e.points.join('、');
    });
    $$('.home-inner .chapter[id]').forEach(function (sec) {
      var ch = CH_BY[sec.id], meta = $('.ch-meta', sec); if (!ch || !meta) return;
      var duration = ch.eps.reduce(function (sum, e) { return sum + (e.dur || 0); }, 0);
      meta.textContent = ch.eps.length + ' 期 · ' + mmss(duration);
    });
  }
  function sceneLabel(item) {
    var e = EPS[item.ep]; if (!e) return item.n;
    if (item.p === 0) return '导读';
    if (item.p === 'review') return '易错速查';
    return '考点' + item.p + ' ' + (e.points[item.p - 1] || '');
  }

  /* ---------- 播放器核心 ---------- */
  var RATE_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  function Player(items, root, hooks) {
    this.items = items; this.root = root; this.hooks = hooks || {};
    this.i = -1; this.rate = parseFloat(store('bio-rate')) || 1;
    if (RATE_STEPS.indexOf(this.rate) < 0) this.rate = 1;
    this.audio = new Audio(); this.audio.preload = 'auto';
    this.gapTimer = null;
    var self = this, a = this.audio;
    a.addEventListener('ended', function () { self.gapTimer = setTimeout(function () { self.advance(); }, 180); });
    a.addEventListener('play', function () { self.emit(); });
    a.addEventListener('pause', function () { self.emit(); });
    a.addEventListener('timeupdate', function () { if (self.hooks.onTime) self.hooks.onTime(a.currentTime, a.duration || (self.cur() || {}).sec || 0); });
    a.addEventListener('error', function () {
      if (self.i < 0) return;
      if (self.hooks.onError) self.hooks.onError(self.cur());
      self.gapTimer = setTimeout(function () { self.advance(); }, 800);
    });
  }
  Player.prototype.cur = function () { return this.items[this.i] || null; };
  Player.prototype.playing = function () { return this.i >= 0 && !this.audio.paused; };
  Player.prototype.emit = function () { if (this.hooks.onState) this.hooks.onState(this.playing(), this.cur(), this.i); };
  Player.prototype.indexOf = function (ep, id) {
    for (var k = 0; k < this.items.length; k++) if (this.items[k].id === id && (!ep || this.items[k].ep === ep)) return k;
    return -1;
  };
  Player.prototype.playAt = function (k) {
    clearTimeout(this.gapTimer);
    if (k < 0 || k >= this.items.length) return;
    var prev = this.cur();
    this.i = k;
    var it = this.items[k], a = this.audio;
    a.src = this.root + it.src;
    a.defaultPlaybackRate = this.rate; a.playbackRate = this.rate;
    var p = a.play(); if (p && p.catch) p.catch(function () { /* 自动播放被拦截：保持暂停态 */ });
    if (this.hooks.onLine) this.hooks.onLine(it, k, prev);
    this.emit();
  };
  Player.prototype.advance = function () {
    if (this.i + 1 < this.items.length) this.playAt(this.i + 1);
    else { this.i = -1; this.audio.removeAttribute('src'); if (this.hooks.onEnd) this.hooks.onEnd(); this.emit(); }
  };
  Player.prototype.toggle = function () {
    if (this.i < 0) { this.playAt(this.startIndex ? this.startIndex() : 0); return; }
    if (this.audio.paused) { var p = this.audio.play(); if (p && p.catch) p.catch(function () {}); } else this.audio.pause();
  };
  // 离开讲义时停声：同时取消已排队的“下一句”，避免隐藏后自动续播
  Player.prototype.stop = function () {
    clearTimeout(this.gapTimer);
    if (this.i >= 0 && !this.audio.paused) this.audio.pause();
  };
  Player.prototype.next = function () { if (this.i < 0) return this.toggle(); if (this.i + 1 < this.items.length) this.playAt(this.i + 1); };
  Player.prototype.prev = function () {
    if (this.i < 0) return this.toggle();
    this.playAt(Math.max(0, this.i - 1));
  };
  // 键盘切句：未开始播放时不自动开始（避免误触）；到末句再按“下一句”不动作
  Player.prototype.stepKey = function (dir) {
    if (this.i < 0) return;
    if (dir < 0) this.playAt(Math.max(0, this.i - 1));
    else if (this.i + 1 < this.items.length) this.playAt(this.i + 1);
  };
  Player.prototype.setRate = function (r) { this.rate = r; this.audio.defaultPlaybackRate = r; this.audio.playbackRate = r; store('bio-rate', String(r)); };

  /* ---------- 播放器界面 ---------- */
  function bindPlayerUI(player, scope, jumpHook) {
    var box = $('#player'); if (!box) return;
    var bar = $('#plBar'), title = $('#plTitle'), sub = $('#plSub');
    on($('#plPlay'), 'click', function () { player.toggle(); });
    on($('#plPrev'), 'click', function () { player.prev(); });
    on($('#plNext'), 'click', function () { player.next(); });
    /* 语速：点一下展开小列表，0.5×–3× */
    var rateBox = $('#plRate'), rateBtn = $('#plRateBtn'), rateMenu = $('#plRateMenu'), rateLabel = $('#plRateLabel');
    function markRate() {
      if (!rateBtn) return;
      rateLabel.textContent = player.rate + '×';
      rateBtn.setAttribute('aria-label', '播放速度 ' + player.rate + '×');
      $$('#plRateMenu [data-rate]').forEach(function (b) {
        b.setAttribute('aria-selected', parseFloat(b.getAttribute('data-rate')) === player.rate ? 'true' : 'false');
      });
    }
    function openRate(open) {
      if (!rateMenu || !rateBtn) return;
      rateMenu.hidden = !open;
      rateBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { var sel = rateMenu.querySelector('[aria-selected="true"]') || rateMenu.querySelector('button'); if (sel) sel.focus(); }
    }
    on(rateBtn, 'click', function (ev) { ev.stopPropagation(); openRate(rateMenu.hidden); });
    on(rateMenu, 'click', function (ev) {
      var b = ev.target.closest('[data-rate]'); if (!b) return;
      player.setRate(parseFloat(b.getAttribute('data-rate')));
      markRate(); openRate(false); rateBtn.focus();
    });
    on(D, 'click', function (ev) { if (rateBox && !rateBox.contains(ev.target)) openRate(false); });
    on(D, 'keydown', function (ev) {
      if (ev.key !== 'Escape' || !rateMenu || rateMenu.hidden) return;
      ev.preventDefault(); openRate(false); rateBtn.focus();
    });
    markRate();

    /* 正在朗读的整句移到页面最上方，底栏只留居中的小节/知识点信息；可关闭，移动端用字幕按钮再打开 */
    var topLine = D.createElement('div');
    topLine.className = 'pl-topline'; topLine.hidden = true;
    var topText = D.createElement('span');
    topText.className = 'pl-topline-text'; topText.setAttribute('aria-live', 'polite');
    var capBox = D.createElement('span');
    capBox.className = 'pl-topline-box';
    capBox.appendChild(topText);
    var capClose = D.createElement('button');
    capClose.type = 'button'; capClose.className = 'pl-topline-close';
    capClose.setAttribute('aria-label', '关闭字幕'); capClose.title = '关闭字幕';
    capClose.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    capBox.appendChild(capClose);
    topLine.appendChild(capBox);
    D.body.appendChild(topLine);
    var capOpen = D.createElement('button');
    capOpen.type = 'button'; capOpen.className = 'pl-topline-open'; capOpen.hidden = true;
    capOpen.setAttribute('aria-label', '显示字幕'); capOpen.title = '显示字幕';
    capOpen.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="1"/><path d="M7 10h4M7 14h4M13 10h4M13 14h4"/></svg>';
    D.body.appendChild(capOpen);
    var captionOpen = true, captionPress = 0;
    on(capClose, 'click', function () {
      captionOpen = false; topLine.hidden = true; capOpen.hidden = false;
      topLine.classList.remove('show-close');
    });
    on(capOpen, 'click', function () {
      captionOpen = true; capOpen.hidden = true;
      if (player.cur()) topLine.hidden = false;
    });
    /* 手机没有悬停：长按歌词唤出右上角关闭按钮 */
    on(topLine, 'pointerdown', function (ev) {
      if (ev.pointerType === 'mouse') return;
      clearTimeout(captionPress);
      captionPress = setTimeout(function () { topLine.classList.add('show-close'); }, 450);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
      on(topLine, t, function () { clearTimeout(captionPress); });
    });
    on(D, 'pointerdown', function (ev) {
      if (!topLine.contains(ev.target)) topLine.classList.remove('show-close');
    });

    /* ---------- 进度条：整期所有句子共用一条，按知识点分段，可点击/拖动定位 ---------- */
    var track = bar ? bar.parentNode : null;
    var marks = null, seekTip = null, seekList = [], seekSecs = [], seekRanges = [], seekTotal = 0, seekEp = '';
    if (track) {
      track.classList.add('pl-seek');
      track.setAttribute('role', 'slider');
      track.setAttribute('aria-label', '本节播放进度，可拖动定位');
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', '100');
      track.setAttribute('aria-valuenow', '0');
      marks = D.createElement('div'); marks.className = 'pl-seek-marks'; marks.setAttribute('aria-hidden', 'true');
      track.appendChild(marks);
      seekTip = D.createElement('div'); seekTip.className = 'pl-seek-tip'; seekTip.hidden = true;
      track.appendChild(seekTip);
    }
    function buildSeek(it) {
      seekEp = it.ep;
      seekList = player.items.filter(function (x) { return x.ep === it.ep; });
      seekSecs = seekList.map(function (x) { return x.sec || 0; });
      seekTotal = seekSecs.reduce(function (s, v) { return s + v; }, 0);
      seekRanges = [];
      if (!marks) return;
      marks.textContent = '';
      if (!seekTotal) return;
      var e = EPS[it.ep] || {}, acc = 0;
      seekList.forEach(function (x, i) {
        var rg = seekRanges[seekRanges.length - 1];
        if (!rg || rg.p !== x.p) { rg = { p: x.p, start: acc, dur: 0, secs: [] }; seekRanges.push(rg); }
        rg.dur += seekSecs[i]; rg.secs.push(seekSecs[i]);
        acc += seekSecs[i];
      });
      seekRanges.forEach(function (rg, ri) {
        var seg = D.createElement('span'); seg.className = 'pl-seek-seg';
        seg.style.left = (rg.start / seekTotal * 100) + '%';
        seg.style.width = (rg.dur / seekTotal * 100) + '%';
        seg.title = pointLabel(rg.p, e);
        var fill = D.createElement('span'); fill.className = 'pl-seek-fill';
        seg.appendChild(fill); rg.fill = fill;
        rg.ticks = [];
        var local = 0;
        rg.secs.forEach(function (s, si) {
          if (si > 0) {
            var tick = D.createElement('span'); tick.className = 'pl-seek-tick';
            tick.style.left = (local / rg.dur * 100) + '%';
            seg.appendChild(tick); rg.ticks.push(tick);
          }
          local += s;
        });
        marks.appendChild(seg);
        if (ri > 0) {
          var gap = D.createElement('span'); gap.className = 'pl-seek-gap';
          gap.style.left = (rg.start / seekTotal * 100) + '%';
          marks.appendChild(gap);
        }
      });
    }
    function seekPos() {
      var it = player.cur(); if (!it || !seekTotal) return 0;
      var acc = 0;
      for (var i = 0; i < seekList.length; i++) {
        if (seekList[i] === it) return acc + (player.audio.currentTime || 0);
        acc += seekSecs[i] || 0;
      }
      return 0;
    }
    function paintSeek(r) {
      if (!bar) return;
      r = Math.max(0, Math.min(1, r));
      var target = r * seekTotal;
      seekRanges.forEach(function (rg) {
        if (!rg.fill) return;
        var f = rg.dur ? Math.max(0, Math.min(1, (target - rg.start) / rg.dur)) : 0;
        rg.fill.style.width = (f * 100) + '%';
        /* 已播到的部分底色变绿，句子分割线要转黑才看得清 */
        (rg.ticks || []).forEach(function (t) {
          t.classList.toggle('is-played', parseFloat(t.style.left) <= f * 100 + 0.01);
        });
      });
      bar.style.width = '0';
      if (track) track.setAttribute('aria-valuenow', String(Math.round(r * 100)));
    }
    function paintNow() { paintSeek(seekTotal ? seekPos() / seekTotal : 0); }
    function markHot(r) {
      if (!marks) return;
      var target = Math.max(0, Math.min(1, r)) * seekTotal;
      $$('.pl-seek-seg', marks).forEach(function (seg, i) {
        var rg = seekRanges[i];
        seg.classList.toggle('is-hot', !!rg && target >= rg.start && target < rg.start + rg.dur);
      });
    }
    function seekLabel(r) {
      if (!seekTotal || !seekList.length) return '';
      var target = Math.max(0, Math.min(1, r)) * seekTotal, acc = 0, k = 0;
      for (; k < seekList.length; k++) { var s = seekSecs[k]; if (target < acc + s) break; acc += s; }
      if (k >= seekList.length) { k = seekList.length - 1; acc = Math.max(0, seekTotal - seekSecs[k]); }
      var x = seekList[k];
      return sceneLabel(x) + ' · ' + (k + 1) + '/' + seekList.length + ' · ' + mmss(Math.round(target)) + ' / ' + mmss(Math.round(seekTotal));
    }
    function showTip(r) {
      if (!seekTip) return;
      if (!seekTotal) { seekTip.hidden = true; return; }
      seekTip.textContent = seekLabel(r);
      seekTip.hidden = false;
      /* 靠近左右边缘时向内挤，保证小预览卡片完整可见 */
      var tw = track.clientWidth, w = seekTip.offsetWidth;
      var x = w >= tw - 8 ? tw / 2 : Math.max(w / 2 + 4, Math.min(tw - w / 2 - 4, r * tw));
      seekTip.style.left = x + 'px';
    }
    function hideTip() { if (seekTip) seekTip.hidden = true; }
    var seekDrag = false, seekRatio = 0, seekWasPlaying = false;
    function ratioAt(x) {
      if (!track) return 0;
      var rect = track.getBoundingClientRect();
      return rect.width ? (x - rect.left) / rect.width : 0;
    }
    function commitSeek(r) {
      if (!seekTotal || !seekList.length) return;
      r = Math.max(0, Math.min(1, r));
      var target = r * seekTotal, acc = 0, k = 0;
      for (; k < seekList.length; k++) { if (target < acc + seekSecs[k]) break; acc += seekSecs[k]; }
      if (k >= seekList.length) k = seekList.length - 1;
      /* 点击/拖动只定位到对应句子的开头，句子内部不做截取 */
      var abs = player.items.indexOf(seekList[k]); if (abs < 0) return;
      var wasPlaying = seekWasPlaying;
      player.playAt(abs);
      if (!wasPlaying) player.audio.pause(); /* 本来就没在播：只挪位置，不自动出声 */
      paintNow();
    }
    if (track) {
      on(track, 'pointerdown', function (ev) {
        if (!seekTotal || !seekList.length || (ev.button !== undefined && ev.button !== 0)) return;
        ev.preventDefault();
        seekDrag = true; seekWasPlaying = player.playing(); seekRatio = ratioAt(ev.clientX);
        track.classList.add('is-drag');
        try { track.setPointerCapture(ev.pointerId); } catch (e) {}
        paintSeek(seekRatio); showTip(seekRatio); markHot(seekRatio);
      });
      on(track, 'pointermove', function (ev) {
        if (!seekTotal || !seekList.length) return;
        var r = ratioAt(ev.clientX);
        if (seekDrag) { seekRatio = r; paintSeek(r); }
        showTip(r); markHot(r);
      });
      var endSeek = function (ev) {
        if (!seekDrag) return;
        seekDrag = false; track.classList.remove('is-drag');
        try { track.releasePointerCapture(ev.pointerId); } catch (e) {}
        hideTip(); commitSeek(seekRatio);
      };
      on(track, 'pointerup', endSeek);
      on(track, 'pointercancel', endSeek);
      on(track, 'pointerleave', function () {
        if (seekDrag) return;
        hideTip();
        if (marks) $$('.pl-seek-seg.is-hot', marks).forEach(function (s) { s.classList.remove('is-hot'); });
      });
    }

    /* ---------- 小节名 / 句序 / 知识点名 / 句序：点击弹出同级列表快速跳转 ---------- */
    var jumpMenu = D.createElement('div');
    jumpMenu.className = 'pl-jump-menu'; jumpMenu.id = 'plJumpMenu';
    jumpMenu.setAttribute('role', 'listbox'); jumpMenu.hidden = true;
    box.appendChild(jumpMenu);
    var jumpAnchor = null;
    function pointLabel(p, e) {
      if (p === 0) return '导读';
      if (p === 'review') return '易错速查';
      return '考点' + p + ' ' + ((e.points && e.points[p - 1]) || '');
    }
    function jumpRows(kind, it) {
      var rows = [], same = player.items.filter(function (x) { return x.ep === it.ep; });
      if (kind === 'ep') {
        var seen = {};
        player.items.forEach(function (x, k) {
          if (seen[x.ep]) return; seen[x.ep] = 1;
          var e = EPS[x.ep] || {};
          rows.push({ k: k, num: e.code || x.n, text: e.full || e.sec || x.n, sel: x.ep === it.ep });
        });
      } else if (kind === 'epNum') {
        same.forEach(function (x) {
          rows.push({ k: player.items.indexOf(x), num: (same.indexOf(x) + 1) + '/' + same.length, text: x.t, sel: x === it });
        });
      } else if (kind === 'pt') {
        var last = null, e2 = EPS[it.ep] || {};
        same.forEach(function (x) {
          if (last !== null && x.p === last) return; last = x.p;
          rows.push({ k: player.items.indexOf(x), num: '', text: pointLabel(x.p, e2), sel: x.p === it.p });
        });
      } else {
        var sc = same.filter(function (x) { return x.p === it.p; });
        sc.forEach(function (x) {
          rows.push({ k: player.items.indexOf(x), num: (sc.indexOf(x) + 1) + '/' + sc.length, text: x.t, sel: x === it });
        });
      }
      return rows;
    }
    function closeJump(restore) {
      var a = jumpAnchor;
      jumpMenu.hidden = true; jumpAnchor = null;
      if (a) a.setAttribute('aria-expanded', 'false');
      if (restore && a) a.focus();
    }
    function jumpTo(k) { closeJump(); var it = player.items[k]; if (!it) return; if (jumpHook) jumpHook(it, k); else player.playAt(k); }
    function openJump(kind, anchor, it) {
      var rows = jumpRows(kind, it); if (!rows.length) return;
      jumpMenu.textContent = '';
      rows.forEach(function (row) {
        var b = D.createElement('button'); b.type = 'button'; b.setAttribute('role', 'option');
        b.setAttribute('aria-selected', row.sel ? 'true' : 'false');
        if (row.num) { var n = D.createElement('span'); n.className = 'jm-n'; n.textContent = row.num; b.appendChild(n); }
        b.appendChild(D.createTextNode(row.text));
        on(b, 'click', function () { jumpTo(row.k); });
        jumpMenu.appendChild(b);
      });
      jumpAnchor = anchor; anchor.setAttribute('aria-expanded', 'true');
      jumpMenu.hidden = false;
      var boxRect = box.getBoundingClientRect(), aRect = anchor.getBoundingClientRect();
      var left = aRect.left - boxRect.left, width = jumpMenu.offsetWidth || 320;
      if (left + width > boxRect.width - 12) left = Math.max(12, boxRect.width - width - 12);
      jumpMenu.style.left = left + 'px';
      var sel = jumpMenu.querySelector('[aria-selected="true"]') || jumpMenu.querySelector('button');
      if (sel) sel.focus();
    }
    function jumpBtn(kind, text, tip) {
      var b = D.createElement('button'); b.type = 'button';
      b.className = 'pl-jump' + (kind === 'epNum' || kind === 'ptNum' ? ' num' : '');
      b.setAttribute('data-jump', kind); b.setAttribute('aria-haspopup', 'listbox');
      b.setAttribute('aria-expanded', 'false'); b.title = tip; b.textContent = text;
      return b;
    }
    function truncateTo(b) {
      var full = b._full || '';
      b.textContent = full;
      if (b.scrollWidth <= b.clientWidth + 1) return;
      var lo = 0, hi = full.length;
      while (lo < hi) {
        var mid = Math.ceil((lo + hi) / 2);
        b.textContent = full.slice(0, mid) + '..';
        if (b.scrollWidth <= b.clientWidth) lo = mid; else hi = mid - 1;
      }
      b.textContent = full.slice(0, lo) + '..';
    }
    function fitTitle() {
      if (!titleRefs) return;
      var main = title.querySelector('.pl-title-main'); if (!main) return;
      if (!main.clientWidth) return; /* 播放栏隐藏时不量宽度，等可见后下一次更新再算 */
      var bs = [titleRefs.ep, titleRefs.pt];
      main.style.gap = '';
      bs.forEach(function (b) { b.textContent = b._full; b.style.flex = '0 0 auto'; });
      var gap = parseFloat(getComputedStyle(main).columnGap) || 0;
      var total = bs[0].offsetWidth + bs[1].offsetWidth + gap;
      if (total <= main.clientWidth + 1) { bs.forEach(function (b) { b.style.flex = '0 1 auto'; }); return; }
      /* 放不下时按完整文字的比例分空间，两个名称都保留，各自用 .. 收尾 */
      var avail = Math.max(56, main.clientWidth - gap);
      var natural = bs.map(function (b) { return Math.max(28, b.offsetWidth); });
      var w1 = Math.max(28, Math.round(avail * natural[0] / (natural[0] + natural[1])));
      bs[0].style.flex = '0 0 ' + w1 + 'px';
      bs[1].style.flex = '0 0 ' + (avail - w1) + 'px';
      main.style.gap = '2px';
      bs.forEach(truncateTo);
    }
    function renderTitle(it) {
      var e = EPS[it.ep] || {};
      var same = player.items.filter(function (x) { return x.ep === it.ep; });
      var inEp = same.indexOf(it) + 1;
      var sc = same.filter(function (x) { return x.p === it.p; }), inSc = sc.indexOf(it) + 1;
      title.textContent = '';
      var main = D.createElement('span'); main.className = 'pl-title-main';
      var epBtn = jumpBtn('ep', e.full || e.sec || it.n, '点击切换小节');
      epBtn._full = e.full || e.sec || it.n;
      main.appendChild(epBtn);
      var sep = D.createElement('span'); sep.className = 'pl-sep'; sep.textContent = '·'; main.appendChild(sep);
      var ptBtn = jumpBtn('pt', sceneLabel(it), '点击切换知识点');
      ptBtn._full = sceneLabel(it);
      main.appendChild(ptBtn);
      var nums = D.createElement('span'); nums.className = 'pl-title-nums';
      var epNum = jumpBtn('epNum', inEp + '/' + same.length, '点击选择本节任意一句');
      var ptNum = jumpBtn('ptNum', inSc + '/' + sc.length, '点击选择本知识点任意一句');
      nums.appendChild(epNum); nums.appendChild(ptNum);
      title.appendChild(main); title.appendChild(nums);
      titleRefs = { ep: epBtn, pt: ptBtn, epNum: epNum, ptNum: ptNum };
      titleEp = it.ep; titleP = it.p;
      fitTitle();
    }
    on(title, 'click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-jump]') : null; if (!b) return;
      var it = player.cur(); if (!it) return;
      if (!jumpMenu.hidden && jumpAnchor === b) { closeJump(); return; }
      openJump(b.getAttribute('data-jump'), b, it);
    });
    on(D, 'click', function (ev) {
      if (jumpMenu.hidden || jumpMenu.contains(ev.target) || title.contains(ev.target)) return;
      closeJump();
    });
    on(D, 'keydown', function (ev) {
      if (ev.key === 'Escape' && !jumpMenu.hidden) { ev.preventDefault(); closeJump(true); }
    });

    var titleRefs = null, titleEp = '', titleP = null;
    var oldState = player.hooks.onState, oldTime = player.hooks.onTime, oldErr = player.hooks.onError;
    player.hooks.onState = function (playing, it, k) {
      box.classList.toggle('is-on', playing);
      $('#plPlay').setAttribute('aria-label', playing ? '暂停' : '播放');
      if (it) {
        if (seekEp !== it.ep) buildSeek(it);
        /* 只有换期或换知识点才重建标题；同一知识点内只改右侧计数，打开的跳转菜单不会被顶掉 */
        var same = player.items.filter(function (x) { return x.ep === it.ep; });
        var sc = same.filter(function (x) { return x.p === it.p; });
        if (!titleRefs || titleEp !== it.ep || titleP !== it.p) { closeJump(); renderTitle(it); }
        else {
          titleRefs.epNum.textContent = (same.indexOf(it) + 1) + '/' + same.length;
          titleRefs.ptNum.textContent = (sc.indexOf(it) + 1) + '/' + sc.length;
          fitTitle();
        }
        paintNow();
        topText.textContent = it.t;
        topText.title = it.t;
        if (captionOpen) topLine.hidden = false;
        capOpen.hidden = captionOpen;
        sub.textContent = '';
      } else if (k < 0) {
        paintSeek(0);
        topLine.hidden = true;
        capOpen.hidden = true;
        if (title.textContent !== '未开始播放') sub.textContent = scope === 'all' ? '已播放到本册最后一期，连播结束' : '本期播放完毕';
      }
      if (oldState) oldState(playing, it, k);
    };
    player.hooks.onTime = function (t, d) { if (seekTotal && !seekDrag) paintNow(); if (oldTime) oldTime(t, d); };
    var fitRaf = 0;
    on(window, 'resize', function () { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitTitle); });
    player.hooks.onError = function (it) { sub.textContent = '音频加载失败，已跳过：' + (it ? it.n + '/' + it.id : ''); if (oldErr) oldErr(it); };
  }

  /* ---------- 侧栏 ---------- */
  function initSidebar() {
    var side = $('#sidebar'); if (!side) return;
    function syncEpBtn(li) { var b = $('.nav-ep-btn', li); if (b) b.setAttribute('aria-expanded', li.classList.contains('open') ? 'true' : 'false'); }
    function setPts(eps, open) { eps.forEach(function (li) { li.classList.toggle('open', open); syncEpBtn(li); }); }
    function allOpen(eps) { return eps.length > 0 && eps.every(function (li) { return li.classList.contains('open'); }); }
    function setAll(scope, open) {
      $$('.nav-ch', scope).forEach(function (ch) {
        ch.classList.toggle('collapsed', !open);
        var cb = $('.nav-ch-btn', ch); if (cb) cb.setAttribute('aria-expanded', open ? 'true' : 'false');
        var pb = $('.nav-ch-points', ch); if (pb) pb.setAttribute('aria-pressed', open ? 'true' : 'false');
      });
      setPts($$('.nav-ep', scope), open);
    }

    $$('.nav-ch-btn').forEach(function (b) {
      on(b, 'click', function () {
        var ch = b.parentNode; var c = ch.classList.toggle('collapsed');
        b.setAttribute('aria-expanded', c ? 'false' : 'true');
      });
    });

    /* 目录宽度拖拽缩放：拖动右边缘调整，双击恢复默认，方向键微调 */
    if (!EMBED && !$('.side-resizer')) {
      var DEFAULT_W = 296, MIN_W = 220, MAX_W = 520;
      function clampW(w) { return Math.max(MIN_W, Math.min(MAX_W, Math.round(w))); }
      function widthNow() { return parseInt(getComputedStyle(H).getPropertyValue('--side-w'), 10) || DEFAULT_W; }
      function setW(w, persist) {
        w = clampW(w);
        H.style.setProperty('--side-w', w + 'px');
        if (persist) store('bio-side-w', String(w));
      }
      var saved = parseInt(store('bio-side-w'), 10);
      if (saved) setW(saved, false);
      var rz = D.createElement('div');
      rz.className = 'side-resizer'; rz.tabIndex = 0;
      rz.setAttribute('role', 'separator'); rz.setAttribute('aria-orientation', 'vertical');
      rz.setAttribute('aria-label', '调整目录宽度');
      rz.title = '拖动调整目录宽度，双击恢复默认';
      D.body.appendChild(rz);
      var dragging = false;
      rz.addEventListener('pointerdown', function (ev) {
        dragging = true; rz.classList.add('dragging'); D.body.classList.add('nav-resizing');
        try { rz.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
        ev.preventDefault();
      });
      rz.addEventListener('pointermove', function (ev) { if (dragging) setW(ev.clientX, false); });
      function endDrag() {
        if (!dragging) return;
        dragging = false; rz.classList.remove('dragging'); D.body.classList.remove('nav-resizing');
        store('bio-side-w', String(widthNow()));
      }
      rz.addEventListener('pointerup', endDrag);
      rz.addEventListener('pointercancel', endDrag);
      rz.addEventListener('dblclick', function () { setW(DEFAULT_W, true); });
      rz.addEventListener('keydown', function (ev) {
        var step = ev.shiftKey ? 40 : 12;
        if (ev.key === 'ArrowLeft') { setW(widthNow() - step, true); ev.preventDefault(); }
        else if (ev.key === 'ArrowRight') { setW(widthNow() + step, true); ev.preventDefault(); }
        else if (ev.key === 'Home') { setW(DEFAULT_W, true); ev.preventDefault(); }
      });
    }

    /* 书本级：展开/收起全部章节与考点（每册一组；外壳中每个 .nav-group 各自一组，总索引组没有章节则不加） */
    $$('.nav-book', side).forEach(function (book) {
      var grp = book.parentNode;
      if (!$('.nav-ch', grp) || $('.nav-tools', grp)) return;
      book.insertAdjacentHTML('afterend',
        '<div class="nav-tools"><button type="button" data-nav="open">全部展开</button><button type="button" data-nav="close">全部收起</button></div>');
      var tools = book.nextElementSibling;
      on($('[data-nav="open"]', tools), 'click', function () { setAll(grp, true); });
      on($('[data-nav="close"]', tools), 'click', function () { setAll(grp, false); });
    });

    /* 章级：展开/收起本章全部考点 */
    $$('.nav-ch', side).forEach(function (ch) {
      if ($('.nav-ch-points', ch)) return;
      var b = D.createElement('button');
      b.type = 'button'; b.className = 'nav-ch-points'; b.textContent = '考点';
      b.title = '展开/收起本章全部考点'; b.setAttribute('aria-pressed', 'false');
      ch.appendChild(b);
      on(b, 'click', function (ev) {
        ev.stopPropagation();
        var eps = $$('.nav-ep', ch), open = !allOpen(eps);
        setPts(eps, open);
        b.setAttribute('aria-pressed', open ? 'true' : 'false');
      });
    });

    /* 小节级：展开/收起本节考点 */
    $$('.nav-ep', side).forEach(function (li) {
      if ($('.nav-ep-btn', li)) return;
      var b = D.createElement('button');
      b.type = 'button'; b.className = 'nav-ep-btn'; b.title = '展开/收起本节考点';
      b.setAttribute('aria-label', '展开/收起本节考点');
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6-1.4-1.4L12.2 12 7.6 7.4z"/></svg>';
      li.appendChild(b);
      syncEpBtn(li);
      on(b, 'click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        li.classList.toggle('open');
        syncEpBtn(li);
      });
    });

    var overlay = $('#overlay'), btn = $('#menuBtn');
    function setOpen(o) { D.body.classList.toggle('nav-open', o); if (overlay) overlay.hidden = !o; if (btn) btn.setAttribute('aria-expanded', o ? 'true' : 'false'); }
    on(btn, 'click', function () { setOpen(!D.body.classList.contains('nav-open')); });
    on(overlay, 'click', function () { setOpen(false); });
    on($('#sidebar'), 'click', function (ev) { if (ev.target.closest('a') && window.innerWidth < 900) setOpen(false); });
    on(D, 'keydown', function (ev) { if (ev.key === 'Escape') setOpen(false); });
  }
  // 当前期 / 当前考点高亮：mode 'read' 来自滚动，'play' 来自播放
  var navState = { ep: '', a: '', playEp: '', playA: '' };
  function setNav(ep, a, kind) {
    if (kind === 'play') { navState.playEp = ep || ''; navState.playA = a || ''; }
    else { navState.ep = ep || ''; navState.a = a || ''; }
    $$('.nav-pt').forEach(function (x) {
      var e = x.getAttribute('data-ep'), aa = x.getAttribute('data-a');
      x.classList.toggle('active', e === navState.ep && aa === navState.a);
      x.classList.toggle('playing', e === navState.playEp && aa === navState.playA);
    });
    if (kind !== 'play' || !navState.ep) {
      $$('.nav-ep').forEach(function (li) {
        var cur = li.getAttribute('data-ep') === navState.ep;
        li.classList.toggle('open', cur || li.getAttribute('data-ep') === navState.playEp);
        li.classList.toggle('current', cur);
        var eb = $('.nav-ep-btn', li); if (eb) eb.setAttribute('aria-expanded', li.classList.contains('open') ? 'true' : 'false');
        var l = $('.nav-ep-link', li); l.classList.toggle('active', cur);
        if (cur) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
      });
    }
  }
  function revealNav(ep) {
    var li = $('.nav-ep[data-ep="' + ep + '"]'); if (!li) return;
    var ch = li.closest('.nav-ch'); if (ch && ch.classList.contains('collapsed')) { ch.classList.remove('collapsed'); $('.nav-ch-btn', ch).setAttribute('aria-expanded', 'true'); }
    var side = $('#sidebar'), r = li.getBoundingClientRect(), sr = side.getBoundingClientRect();
    if (r.top < sr.top + 60 || r.top > sr.bottom - 80) side.scrollTop += r.top - sr.top - 120;
  }

  /* ---------- 搜索 ---------- */
  // scope()：返回当前册 key（只搜本册）或 ''（搜全部册）
  function initSearch(go, scope) {
    var q = $('#q'), box = $('#results'); if (!q || !box) return;
    var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    var hint = $('#kbdHint'); if (hint && isMac) hint.textContent = '⌘ K';
    var sel = -1, cur = [], networkMode = false, defaultPlaceholder = q.getAttribute('placeholder') || '搜索';
    var search = $('.search'), toggle = $('#searchToggle'), searchBox = $('#searchBox');
    var topbar = search && search.closest('.topbar'), lastTopbarWidth = topbar ? topbar.clientWidth : 0;
    function setSearchOpen(open) {
      var collapsible = search && search.classList.contains('is-collapsed'), expanded = !!open && collapsible;
      if (search && toggle) {
        search.classList.toggle('is-open', expanded);
        if (topbar) topbar.classList.toggle('search-open', expanded);
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        toggle.setAttribute('aria-label', expanded ? '收起搜索' : '展开搜索');
        toggle.title = expanded ? '收起搜索' : '展开搜索';
      }
      if (open) { q.focus(); q.select(); }
      else { box.hidden = true; q.blur(); if (toggle && collapsible) toggle.focus(); }
      if (topLayoutHook) requestAnimationFrame(topLayoutHook);
    }
    /* 标题优先占用空间；完整搜索框被压到过窄时，在任何视口宽度下都收成按钮。 */
    function syncSearchCollapse() {
      if (!search || !searchBox || !topbar || search.classList.contains('is-open')) return;
      search.classList.remove('is-collapsed'); topbar.classList.remove('search-collapsed');
      var collapse = searchBox.getBoundingClientRect().width < 180;
      search.classList.toggle('is-collapsed', collapse); topbar.classList.toggle('search-collapsed', collapse);
      if (collapse) { box.hidden = true; q.blur(); }
    }
    searchLayoutHook = syncSearchCollapse;
    syncSearchCollapse();
    on(toggle, 'click', function () { setSearchOpen(!(search && search.classList.contains('is-open'))); });
    function topbarResized() {
      var width = topbar ? topbar.clientWidth : 0;
      if (width === lastTopbarWidth) return;
      lastTopbarWidth = width;
      if (search && search.classList.contains('is-open')) setSearchOpen(false);
      if (topLayoutHook) requestAnimationFrame(topLayoutHook);
    }
    if (window.ResizeObserver && topbar) { var topbarObserver = new ResizeObserver(topbarResized); topbarObserver.observe(topbar); }
    else on(window, 'resize', topbarResized);
    function networkAPI() {
      var kn = window.TreetopKN;
      return kn && typeof kn.searchActive === 'function' && kn.searchActive() && typeof kn.search === 'function' && typeof kn.chooseSearch === 'function' ? kn : null;
    }
    function syncSearchScope() {
      var active = !!networkAPI();
      if (active !== networkMode) {
        networkMode = active; q.placeholder = active ? '在网络中查找概念、考点…' : defaultPlaceholder;
        box.hidden = true; box.innerHTML = ''; cur = []; sel = -1;
      }
      return active;
    }
    searchScopeHook = syncSearchScope;
    syncSearchScope();
    var idx = SD.map(function (x) {
      return { x: x, t: (x.t || '').toLowerCase(), s: (x.s || '').toLowerCase(), b: ((x.x || '') + ' ' + (x.o || '')).toLowerCase(), raw: (x.x || '') + ' ' + (x.o || '') };
    });
    function snippet(raw, terms) {
      var low = raw.toLowerCase(), pos = -1;
      for (var i = 0; i < terms.length; i++) { pos = low.indexOf(terms[i]); if (pos >= 0) break; }
      if (pos < 0) return escH(raw.slice(0, 80));
      var st = Math.max(0, pos - 24), s = (st > 0 ? '…' : '') + raw.slice(st, st + 90) + (st + 90 < raw.length ? '…' : '');
      var h = escH(s);
      terms.forEach(function (t) { if (!t) return; var re = new RegExp(escH(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); h = h.replace(re, function (m) { return '<em>' + m + '</em>'; }); });
      return h;
    }
    function hl(s, terms) {
      var h = escH(s);
      terms.forEach(function (t) { if (!t) return; var re = new RegExp(escH(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); h = h.replace(re, function (m) { return '<em>' + m + '</em>'; }); });
      return h;
    }
    function run() {
      var active = syncSearchScope(), raw = q.value.trim(), v = raw.toLowerCase();
      if (!v) { box.hidden = true; box.innerHTML = ''; cur = []; return; }
      if (active) {
        var kn = networkAPI(); cur = kn ? (kn.search(raw) || []) : []; sel = cur.length ? 0 : -1;
        if (!cur.length) { box.innerHTML = '<div class="res-empty">没有找到“' + escH(raw) + '”相关内容</div>'; box.hidden = false; return; }
        box.innerHTML = cur.map(function (x, i) {
          return '<div class="res-item' + (i === sel ? ' sel' : '') + '" role="option" aria-selected="' + (i === sel ? 'true' : 'false') + '" data-i="' + i + '">' +
            '<div class="res-t"><span class="res-k">' + escH(x.kind || '结果') + '</span>' + escH(x.title || '') + '</div>' +
            (x.subtitle ? '<div class="res-s">' + escH(x.subtitle) + '</div>' : '') +
            (x.detail ? '<div class="res-x">' + escH(x.detail) + '</div>' : '') + '</div>';
        }).join('');
        box.hidden = false; return;
      }
      var terms = v.split(/\s+/).filter(Boolean);
      var res = [], sc = scope ? scope() : '';
      idx.forEach(function (r) {
        if (sc && BOOK_OF[r.x.ep] !== sc) return;
        var score = 0;
        for (var i = 0; i < terms.length; i++) {
          var t = terms[i], inT = r.t.indexOf(t) >= 0, inS = r.s.indexOf(t) >= 0, inB = r.b.indexOf(t) >= 0;
          if (!inT && !inS && !inB) return;
          score += (inT ? 10 : 0) + (inS ? 3 : 0) + (inB ? 1 : 0);
        }
        if (r.x.k === 'ep') score += 2;
        res.push({ r: r, score: score });
      });
      res.sort(function (a, b) { return b.score - a.score || EP_ORDER.indexOf(a.r.x.ep) - EP_ORDER.indexOf(b.r.x.ep); });
      cur = res.slice(0, 40); sel = cur.length ? 0 : -1;
      if (!cur.length) { box.innerHTML = '<div class="res-empty">没有找到“' + escH(q.value) + '”相关内容</div>'; box.hidden = false; return; }
      var kinds = { ep: '期', pt: '考点', rv: '速查' };
      box.innerHTML = cur.map(function (o, i) {
        var x = o.r.x;
        return '<a class="res-item' + (i === sel ? ' sel' : '') + '" role="option" data-i="' + i + '" href="' + escH(hrefFor(x)) + '">' +
          '<div class="res-t"><span class="res-k">' + kinds[x.k] + '</span>' + hl(x.t, terms) + '</div>' +
          '<div class="res-s">' + hl(x.s, terms) + '</div>' +
          '<div class="res-x">' + snippet(o.r.raw, terms) + '</div></a>';
      }).join('') + (res.length > 40 ? '<div class="res-more">共 ' + res.length + ' 条，仅显示前 40 条；可再输入关键词缩小范围</div>' : '');
      box.hidden = false;
    }
    function hrefFor(x) {
      if (MODE === 'shell') return '#/' + x.ep + (x.a ? '/' + x.a : '');
      var e = EPS[x.ep]; return ROOT + e.file + (x.a ? '#' + x.a : '');
    }
    function choose(i) {
      if (syncSearchScope()) {
        var kn = networkAPI(); if (!kn) return;
        box.hidden = true; q.blur(); kn.chooseSearch(i); return;
      }
      var o = cur[i]; if (!o) return; box.hidden = true; q.blur(); go(o.r.x, hrefFor(o.r.x));
    }
    function mark() { $$('.res-item', box).forEach(function (a, i) { a.classList.toggle('sel', i === sel); a.setAttribute('aria-selected', i === sel ? 'true' : 'false'); if (i === sel) a.scrollIntoView({ block: 'nearest' }); }); }
    on(q, 'input', run);
    on(q, 'focus', function () { syncSearchScope(); if (q.value.trim()) run(); });
    on(q, 'keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); if (cur.length) { sel = (sel + 1) % cur.length; mark(); } }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (cur.length) { sel = (sel - 1 + cur.length) % cur.length; mark(); } }
      else if (ev.key === 'Enter') { ev.preventDefault(); choose(sel < 0 ? 0 : sel); }
      else if (ev.key === 'Escape') { box.hidden = true; q.blur(); }
    });
    on(box, 'click', function (ev) { var a = ev.target.closest('.res-item'); if (!a) return; ev.preventDefault(); choose(+a.getAttribute('data-i')); });
    on(D, 'click', function (ev) { if (!ev.target.closest('.search')) box.hidden = true; });
    focusSearch = function () { setSearchOpen(true); if (window.innerWidth < 900) D.body.classList.remove('nav-open'); };
  }
  var focusSearch = function () {}, topLayoutHook = null, searchLayoutHook = null, searchScopeHook = null;
  /* ---------- 键盘快捷键：空格 播放/暂停；小键盘 4/6 与 ←/→ 上一句/下一句 ---------- */
  function isTyping(ev) {
    var t = ev.target;
    if (!t || t.nodeType !== 1) t = D.activeElement;
    if (!t || t.nodeType !== 1) return false;
    var tag = t.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag === 'INPUT') {
      var ty = (t.type || 'text').toLowerCase();
      return ['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'image', 'file'].indexOf(ty) < 0;
    }
    return !!t.isContentEditable;
  }
  function keyAction(ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.shiftKey) return null;
    var c = ev.code, k = ev.key;
    if (c === 'Space' || k === ' ' || k === 'Spacebar') return 'toggle';
    if (c === 'Numpad4' || k === 'ArrowLeft') return 'prev';   // NumLock 关闭时小键盘 4 的 key 也是 ArrowLeft
    if (c === 'Numpad6' || k === 'ArrowRight') return 'next';
    return null;
  }
  // api: { active(): 是否接管按键, toggle(), step(dir) }
  function installKeys(api) {
    var swallowUp = false;
    on(D, 'keydown', function (ev) {
      if (ev.defaultPrevented || isTyping(ev)) return;
      var act = keyAction(ev);
      if (!act || !api.active()) return;
      ev.preventDefault();                       // 空格不再滚动页面；焦点在按钮上时也不再触发该按钮
      if (ev.repeat) { return; }
      if (act === 'toggle') { swallowUp = true; api.toggle(); }
      else api.step(act === 'next' ? 1 : -1);
    });
    on(D, 'keyup', function (ev) {              // 空格在按钮上是 keyup 触发 click，需一并拦截
      if (swallowUp && (ev.code === 'Space' || ev.key === ' ')) { ev.preventDefault(); swallowUp = false; }
    });
  }
  function isSearchKey(ev) {
    var shortcut = (ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key === 'k' || ev.key === 'K');
    var kn = window.TreetopKN;
    var networkSlash = ev.key === '/' && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.shiftKey && !isTyping(ev) && !!(kn && typeof kn.searchActive === 'function' && kn.searchActive());
    return shortcut || networkSlash;
  }

  /* =====================================================================
   * 内容页
   * ===================================================================== */
  function initPage() {
    var sections = $$('.intro, .point, .review');
    var player = null;
    var lastActive = '';

    // 高亮当前句；scroll=true 时滚动到可见
    function highlight(id, scroll) {
      $$('.is-playing').forEach(function (x) { x.classList.remove('is-playing'); });
      lastActive = id || '';
      if (!id) return;
      var targets = $$('[data-lines~="' + id + '"]');
      var li = D.getElementById(id);
      // 段落优先；“视频原话”展开时额外高亮原句
      var main = targets.filter(function (x) { return x.matches('.para, .para-table, .tip, .quiz-item'); });
      if (!main.length) main = targets.filter(function (x) { return x.matches('.intro, .review'); });
      main.forEach(function (x) { x.classList.add('is-playing'); });
      if (li && li.tagName === 'LI') li.classList.add('is-playing');
      if (!scroll) return;
      var openLi = li && li.closest('details[open]') ? li : null;
      var el = openLi || main[0] || li;
      if (!el) return;
      var bottomPad = EMBED ? 24 : 90, topPad = EMBED ? 12 : 70;
      function outOfView() {
        var r = el.getBoundingClientRect(), vh = window.innerHeight;
        return (r.top < topPad || r.bottom > vh - bottomPad) ? r : null;
      }
      var r0 = outOfView();
      if (r0) el.scrollIntoView({ block: r0.height > window.innerHeight * 0.6 ? 'start' : 'center', behavior: 'smooth' });
      // 平滑滚动期间若有字体/图片加载造成布局变化，结束后复核一次
      clearTimeout(highlight.t);
      highlight.t = setTimeout(function () {
        if (lastActive !== id) return;
        var r1 = outOfView();
        if (r1) el.scrollIntoView({ block: r1.height > window.innerHeight * 0.6 ? 'start' : 'center', behavior: 'auto' });
      }, 900);
    }

    // 跳转到锚点（考点 pN、review、intro 或某句旁白 id）
    function gotoAnchor(a, smooth) {
      if (!a) { window.scrollTo(0, 0); return; }
      var el = D.getElementById(a); if (!el) return;
      var target = el;
      if (el.tagName === 'LI' && el.closest('.orig')) {
        var para = $('.para[data-lines~="' + a + '"], .para-table[data-lines~="' + a + '"], .tip[data-lines~="' + a + '"], .quiz-item[data-lines~="' + a + '"]');
        if (para) target = para; else el.closest('details').open = true;
      }
      target.scrollIntoView({ block: target === el && !el.matches('li') ? 'start' : 'center', behavior: smooth ? 'smooth' : 'auto' });
      if (target !== el || el.tagName === 'LI') { target.classList.remove('flash'); void target.offsetWidth; target.classList.add('flash'); }
    }

    // 滚动侦测：当前阅读的考点
    var spyA = null;
    function spy() {
      var y = (EMBED ? 40 : 90), curA = '';
      for (var i = 0; i < sections.length; i++) { if (sections[i].getBoundingClientRect().top <= y + 20) curA = sections[i].id; }
      if (curA === 'intro') curA = '';
      if (curA === spyA) return; spyA = curA;
      if (EMBED) post(window.parent, { t: 'spy', ep: EP, a: curA });
      else setNav(EP, curA, 'read');
    }
    var spyT = 0;
    on(window, 'scroll', function () { if (spyT) return; spyT = setTimeout(function () { spyT = 0; spy(); }, 120); }, { passive: true });

    // 播放按钮
    on(D, 'click', function (ev) {
      var b = ev.target.closest('[data-play]');
      if (b) {
        ev.preventDefault();
        var id = b.getAttribute('data-play');
        if (EMBED) post(window.parent, { t: 'play', ep: EP, id: id });
        else if (player) { var k = player.indexOf(EP, id); if (k >= 0) player.playAt(k); }
        return;
      }
      // 嵌入时，站内跨页链接交给外壳路由，避免外壳刷新、音频中断
      var a = ev.target.closest('a[data-route]');
      if (a && EMBED && a.getAttribute('data-route')) {
        ev.preventDefault();
        post(window.parent, { t: 'nav', route: a.getAttribute('data-route') });
      }
    });

    // 易错速查
    $$('.quiz-item').forEach(function (it) {
      $$('.quiz-btns button', it).forEach(function (btn) {
        on(btn, 'click', function () { answer(it, btn.getAttribute('data-ans')); });
      });
    });
    function answer(it, ans) {
      var ok = it.getAttribute('data-ok');
      $$('.quiz-btns button', it).forEach(function (x) {
        x.classList.remove('right', 'wrong');
        if (x.getAttribute('data-ans') === ok) x.classList.add('right');
        else if (ans !== null && x.getAttribute('data-ans') === ans) x.classList.add('wrong');
      });
      it.classList.toggle('ans-ok', ans === ok); it.classList.toggle('ans-bad', ans !== null && ans !== ok);
      var fb = $('.quiz-fb', it); fb.hidden = false;
      var tag = fb.querySelector('.res-tag'); if (tag) tag.remove();
      if (ans !== null) fb.insertAdjacentHTML('afterbegin', '<span class="res-tag">' + (ans === ok ? '✓ 答对了' : '✗ 答错了') + '</span>');
    }
    on($('#quizAll'), 'click', function () { $$('.quiz-item').forEach(function (it) { answer(it, null); }); });
    on($('#quizReset'), 'click', function () {
      $$('.quiz-item').forEach(function (it) {
        it.classList.remove('ans-ok', 'ans-bad'); $('.quiz-fb', it).hidden = true;
        var tag = $('.quiz-fb .res-tag', it); if (tag) tag.remove();
        $$('.quiz-btns button', it).forEach(function (x) { x.classList.remove('right', 'wrong'); });
      });
    });

    on(D, 'keydown', function (ev) {
      if (isSearchKey(ev)) { ev.preventDefault(); if (EMBED) post(window.parent, { t: 'key', k: 'search' }); else focusSearch(); }
    });

    // 键盘快捷键：嵌入时转发给外壳（由外壳控制播放，跨期继续），独立打开时控制自带播放器
    installKeys({
      active: function () { return EMBED || !!player; },
      toggle: function () { if (EMBED) post(window.parent, { t: 'key', k: 'toggle' }); else player.toggle(); },
      step: function (d) { if (EMBED) post(window.parent, { t: 'key', k: d > 0 ? 'next' : 'prev' }); else player.stepKey(d); }
    });

    if (EMBED) {
      on(window, 'message', function (ev) {
        var m = ev.data; if (!m || m.src !== MSG || ev.source !== window.parent) return;
        if (m.t === 'active') { if (!m.ep || m.ep === EP) highlight(m.id, m.scroll !== false); }
        else if (m.t === 'clear') highlight('', false);
        else if (m.t === 'goto') gotoAnchor(m.a, m.smooth);
        else if (m.t === 'theme') H.setAttribute('data-theme', m.v === 'dark' ? 'dark' : 'light');
      });
      post(window.parent, { t: 'ready', ep: EP, hash: location.hash.slice(1) });
      setTimeout(spy, 300);
      return;
    }

    // ---- 独立打开 ----
    initSidebar();
    initSearch(function (x, href) {
      if (x.ep === EP) { history.replaceState(null, '', '#' + (x.a || '')); gotoAnchor(x.a, true); setNav(EP, x.a, 'read'); }
      else location.href = href;
    }, function () { return BOOK_OF[EP] || ''; });
    if (EP) {
      var items = PL.filter(function (x) { return x.ep === EP; });
      player = new Player(items, ROOT, {
        onLine: function (it) { highlight(it.id, true); setNav(EP, it.a === 'intro' ? '' : it.a, 'play'); },
        onEnd: function () { highlight('', false); setNav('', '', 'play'); }
      });
      bindPlayerUI(player, 'ep');
    } else {
      // 使用方法等非期页面：播放器提示连播入口
      var sub = $('#plSub'); if (sub) sub.textContent = '在总索引或各期页面中点击 ▶ 开始播放';
      ['#plPlay', '#plPrev', '#plNext'].forEach(function (s) { var b = $(s); if (b) b.disabled = true; });
    }
    setNav(EP, '', 'read');
    if (EP) revealNav(EP);
    var h = decodeURIComponent(location.hash.slice(1));
    if (h) setTimeout(function () { gotoAnchor(h, false); }, 30);
    on(window, 'hashchange', function () { gotoAnchor(decodeURIComponent(location.hash.slice(1)), true); });
    spy();
  }

  /* =====================================================================
   * 外壳（index.html）
   * ===================================================================== */
  function initShell() {
    syncHomeStats();
    var frame = $('#frame'), home = $('#home'), topTitle = $('#topTitle'), playerBox = $('#player');
    var frameEp = '', frameKind = '', frameReady = false, pendingGoto = null;
    // 当前显示的是哪一层：'home'（总索引/本册目录）、'frame'（讲义或使用说明）、'map'（思维导图，见 knowledge-network.js）
    var view = 'home';
    var KN = window.TreetopKN && typeof window.TreetopKN.init === 'function' ? window.TreetopKN : null;
    var follow = true; // 跨期续播时，若正文停留在刚播完的那一期，则跟随翻页
    themeHook = function (v) { if (frame && frame.contentWindow) post(frame.contentWindow, { t: 'theme', v: v }); };

    var curBook = '';   // 当前册：决定侧栏分组、搜索范围、播放清单
    var player = new Player([], '', {
      onLine: function (it, k, prev) {
        setNav(it.ep, it.a === 'intro' ? '' : it.a, 'play');
        markHomeRow(it.ep);
        if (frameEp === it.ep && frameReady) post(frame.contentWindow, { t: 'active', ep: it.ep, id: it.id, scroll: true });
        else if (prev && prev.ep !== it.ep && follow && view === 'frame' && frameKind === 'ep' && frameEp === prev.ep) {
          location.hash = '#/' + it.ep; // 跟随到下一期；就绪后再发送高亮
        }
      },
      onEnd: function () { setNav('', '', 'play'); markHomeRow(''); if (frameReady) post(frame.contentWindow, { t: 'clear' }); }
    });
    player.book = '';
    // 播放清单只含一册：在另一册开始播放时才切换（正在播的册不受浏览其他册影响）
    function usePlaylist(key) {
      if (!key || !PL_BY[key] || player.book === key) return;
      clearTimeout(player.gapTimer);
      player.audio.pause();
      player.items = PL_BY[key]; player.book = key; player.i = -1;
      player.emit();
    }
    function playEp(ep, id) {
      usePlaylist(BOOK_OF[ep]);
      var k = id ? player.indexOf(ep, id) : player.items.findIndex(function (x) { return x.ep === ep; });
      if (k >= 0) player.playAt(k);
    }
    player.startIndex = function () {
      // 播放器“播放”键（未开始时）：正文显示某期时从该期开头，否则从当前册（总索引时为第一册）第一期
      var ep = view === 'frame' && frameKind === 'ep' && frameEp ? frameEp : '';
      usePlaylist(ep ? BOOK_OF[ep] : (curBook || SITE.books[0].key));
      if (ep) { var k = player.items.findIndex(function (x) { return x.ep === ep; }); if (k >= 0) return k; }
      return 0;
    };
    bindPlayerUI(player, 'all', function (it) {
      // 播放栏快速跳转：同册直接定位；跨期先换页，语音紧随其后
      usePlaylist(BOOK_OF[it.ep]);
      var k = player.indexOf(it.ep, it.id); if (k < 0) return;
      if (view === 'frame' && frameKind === 'ep' && frameEp === it.ep) player.playAt(k);
      else { location.hash = '#/' + it.ep + (it.a && it.a !== 'intro' ? '/' + it.a : ''); player.playAt(k); }
    });
    initSidebar();
    initSearch(function (x) {
      var r = '#/' + x.ep + (x.a ? '/' + x.a : '');
      if (location.hash === r) route(); else location.hash = r;
    }, function () { return curBook; });

    // 切换当前册：侧栏只显示该册一组（'' 为五册总索引组），品牌副标题随之变化
    var brandSub = $('.brand-sub'), brandSub0 = brandSub ? brandSub.textContent : '';
    function setBook(key) {
      curBook = BOOK_BY[key] ? key : '';
      $$('.nav-group[data-book]').forEach(function (g) { g.hidden = g.getAttribute('data-book') !== curBook; });
      if (brandSub) brandSub.textContent = curBook ? BOOK_BY[curBook].full : brandSub0;
    }

    function markHomeRow(ep) { $$('.ep-table tr[data-ep]').forEach(function (tr) { tr.classList.toggle('playing-row', tr.getAttribute('data-ep') === ep); }); }

    /* Windows 路径式面包屑：根图标与当前位置保留，空间不足时从左侧省略中间路径。 */
    function compressTopTitle() {
      var units = $$('[data-crumb]', topTitle), ellipsis = $('[data-crumb-ellipsis]', topTitle);
      if (!units.length || !ellipsis || !topTitle.clientWidth) return;
      units.forEach(function (u) { u.hidden = false; }); units[units.length - 1].style.flex = 'none'; ellipsis.hidden = true;
      var i = 0;
      while (topTitle.scrollWidth > topTitle.clientWidth && i < units.length - 1) {
        units[i].hidden = true; ellipsis.hidden = false; i++;
      }
      if (topTitle.scrollWidth > topTitle.clientWidth) units[units.length - 1].style.flex = '0 1 auto';
    }
    topLayoutHook = function () {
      if (searchLayoutHook) searchLayoutHook();
      compressTopTitle();
    };
    on(window, 'resize', topLayoutHook);
    function setTopCrumbs(items) {
      var root = '<a class="top-crumb-home" href="#/" aria-label="树梢文档，返回总索引" title="树梢文档 · 总索引">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a3 3 0 01-3-3V6a3 3 0 013-3z"/><path d="M7 3a3 3 0 00-3 3v12a3 3 0 013-3h12M9 8h6M9 12h6"/></svg></a>';
      var parentHref = '#/';
      for (var i = items.length - 2; i >= 0; i--) { if (items[i].h) { parentHref = items[i].h; break; } }
      var ellipsis = '<span class="top-crumb-unit" data-crumb-ellipsis hidden><span class="top-crumb-sep" aria-hidden="true">›</span><a class="top-crumb-ellipsis" href="' + escH(parentHref) + '" aria-label="返回上一级目录" title="返回上一级目录">…</a></span>';
      topTitle.innerHTML = root + ellipsis + items.map(function (it) {
        var label = escH(it.t), body = it.h ? '<a class="top-crumb" href="' + escH(it.h) + '">' + label + '</a>' : '<span class="top-crumb" aria-current="location">' + label + '</span>';
        return '<span class="top-crumb-unit" data-crumb><span class="top-crumb-sep" aria-hidden="true">›</span>' + body + '</span>';
      }).join('');
      topTitle.setAttribute('role', 'navigation'); topTitle.setAttribute('aria-label', '当前位置');
      topTitle.title = ['树梢文档'].concat(items.map(function (it) { return it.t; })).join(' / ');
      if (topLayoutHook) { topLayoutHook(); requestAnimationFrame(topLayoutHook); }
    }

    // key 为 '' 时是五册总索引，否则是该册的本册目录（chId 定位到章）
    function showHome(key, chId) {
      setBook(key);
      if (KN) KN.hide();
      frame.hidden = true; home.hidden = false; frameKind = ''; view = 'home';
      $$('.home-inner[data-home]').forEach(function (x) { x.hidden = x.getAttribute('data-home') !== curBook; });
      if (curBook) {
        var crumbs = [{ t: BOOK_BY[curBook].full, h: '#/' + curBook }];
        if (chId && CH_BY[chId]) crumbs.push({ t: '第' + CH_BY[chId].n + '章 · ' + CH_BY[chId].title });
        else crumbs.push({ t: '本册目录' });
        setTopCrumbs(crumbs);
        D.title = BOOK_BY[curBook].full + ' · ' + SITE.title;
      } else {
        setTopCrumbs([{ t: '总索引' }]);
        D.title = '总索引 · ' + SITE.title;
      }
      setNav('', '', 'read'); markSpecial(curBook ? 'book' : 'home');
      if (chId) { var el = D.getElementById(chId); if (el) el.scrollIntoView({ block: 'start' }); }
      else home.scrollTop = 0;
    }
    function markSpecial(s) { $$('.nav-link[data-special]').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-special') === s); }); }
    function loadFrame(file, kind, ep, anchor) {
      if (KN) KN.hide();
      home.hidden = true; frame.hidden = false; view = 'frame';
      if (frameKind === kind && frameEp === ep && frameReady) {
        post(frame.contentWindow, { t: 'goto', a: anchor || '', smooth: true });
      } else {
        frameReady = false; frameKind = kind; frameEp = ep; pendingGoto = anchor || '';
        // 用 replace 避免 iframe 历史干扰外壳的前进/后退
        try { frame.contentWindow.location.replace(file); } catch (e) { frame.src = file; }
      }
    }
    // 思维导图：#/map/<范围>/<逻辑>/<焦点>；网络页显示时 iframe 保留但隐藏，播放不中断
    function showMap(args) {
      var r = KN.show(args);
      setBook(r.book);
      home.hidden = true; frame.hidden = true; view = 'map';
      var titles = r.title.split(' · '), crumbs = [];
      if (r.book) crumbs.push({ t: BOOK_BY[r.book].full, h: '#/' + r.book });
      crumbs.push({ t: r.book ? '思维导图' : '学科思维导图', h: titles.length > 2 ? '#/map/' + (r.book || 'bio') : '' });
      if (titles.length > 2) crumbs.push({ t: titles.slice(2).join(' · ') });
      setTopCrumbs(crumbs);
      D.title = r.title + ' · ' + SITE.title;
      setNav('', '', 'read'); markSpecial('map');
    }
    /* 播放器只属于具体讲义；目录、使用说明和思维导图不显示，也不保留底部占位。 */
    function syncPlayerVisibility() {
      var lecture = view === 'frame' && frameKind === 'ep';
      playerBox.hidden = !lecture;
      D.body.classList.toggle('no-player', !lecture);
      if (!lecture) player.stop(); /* 底栏消失后无法操作播放，随即停止声音 */
    }
    function route() {
      routeView();
      if (searchScopeHook) searchScopeHook();
      syncPlayerVisibility();
      if (KN) KN.onView({ view: view, ep: view === 'frame' && frameKind === 'ep' ? frameEp : '', book: curBook });
    }
    function routeView() {
      var raw = location.hash.replace(/^#\/?/, ''), h;
      try { h = decodeURIComponent(raw); } catch (e) { h = raw; }
      var parts = h.split('/');
      var head = parts[0] || '', anchor = parts.slice(1).join('/');
      if (head === 'map') {
        if (KN) { showMap(raw.split('/').slice(1).join('/')); return; }
        showHome('', ''); return;
      }
      if (!head) { showHome('', ''); return; }
      if (BOOK_BY[head]) { showHome(head, ''); return; }
      if (CH_BY_ID[head]) { showHome(BOOK_OF[head], head); return; }
      if (head === 'guide') {
        loadFrame(SITE.guide, 'guide', '', anchor);
        setTopCrumbs([{ t: '使用方法' }]); D.title = '使用方法 · ' + SITE.title;
        setNav('', '', 'read'); markSpecial('guide');
        return;
      }
      var e = EPS[head];
      if (!e) { showHome('', ''); return; }
      setBook(BOOK_OF[head]);
      markSpecial('');
      loadFrame(e.file, 'ep', head, anchor);
      setTopCrumbs([
        { t: e.book.full, h: '#/' + e.book.key },
        { t: '第' + e.ch.n + '章 · ' + e.ch.title, h: '#/' + e.ch.id },
        { t: e.code + ' ' + e.sec + ' ' + e.full }
      ]);
      D.title = e.code + ' ' + e.full + ' · ' + SITE.title;
      setNav(head, /^p\d+$|^review$/.test(anchor) ? anchor : '', 'read');
      revealNav(head);
    }
    var CH_BY_ID = {};
    SITE.books.forEach(function (b) { b.chapters.forEach(function (c) { CH_BY_ID[c.id] = c; }); });

    on(window, 'message', function (ev) {
      var m = ev.data; if (!m || m.src !== MSG || ev.source !== frame.contentWindow) return;
      if (m.t === 'ready') {
        frameReady = true;
        post(frame.contentWindow, { t: 'theme', v: themeNow() });
        if (m.ep && m.ep !== frameEp) { frameEp = m.ep; frameKind = 'ep'; }
        var it = player.cur();
        if (pendingGoto) post(frame.contentWindow, { t: 'goto', a: pendingGoto, smooth: false });
        if (it && it.ep === frameEp) post(frame.contentWindow, { t: 'active', ep: it.ep, id: it.id, scroll: !pendingGoto });
        pendingGoto = null;
      } else if (m.t === 'play') {
        playEp(m.ep, m.id);
      } else if (m.t === 'nav') {
        if (location.hash === m.route || (m.route === '#/' && !location.hash)) route(); else location.hash = m.route;
      } else if (m.t === 'spy') {
        // 只在正文可见时采纳：网络页或总索引显示期间，隐藏 iframe 迟到的滚动消息不得改写地址
        if (m.ep && m.ep === frameEp && view === 'frame') {
          setNav(m.ep, m.a, 'read');
          var want = '#/' + m.ep + (m.a ? '/' + m.a : '');
          // 保留 history.state（思维导图的返回凭据记在这里）
          if (location.hash !== want) history.replaceState(history.state, '', want);
        }
      } else if (m.t === 'key') {
        if (m.k === 'search') focusSearch();
        else if (m.k === 'toggle') player.toggle();
        else if (m.k === 'next') player.stepKey(1);
        else if (m.k === 'prev') player.stepKey(-1);
      }
    });

    // 总索引 / 本册目录中的“从本期开始连播”（切换到该期所在册的播放清单）
    on(D, 'click', function (ev) {
      var b = ev.target.closest('[data-play-ep]'); if (!b) return;
      ev.preventDefault();
      playEp(b.getAttribute('data-play-ep'));
    });
    // 点击与当前哈希相同的路由链接时（滚动侦测用 replaceState 改过哈希），hashchange 不会触发，手动路由
    on(D, 'click', function (ev) {
      var a = ev.target.closest('a[href^="#/"]'); if (!a || ev.defaultPrevented) return;
      if (a.classList.contains('top-crumb-ellipsis')) {
        ev.preventDefault();
        var target = a.getAttribute('href');
        if (target === location.hash) route(); else { location.hash = target; route(); }
        return;
      }
      if (a.getAttribute('href') === location.hash) { ev.preventDefault(); route(); }
    });
    on(D, 'keydown', function (ev) { if (isSearchKey(ev)) { ev.preventDefault(); focusSearch(); } });
    installKeys({ active: function () { return true; }, toggle: function () { player.toggle(); }, step: function (d) { player.stepKey(d); } });
    if (KN) {
      try {
        if (!KN.init({
          route: route,
          current: function () { return { view: view, ep: view === 'frame' && frameKind === 'ep' ? frameEp : '', a: navState.ep === frameEp ? navState.a : '', book: curBook }; }
        })) KN = null;
      } catch (e) { KN = null; if (window.console) console.error('[思维导图] 初始化失败，原站功能不受影响：', e); }
    }
    on(window, 'hashchange', route);
    route();
  }

  if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function (f) { for (var i = 0; i < this.length; i++) if (f(this[i], i)) return i; return -1; };
  }
  if (!Element.prototype.closest) {
    Element.prototype.closest = function (s) { var el = this; while (el && el.nodeType === 1) { if (el.matches(s)) return el; el = el.parentNode; } return null; };
  }
  if (!Element.prototype.matches) Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;

  initTheme();
  if (MODE === 'shell') initShell(); else initPage();

  // 供自动化测试读取
  window.__bio = { mode: MODE, embed: EMBED, ep: EP, book: BOOK_OF[EP] || '' };
})();
