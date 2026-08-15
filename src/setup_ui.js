/* ============================================================
   セットアップ画面
   ============================================================ */

function setupHTML(p){
  p = p || {stays:[{}]};
  const s = p.stays && p.stays.length ? p.stays : [{}];
  const fld = (l,id,ph,val,type) =>
    `<div class="f"><label for="${id}">${l}</label>
     <input type="${type||'text'}" id="${id}" placeholder="${ph||''}"
       value="${val==null?'':String(val).replace(/"/g,'&quot;')}"
       autocomplete="off" ${type==='time'?'':'inputmode="text"'}></div>`;

  return `
  <div class="su-wrap">
    <div class="su-head">
      <div class="su-kicker">SF 2026</div>
      <h1>旅のしおり</h1>
      <p>自分の予定を入れると、到着日の動きを逆算してタイムラインを組みます。
      会場マップやイベント情報は最初から入っています。</p>
      <div class="su-priv">入力した内容はこの端末の中だけに保存されます。
      どこにも送信されません。</div>
    </div>

    <div class="su-sec">
      <h2>着く便</h2>
      <div class="row">
        ${fld('日付','a_date','','2026-08-26','date')}
        ${fld('SFO 到着','a_time','','10:05','time')}
      </div>
      ${fld('便名（任意）','a_flight','例）NH008', p.arrive&&p.arrive.flight)}
    </div>

    <div class="su-sec">
      <h2>帰る便</h2>
      <div class="row">
        ${fld('日付','d_date','','2026-09-02','date')}
        ${fld('SFO 出発','d_time','','12:25','time')}
      </div>
      ${fld('便名（任意）','d_flight','例）NH007', p.depart&&p.depart.flight)}
    </div>

    <div class="su-sec">
      <h2>泊まるところ</h2>
      <p class="hint">途中で移るなら「宿を追加」を押してください。日付で自動的に切り替わります。</p>
      <div id="stays">${s.map((x,i)=>stayBlock(x,i)).join('')}</div>
      <button class="su-add" id="addStay">＋ 宿を追加</button>
    </div>

    <div class="su-sec">
      <h2>バッジ受け取り</h2>
      <p class="hint">予約した枠を入れると、そこを基準点にして出発時刻を逆算します。
      まだ決まっていなければ空のままで大丈夫です。</p>
      <div class="row">
        ${fld('日付','b_date','','2026-08-26','date')}
        ${fld('時刻','b_time','','','time')}
      </div>
    </div>

    <div class="su-foot">
      <button class="su-go" id="suSave">これで始める</button>
      <p class="hint" style="text-align:center;margin-top:12px">
      あとから「準備」タブでいつでも直せます。</p>
    </div>

    <div class="su-legal">
      ファンが個人的に作ったものです。株式会社ポケモン等とは関係ありません。<br>
      イベント情報は変わることがあります。最終的な確認は公式サイトでお願いします。
    </div>
  </div>`;
}

