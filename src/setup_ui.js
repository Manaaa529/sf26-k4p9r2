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
    extras: (PROF && PROF.extras) || []
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