function stayBlock(x, i){
  x = x || {};
  const v = k => x[k]==null ? '' : String(x[k]).replace(/"/g,'&quot;');
  return `<div class="stay" data-i="${i}">
    <div class="stay-h">宿 ${i+1}${i?`<button class="su-del" data-del="${i}">削除</button>`:''}</div>
    <div class="f"><label>名前</label>
      <input type="text" data-k="name" placeholder="例）Hotel Zetta" value="${v('name')}"></div>
    <div class="f"><label>住所（任意）</label>
      <input type="text" data-k="addr" placeholder="例）55 5th St" value="${v('addr')}"></div>
    <div class="row">
      <div class="f"><label>この宿に入る日</label>
        <input type="date" data-k="from" value="${v('from')}"></div>
      <div class="f"><label>出る日</label>
        <input type="date" data-k="to" value="${v('to')}"></div>
    </div>
    <div class="f walkf">
      <label>Moscone まで徒歩</label>
      <div class="walkrow">
        <input type="number" data-k="walk" min="1" max="90" placeholder="10" value="${v('walk')}">
        <span class="unit">分</span>
        <button class="su-look" data-look="${i}">調べる</button>
      </div>
      <p class="hint">Googleマップが開きます。出てきた分数を入れてください。分からなければ空でOK（10分として計算します）。</p>
    </div>
    <div class="f"><label>予約番号（任意）</label>
      <input type="text" data-k="code" placeholder="控えておきたければ" value="${v('code')}"></div>
  </div>`;
}

function readSetup(){
  const g = id => (document.getElementById(id)||{}).value || '';
  const stays = [...document.querySelectorAll('#stays .stay')].map(el=>{
    const o={};
    el.querySelectorAll('[data-k]').forEach(inp=>{
      const v=inp.value.trim(); if(v) o[inp.dataset.k]=v;
    });
    return o;
  }).filter(o=>o.name);

  return {
    arrive:{date:g('a_date'), time:g('a_time'), flight:g('a_flight').trim()},
    depart:{date:g('d_date'), time:g('d_time'), flight:g('d_flight').trim()},
    stays: stays.length ? stays : [{name:'宿', walk:10}],
    badge: g('b_time') ? {date:g('b_date'), time:g('b_time')} : null,
    extras: (PROF && PROF.extras) || [],
    plans : (PROF && PROF.plans)  || []    // 自分で足した予定は消さない
  };
}

function validate(p){
  const e=[];
  if(!p.arrive.date || !p.arrive.time) e.push('着く便の日付と時刻を入れてください');
  if(!p.depart.date || !p.depart.time) e.push('帰る便の日付と時刻を入れてください');
  if(p.arrive.date && p.depart.date && p.depart.date < p.arrive.date)
    e.push('帰る日が着く日より前になっています');
  if(!p.stays.length || !p.stays[0].name) e.push('宿の名前を入れてください');
  if(p.badge && p.badge.time && p.badge.date < p.arrive.date)
    e.push('バッジ受け取りが到着日より前になっています');
  return e;
}

function openSetup(existing){
  const el=document.getElementById('setup');
  el.innerHTML=setupHTML(existing||PROF);
  el.classList.add('on');
  document.body.style.overflow='hidden';
  wireSetup();
}
function closeSetup(){
  const el=document.getElementById('setup');
  el.classList.remove('on'); el.innerHTML='';
  document.body.style.overflow='';
}

function wireSetup(){
  const el=document.getElementById('setup');

  el.querySelector('#addStay').onclick=()=>{
    const box=el.querySelector('#stays');
    const i=box.children.length;
    box.insertAdjacentHTML('beforeend', stayBlock({}, i));
    wireStays();
    box.lastElementChild.scrollIntoView({behavior:'smooth',block:'center'});
  };

  function wireStays(){
    el.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
      b.closest('.stay').remove();
      [...el.querySelectorAll('#stays .stay')].forEach((s,i)=>{
        s.dataset.i=i;
        s.querySelector('.stay-h').firstChild.textContent=`宿 ${i+1}`;
      });
    });
    el.querySelectorAll('[data-look]').forEach(b=>b.onclick=()=>{
      const st=b.closest('.stay');
      const nm=st.querySelector('[data-k="name"]').value.trim()
            || st.querySelector('[data-k="addr"]').value.trim();
      if(!nm){ toast('先に宿の名前を入れてください'); return; }
      const u=`https://www.google.com/maps/dir/?api=1&origin=${
        encodeURIComponent(nm+' San Francisco')}&destination=${
        encodeURIComponent('Moscone Center San Francisco')}&travelmode=walking`;
      window.open(u,'_blank','noopener');
    });
  }
  wireStays();

  el.querySelector('#suSave').onclick=()=>{
    const p=readSetup();
    const errs=validate(p);
    if(errs.length){ toast(errs[0]); return; }
    PROF=p; saveProfile();
    applyProfile();
    curDate=TRIP.days[0].date;
    renderDtabs(); renderDay(); renderPlan(); renderInfo(); renderPrep();
    closeSetup(); go('day'); window.scrollTo(0,0);
    toast('タイムラインを作りました');
  };
}

/* ============================================================
   予定の追加・編集（セットアップ画面を通さずに単体で足せるようにする）
   ============================================================ */

const PLAN_ICONS = ['📌','🎫','🛍','🍽','🚕','📺'];
let planIdx = null;          // 編集中の index。新規は null

const MAP_LABEL = {overview:'キャンパス全体', ground:'Ground', lower:'Lower', ybg:'Yerba Buena'};
const spotKey = s => s ? `${s.m}|${s.x}|${s.y}|${s.name}` : '';

/* 会場ピンを地図ごとにまとめた <select> の中身。同名ピン（Pin Rally等）は1つにする */
function spotOptions(cur){
  const sel = spotKey(cur);
  let h = `<option value="">（紐づけない）</option>`;
  if(typeof PINS === 'undefined') return h;
  Object.keys(PINS).forEach(m=>{
    const seen = {};
    const opts = (PINS[m]||[]).filter(p=>{
      if(seen[p.name]) return false; seen[p.name]=1; return true;
    });
    if(!opts.length) return;
    h += `<optgroup label="${MAP_LABEL[m]||m}">`;
    opts.forEach(p=>{
      const k = spotKey({m, x:p.x, y:p.y, name:p.name});
      h += `<option value="${k.replace(/"/g,'&quot;')}"${k===sel?' selected':''}>${p.name}</option>`;
    });
    h += `</optgroup>`;
  });
  /* 保存済みの値が候補に無い場合も選択状態を保つ */
  if(sel && !h.includes('selected'))
    h += `<option value="${sel.replace(/"/g,'&quot;')}" selected>${cur.name}</option>`;
  return h;
}

function parseSpot(val){
  if(!val) return null;
  const a = String(val).split('|');
  if(a.length < 4) return null;
  return {m:a[0], x:+a[1], y:+a[2], name:a.slice(3).join('|')};
}

function planEditorHTML(p, idx){
  p = p || {};
  const v = k => p[k]==null ? '' : String(p[k]).replace(/"/g,'&quot;');
  const cur = p.icon || PLAN_ICONS[0];
  return `
  <div class="su-wrap">
    <div class="su-head">
      <div class="su-kicker">SF 2026</div>
      <h1>${idx==null ? '予定を追加' : '予定を直す'}</h1>
      <p>入れた予定は「今日」と「日程」のタイムラインに時刻順で並びます。
      バッジ受け取りやポケモンセンターの枠、食事の予約など、なんでもどうぞ。</p>
    </div>

    <div class="su-sec">
      <h2>いつ</h2>
      <div class="row">
        <div class="f"><label for="p_date">日付</label>
          <input type="date" id="p_date" value="${v('date')}"></div>
        <div class="f"><label for="p_time">時刻（任意）</label>
          <input type="time" id="p_time" value="${v('time')}"></div>
      </div>
      <p class="hint">時刻を空にすると、その日のいちばん下にまとめて出します。</p>
    </div>

    <div class="su-sec">
      <h2>なに</h2>
      <div class="f"><label for="p_title">予定の名前</label>
        <input type="text" id="p_title" placeholder="例）ポケモンセンター 予約枠"
          value="${v('title')}" autocomplete="off"></div>
      <div class="f"><label>アイコン</label>
        <div class="icnrow">${PLAN_ICONS.map(i=>
          `<button type="button" class="icn${i===cur?' on':''}" data-icn="${i}">${i}</button>`
        ).join('')}</div></div>
      <div class="f"><label for="p_place">場所（任意）</label>
        <input type="text" id="p_place" placeholder="例）Moscone West"
          value="${v('place')}" autocomplete="off"></div>
      <div class="f"><label for="p_spot">会場マップの場所</label>
        <select id="p_spot">${spotOptions(p.spot)}</select>
        <p class="hint" id="p_spothint">予定の名前がWCS関連なら自動で選びます。
        選んでおくと、その予定から会場マップの該当地点へ飛べます。</p></div>
      <div class="f"><label for="p_note">メモ（任意）</label>
        <input type="text" id="p_note" placeholder="集合場所、持ち物、同行者など"
          value="${v('note')}" autocomplete="off"></div>
      <div class="f"><label for="p_code">予約番号（任意）</label>
        <input type="text" id="p_code" placeholder="入れると「情報」タブの予約にも並びます"
          value="${v('code')}" autocomplete="off"></div>
    </div>

    <div class="su-foot">
      <button class="su-go" id="pSave">${idx==null ? '追加する' : '保存する'}</button>
      ${idx==null ? '' : '<button class="su-danger" id="pDel">この予定を削除</button>'}
      <button class="su-cancel" id="pCancel">やめる</button>
    </div>
  </div>`;
}

/* prefill を渡すと下書き入りで開く（イベントタブの「スケジュールに追加」用） */
function openPlanEditor(idx, prefill){
  planIdx = (idx==null ? null : +idx);
  const init = planIdx==null
    ? Object.assign(
        {date: (typeof curDate!=='undefined' && curDate) || (PROF && PROF.arrive && PROF.arrive.date) || ''},
        prefill||{})
    : (PROF.plans||[])[planIdx];
  const el=document.getElementById('setup');
  el.innerHTML=planEditorHTML(init, planIdx);
  el.classList.add('on');
  document.body.style.overflow='hidden';
  wirePlanEditor();
}

/* 予定を入れ替えたあと、全タブを描き直す */
function refreshAll(){
  applyProfile();
  if(!TRIP.days.some(d=>d.date===curDate)) curDate = TRIP.days[0].date;
  renderDtabs(); renderDay(); renderPlan(); renderInfo(); renderPrep();
  renderXp();   // 行きたいリストの「日程に追加済み」表示を更新するため
}

function wirePlanEditor(){
  const el=document.getElementById('setup');
  let icon = PLAN_ICONS[0];
  const on = el.querySelector('.icn.on'); if(on) icon = on.dataset.icn;
  el.querySelectorAll('[data-icn]').forEach(b=>b.onclick=()=>{
    el.querySelectorAll('[data-icn]').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); icon=b.dataset.icn;
  });

  /* 予定の名前から会場の場所を拾う。
     ユーザーが自分で選び直したあとは上書きしない */
  const title=el.querySelector('#p_title'), place=el.querySelector('#p_place');
  const spotSel=el.querySelector('#p_spot'), hint=el.querySelector('#p_spothint');
  let autoMap = (planIdx==null ? '' : ((PROF.plans||[])[planIdx]||{}).map || '');
  let touched = spotSel.value !== '';        // 既に紐づいているものは自動で動かさない
  spotSel.onchange=()=>{
    touched=true;
    autoMap = spotSel.value ? 'moscone' : '';
    const s0 = parseSpot(spotSel.value);
    if(s0 && !place.value.trim()) place.value = pinLabel(s0.name);
    hint.textContent = s0 ? 'この予定から会場マップへ飛べます。'
                          : '会場マップとの紐づけを外しました。';
  };

  const guess=()=>{
    if(touched) return;
    const r = findSpot(title.value);
    if(!r){ spotSel.value=''; autoMap='';
      hint.textContent='予定の名前がWCS関連なら自動で選びます。'; return; }
    autoMap = r.map || '';
    if(r.spot){
      const k = spotKey(r.spot);
      if([...spotSel.options].some(o=>o.value===k)) spotSel.value=k;
      hint.textContent=`「${pinLabel(r.spot.name)}」を自動で紐づけました。違うときは選び直してください。`;
    } else {
      spotSel.value='';
      hint.textContent=`${r.place} と判定しました。会場マップ外なので道順のリンクだけ付きます。`;
    }
    if(!place.value.trim() && r.place) place.value = r.place;
  };
  title.addEventListener('input', guess);
  if(planIdx==null && title.value) guess();

  el.querySelector('#pCancel').onclick=()=>closeSetup();

  const del = el.querySelector('#pDel');
  if(del) del.onclick=()=>{
    PROF.plans.splice(planIdx,1);
    saveProfile(); refreshAll(); closeSetup();
    toast('予定を削除しました');
  };

  el.querySelector('#pSave').onclick=()=>{
    const g = id => (document.getElementById(id)||{}).value || '';
    const spot = parseSpot(g('p_spot'));
    const p = {date:g('p_date'), time:g('p_time'), icon,
               title:g('p_title').trim(), place:g('p_place').trim(),
               note:g('p_note').trim(), code:g('p_code').trim(),
               spot, map: spot ? 'moscone' : autoMap};
    if(!p.date){ toast('日付を入れてください'); return; }
    if(!p.title){ toast('予定の名前を入れてください'); return; }

    PROF.plans = PROF.plans || [];
    if(planIdx==null) PROF.plans.push(p); else PROF.plans[planIdx]=p;
    PROF.plans.sort((a,b)=>
      (a.date+(a.time||'99:99')) < (b.date+(b.time||'99:99')) ? -1 : 1);

    saveProfile();
    refreshAll();
    curDate = p.date;                 // 入れた予定の日を開いて結果を見せる
    renderDtabs(); renderDay();
    closeSetup(); go('day'); window.scrollTo(0,0);
    toast(planIdx==null ? '予定を追加しました' : '予定を直しました');
  };
}

/* ---------- バッジ枠だけを直す ---------- */
function badgeEditorHTML(){
  const b = (PROF && PROF.badge) || {};
  const v = k => b[k]==null ? '' : String(b[k]).replace(/"/g,'&quot;');
  return `
  <div class="su-wrap">
    <div class="su-head">
      <div class="su-kicker">SF 2026</div>
      <h1>バッジ受け取り</h1>
      <p>予約した枠を入れると、そこを基準点にして宿を出る時刻を逆算します。
      間に合わない時間になっていれば警告を出します。</p>
    </div>
    <div class="su-sec">
      <h2>予約した枠</h2>
      <div class="row">
        <div class="f"><label for="b2_date">日付</label>
          <input type="date" id="b2_date"
            value="${v('date') || (PROF && PROF.arrive ? PROF.arrive.date : '')}"></div>
        <div class="f"><label for="b2_time">時刻</label>
          <input type="time" id="b2_time" value="${v('time')}"></div>
      </div>
      <p class="hint">まだ決まっていなければ空のままで大丈夫です。</p>
    </div>
    <div class="su-foot">
      <button class="su-go" id="bSave">保存する</button>
      ${b.time ? '<button class="su-danger" id="bClear">枠を取り消す</button>' : ''}
      <button class="su-cancel" id="bCancel">やめる</button>
    </div>
  </div>`;
}

function openBadgeEditor(){
  const el=document.getElementById('setup');
  el.innerHTML=badgeEditorHTML();
  el.classList.add('on');
  document.body.style.overflow='hidden';

  el.querySelector('#bCancel').onclick=()=>closeSetup();
  const cl = el.querySelector('#bClear');
  if(cl) cl.onclick=()=>{
    PROF.badge=null; saveProfile(); refreshAll(); closeSetup();
    toast('バッジ枠を取り消しました');
  };
  el.querySelector('#bSave').onclick=()=>{
    const g = id => (document.getElementById(id)||{}).value || '';
    const t=g('b2_time'), d=g('b2_date');
    if(t && !d){ toast('日付を入れてください'); return; }
    if(t && d < PROF.arrive.date){ toast('バッジ受け取りが到着日より前になっています'); return; }
    PROF.badge = t ? {date:d, time:t} : null;
    saveProfile(); refreshAll();
    if(t) curDate = d;
    renderDtabs(); renderDay();
    closeSetup(); go('day'); window.scrollTo(0,0);
    toast(t ? 'バッジ枠を保存しました' : 'バッジ枠を取り消しました');
  };
}

/* 現在地を宿の座標として記録する（任意） */
function pinCurrentStay(idx){
  if(!navigator.geolocation){ toast('この端末では現在地を取れません'); return; }
  toast('現在地を確認しています…');
  navigator.geolocation.getCurrentPosition(pos=>{
    PROF.stays[idx].lat=pos.coords.latitude;
    PROF.stays[idx].lng=pos.coords.longitude;
    saveProfile();
    TRIP.places['stay'+idx]={name:PROF.stays[idx].name, addr:PROF.stays[idx].addr||'',
      lat:pos.coords.latitude, lng:pos.coords.longitude};
    renderPrep();
    toast('宿の位置を記録しました');
  }, ()=>toast('現在地を取れませんでした'), {enableHighAccuracy:true, timeout:15000});
}
