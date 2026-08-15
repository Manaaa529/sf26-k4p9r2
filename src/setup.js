/* ============================================================
   セットアップ & タイムライン自動生成
   個人データは端末の localStorage にのみ保存する
   ============================================================ */

const PK = 'sf2026-profile';
const PROFILE_V = 2;          // 保存データの構造バージョン
let PROF = null;

/* 古い構造で保存されたデータを現行構造に寄せる。
   構造を変えたら PROFILE_V を上げて、下に if(v===N){...v=N+1} を足す。
   配布後に構造を変えても、入力済みの人の画面を壊さないためのもの。 */
function migrateProfile(p){
  if(!p || typeof p !== 'object') return null;
  let v = +p.v || 0;
  if(v === 0){          // v を持たない初期配布分。構造は v1 と同じなので印を付けるだけ
    v = 1;
  }
  if(v === 1){          // v2: 自分で足す予定（plans）を追加
    p.plans = [];
    v = 2;
  }
  p.v = v;
  if(!Array.isArray(p.plans)) p.plans = [];   // 未知の版から来た場合の保険
  return p;             // v > PROFILE_V（新しい版で保存）はそのまま使う。消さない
}

function loadProfile(){
  let was = null;
  try {
    const raw = JSON.parse(localStorage.getItem(PK));
    was = raw && typeof raw === 'object' ? (+raw.v || 0) : null;
    PROF = migrateProfile(raw);
  } catch(e){ PROF = null; }
  if(PROF && was !== null && was < PROFILE_V) saveProfile();   // 移行結果を書き戻す
  return PROF;
}
function saveProfile(){
  try { if(PROF) PROF.v = PROFILE_V; localStorage.setItem(PK, JSON.stringify(PROF)); } catch(e){}
}

/* 所要時間の見積り（分） */
const EST = {
  immigration: [60, 120],   // 入国審査＋荷物
  bartToCity : 30,          // SFO → Powell St
  powellWalk : 7,           // Powell St → 一般的な宿
  badgeQueue : [20, 40],    // バッジ受け取りの列
  westToPC   : 4,           // Registration Hall → Pokémon Center
  airportLead: 180          // 国際線は3時間前
};

const pad = n => String(n).padStart(2,'0');
const hhmm = m => `${pad(Math.floor(((m%1440)+1440)%1440/60))}:${pad(((m%60)+60)%60)}`;
const mins = t => { const [a,b]=String(t).split(':').map(Number); return a*60+(b||0); };

/* 宿を日付から引く（複数登録に対応） */
function stayOn(date){
  if(!PROF || !PROF.stays || !PROF.stays.length) return null;
  const s = PROF.stays.filter(x => (!x.from || x.from <= date) && (!x.to || date <= x.to));
  return s[s.length-1] || PROF.stays[0];
}

/* ---------- 到着日のタイムラインを逆算で組む ---------- */
function buildArrival(){
  const a = PROF.arrive;               // {date, flight, time}
  const b = PROF.badge;                // {date, time} 省略可
  const stay = stayOn(a.date);
  const walk = stay ? (+stay.walk || 10) : 10;
  const items = [];

  items.push({t:a.time, type:'event', icon:'✈', title:'SFO 到着',
    place:'San Francisco International',
    note:`${a.flight?a.flight+'。':''}日本時間だと翌日の午前2時ごろ`});

  let cur = mins(a.time);
  items.push({t:hhmm(cur+10), type:'move', title:'入国審査・荷物受取',
    dur:`${EST.immigration[0]}〜${EST.immigration[1]}分`,
    note:'Worlds週なので混雑想定。ここが読めない区間'});

  cur = cur + 10 + EST.immigration[0];
  items.push({t:hhmm(cur), type:'move', title:'BART で市内へ', dur:`約${EST.bartToCity}分`,
    note:'SFO → Powell St。Clipperかクレカのタッチで乗れる', map:'powell'});

  cur += EST.bartToCity;
  items.push({t:hhmm(cur), type:'move', title:'Powell St から徒歩', dur:`${walk}分`});

  cur += walk;
  const hotelAt = cur;
  items.push({t:hhmm(hotelAt), type:'event', icon:'🏨',
    title:`${stay ? stay.name : '宿'} に荷物を置く`,
    place: stay && stay.addr ? stay.addr : '',
    note:'ここで一息つける', stay:true});

  if(b && b.time){
    const badge = mins(b.time);
    const earliest = hotelAt + walk;          // 最短でも会場に着けない時刻
    if(earliest > badge){
      items.push({t:'', type:'warn', icon:'⚠', title:'バッジ枠に間に合いません',
        note:`到着${a.time}からだと、最短でも${hhmm(earliest)}にしか Registration Hall に着けません。`
           + `バッジ枠を${hhmm(earliest+10)}以降に取り直すか、宿に寄らず直行する前提で組み直してください。`});
    }
    const leave = badge - walk;
    items.push({t:hhmm(leave), type:'move', title:'宿を出る', dur:`徒歩${walk}分`});
    items.push({t:b.time, type:'anchor', icon:'🎫', title:'バッジ受け取り',
      place:'Registration Hall / Moscone West', map:'moscone',
      note:`今日の基準点。列は${EST.badgeQueue[0]}〜${EST.badgeQueue[1]}分見ておく`});
    const pc = badge + EST.badgeQueue[1] + EST.westToPC;
    items.push({t:hhmm(pc), type:'event', icon:'🛍', title:'Pokémon Center',
      place:'Moscone West', map:'moscone', note:'入場にはバッジが必須'});
  }
  items.push({t:'', type:'free', title:'夕方以降フリー',
    note:'時差ボケがくる時間帯。無理せず早めに休むのも手'});

  /* 逆算のデッドライン */
  let fb = null;
  if(b && b.time && (hotelAt + walk) <= mins(b.time)){
    const deadline = mins(b.time) - walk - EST.bartToCity - walk - 20;
    fb = `バッジが${b.time}なら、SFOを${hhmm(deadline)}までに出れば間に合います。`
       + `入国審査が押して${hhmm(mins(b.time)-30)}を過ぎそうなら、バッジは会期中いつでも取れるので`
       + `ポケモンセンターを優先する判断もあり。`;
  }
  return {
    date:a.date, label:'到着', base: stay ? stay.name : '',
    anchor: (b&&b.time) ? {time:b.time, text:'Registration Hall 到着'} : null,
    items, fallback: fb
  };
}

/* ---------- 帰国日 ---------- */
function buildDeparture(){
  const d = PROF.depart;               // {date, flight, time}
  if(!d || !d.time) return null;
  const stay = stayOn(d.date);
  const walk = stay ? (+stay.walk || 10) : 10;
  const dep = mins(d.time);
  const atAirport = dep - EST.airportLead;
  const leave = atAirport - EST.bartToCity - 5 - walk;
  return {
    date:d.date, label:'帰国', base: stay ? `${stay.name} → SFO` : 'SFO',
    anchor:{time:hhmm(leave), text:'宿を出る'},
    items:[
      {t:hhmm(leave), type:'anchor', icon:'🧳', title:`${stay?stay.name:'宿'} を出る`,
       note:'チェックアウト期限ではなく、実際に動く時間。ここが今日の基準点', stay:true},
      {t:hhmm(leave+walk), type:'move', title:'Powell St から BART',
       dur:`約${EST.bartToCity+5}分`, note:'SFO 行き', map:'powell'},
      {t:hhmm(atAirport), type:'event', icon:'✈', title:'SFO 到着',
       note:`国際線なので${EST.airportLead/60}時間前`},
      {t:d.time, type:'event', title:`${d.flight||'出発便'} 出発`}
    ]
  };
}

/* ---------- 宿の移動日 ---------- */
function buildMoveDays(){
  if(!PROF.stays || PROF.stays.length < 2) return [];
  const out=[];
  for(let i=1;i<PROF.stays.length;i++){
    const from=PROF.stays[i-1], to=PROF.stays[i];
    if(!to.from) continue;
    out.push({date:to.from, label:'宿の移動', base:`→ ${to.name}`, items:[
      {t:'11:00', type:'event', icon:'🧳', title:`${from.name} チェックアウト`},
      {t:'11:15', type:'move', title:`${to.name} へ移動`, dur:'徒歩10分前後',
       note:'距離があるならUber/Lyftも検討'},
      {t:'11:30', type:'event', icon:'🏨', title:`${to.name} に荷物を預ける`,
       place: to.addr||'', note:'チェックイン前でも預かってもらえる。手ぶらで動ける', stay:true},
      {t:'', type:'free', title:'昼〜午後フリー', note:'荷物がないので身軽'},
      {t: to.checkin||'15:00', type:'event', icon:'🔑', title:`${to.name} チェックイン`}
    ]});
  }
  return out;
}

/* ---------- イベント3日分の枠 ---------- */
const EVENT_DAYS = [
  {date:'2026-08-28', label:'XP / Worlds Day 1',
   ph:'North Lobby から入るとXP側が最短。予約不要のものはイベントタブに20件あります。'},
  {date:'2026-08-29', label:'Day 2',
   ph:'3日で一番セッションが多い日。パネルとミート＆グリートは抽選対象外なので狙うならこの日。GOのPokémonXP配信30分視聴もこの日だけ。'},
  {date:'2026-08-30', label:'Championship Sunday',
   ph:'決勝は Chase Center。Moscone ではないので移動が要ります。'}
];

/* ============================================================
   予定の名前から WCS 会場の場所を推測する
   ============================================================ */

/* 表記ゆれを吸収する。丸数字・記号・空白を落として比較用の文字列にする */
function normSpot(s){
  return String(s||'')
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/g,'')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0))
    .toLowerCase()
    .replace(/é/g,'e')
    .replace(/[\s　・･/／\-—–（）()【】\[\]「」『』,、。.]/g,'');
}

/* 場所の表示用。凡例の丸数字と補足の括弧を落とす（マップ紐づけ側は元の名前のまま） */
function pinLabel(n){
  return String(n||'')
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/,'')
    .replace(/（[^）]*）\s*$/,'')
    .trim();
}

/* 日本語や略称からピンを引くための別名表。
   pin は pins.json 内の名前の一部（normSpot して部分一致で探す）。
   「夕食」「トイレ」のような一般語は入れないこと。会場外の予定まで
   誤って会場に紐づけてしまうため。 */
const SPOT_ALIAS = [
  {pin:'Pokémon Center Outpost',    q:['アウトポスト','outpost']},
  {pin:'Pokémon Center',            q:['ポケモンセンター','ポケセン','pokemoncenter']},
  {pin:'Registration Hall',         q:['バッジ','レジストレーション','registration','受付証']},
  {pin:'World Championships Stage', q:['worldsステージ','世界大会','championshipsstage']},
  {pin:'PokémonXP Stage',           q:['xpステージ','pokemonxpstage']},
  {pin:'Pokémon UNITE',             q:['ユナイト','unite']},
  {pin:'Pokémon GO',                q:['ポケモンgo','ポケgo','pokemongo']},
  {pin:'Video Game',                q:['ビデオゲーム','videogame','vgc']},
  {pin:'Hall B / TCG',              q:['tcg','カードゲーム','トレカ']},
  {pin:'Side Events',               q:['サイドイベント','sideevent']},
  {pin:'Deck Check',                q:['デッキチェック','deckcheck']},
  {pin:'Team Check',                q:['チームチェック','teamcheck']},
  {pin:'Tournament Entry',          q:['トーナメント受付','大会受付','tournamententry']},
  {pin:'Main Event Prize Pick-Up',  q:['賞品','prizepickup']},
  {pin:'Pokémon Play Lab',          q:['プレイラボ','playlab']},
  {pin:'30周年展示',                q:['30周年','三十周年','anniversary']},
  {pin:'Hall D / LEGO',             q:['レゴ','lego']},
  {pin:'Rayquaza Trolley',          q:['トロリー','trolley']},
  {pin:'Rayquaza Road',             q:['レックウザロード','rayquazaroad']},
  {pin:'Wharf Stage',               q:['ワーフステージ','wharfstage']},
  {pin:'Santa Cruz Skateboards',    q:['スケートボード','スケボー','santacruz']},
  {pin:'Yerba Buena Gardens',       q:['ヤーバブエナ','イエルバブエナ','ybg','yerbabuena']},
  {pin:'ColourPop',                 q:['カラーポップ','colourpop']},
  {pin:"Furfrou's Hair Salon",      q:['トリミアン','ヘアサロン','furfrou']},
  {pin:'Flower Dome',               q:['フラワードーム','flowerdome']},
  {pin:'Garden Stage',              q:['ガーデンステージ','gardenstage']},
  {pin:'Garden Games',              q:['ガーデンゲーム','gardengames']},
  {pin:'Squishmallows Slide',       q:['スクイッシュマロウ','squishmallows']},
  {pin:'Pin Rally',                 q:['ピンラリー','pinrally','ピン交換']},
  {pin:'Quiet Room',                q:['クワイエットルーム','quietroom']},
  {pin:'First Aid',                 q:['救護','医務','firstaid']},
  {pin:'North Lobby',               q:['ノースロビー','northlobby']},
  {pin:'South Lobby',               q:['サウスロビー','southlobby']}
];

/* 会場マップに載っていない、街のスポット */
const SPOT_CITY = [
  {q:['チェイスセンター','chasecenter','決勝','championshipsunday','ファイナル'],
   map:'chase', place:'Chase Center'}
];

/* 会場マップの全ピンを1本のリストにする（PINS はテンプレート側のグローバル） */
function allPins(){
  const out=[];
  if(typeof PINS === 'undefined') return out;
  Object.keys(PINS).forEach(m=>(PINS[m]||[]).forEach(p=>
    out.push({m, x:p.x, y:p.y, name:p.name, cat:p.cat})));
  return out;
}

/* 予定の名前から会場の場所を推測する。見つからなければ null */
function findSpot(text){
  const t = normSpot(text);
  if(!t) return null;

  for(const c of SPOT_CITY){
    if(c.q.some(q=>t.includes(normSpot(q))))
      return {spot:null, map:c.map, place:c.place};
  }

  const pins = allPins();
  const pick = frag => {
    const f = normSpot(frag);
    return pins.find(p=>normSpot(p.name).includes(f));
  };

  for(const a of SPOT_ALIAS){
    if(a.q.some(q=>t.includes(normSpot(q)))){
      const p = pick(a.pin);
      if(p) return {spot:{m:p.m, x:p.x, y:p.y, name:p.name}, map:'moscone', place:pinLabel(p.name)};
    }
  }

  /* 別名に無ければ、ピン名そのものが書かれていないか見る（長い一致を優先）。
     トイレ・飲食・インフォメーションは会場に何個もある設備で、
     「トイレ休憩」のような予定名を誤って会場に紐づけてしまうので対象外
     （ドロップダウンからの手動選択はできる） */
  const GENERIC = p => p.cat==='wc' || p.cat==='food' || p.name==='インフォメーション';
  let best=null;
  pins.forEach(p=>{
    if(GENERIC(p)) return;
    const n=normSpot(p.name);
    if(n.length>=3 && t.includes(n) && (!best || n.length>normSpot(best.name).length)) best=p;
  });
  if(best) return {spot:{m:best.m, x:best.x, y:best.y, name:best.name},
                   map:'moscone', place:pinLabel(best.name)};
  return null;
}

/* ---------- 自分で足した予定 ---------- */

/* 時刻順に差し込む。先頭の時刻なし項目（その日の警告など）より前には入れない */
function insertByTime(items, it){
  const m = mins(it.t);
  let idx = 0;
  for(let i=0; i<items.length; i++){
    if(items[i].t && mins(items[i].t) <= m) idx = i+1;
  }
  if(idx === 0){ while(idx < items.length && !items[idx].t) idx++; }
  items.splice(idx, 0, it);
}

function addPlans(map){
  (PROF.plans||[]).forEach(p=>{
    if(!p.date || !p.title) return;
    if(!map[p.date]){
      const st = stayOn(p.date);
      map[p.date] = {date:p.date, label:'フリー', base: st?st.name:'', items:[]};
    }
    const d = map[p.date];
    /* placeholder は消さない。イベント日の案内文はここに入っていて、
       予定を足したあとも読む価値がある（見出しだけ renderDay 側で切り替える） */
    const it = {t:p.time||'', type:'event', icon:p.icon||'📌', title:p.title,
                place:p.place||'', note:p.note||'', mine:true,
                spot:p.spot||null, map:p.map||''};
    if(p.time) insertByTime(d.items, it); else d.items.push(it);
  });
}

/* ---------- 全日程を組み立てる ---------- */
function buildDays(){
  const map = {};
  const add = d => { if(!d) return;
    map[d.date] = map[d.date] ? Object.assign(map[d.date], d) : d; };

  add(buildArrival());
  buildMoveDays().forEach(add);
  add(buildDeparture());

  EVENT_DAYS.forEach(e=>{
    if(map[e.date]){
      map[e.date].label = map[e.date].label==='宿の移動'
        ? `${e.label}・宿の移動` : e.label;
      if(!map[e.date].items.length) map[e.date].placeholder = e.ph;
    } else {
      const st = stayOn(e.date);
      map[e.date] = {date:e.date, label:e.label, base: st?st.name:'',
                     items:[], placeholder:e.ph};
    }
  });

  /* 8/30 と 8/29 の注意 */
  if(map['2026-08-30']) map['2026-08-30'].items.push({t:'', type:'warn',
    title:'決勝は Chase Center', map:'chase', icon:'🏆',
    note:'Moscone から Muni T ラインで約20分。アリーナ入場の権限が要るのでパスを確認'});
  if(map['2026-08-29']) map['2026-08-29'].items.unshift({t:'', type:'warn',
    title:'GO：PokémonXP配信を30分見る', icon:'📺',
    note:'twitch.tv/PokemonXP を30分視聴で Cosmog-chu のリサーチ。この日だけの条件'});

  addPlans(map);   // 空白日を埋める前に入れる（予定だけの日も1日として立てるため）

  /* 滞在期間の空白日を埋める */
  const all = Object.values(map).map(d=>d.date).sort();
  if(all.length){
    const s=new Date(all[0]+'T00:00:00'), e=new Date(all[all.length-1]+'T00:00:00');
    for(let x=new Date(s); x<=e; x.setDate(x.getDate()+1)){
      const k=`${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`;
      if(!map[k]){
        const st=stayOn(k);
        map[k]={date:k, label:'フリー', base: st?st.name:'', items:[],
                placeholder:'まだ予定が入っていません。決まったら教えてください。'};
      }
    }
  }
  return Object.values(map).sort((a,b)=>a.date<b.date?-1:1);
}

/* ---------- 個人の予約カード ---------- */
function buildBookings(){
  const out=[];
  if(PROF.arrive && PROF.arrive.time) out.push({cat:'フライト',
    name:`${PROF.arrive.flight||'往路'} → サンフランシスコ`,
    detail:`${PROF.arrive.date}  ${PROF.arrive.time} SFO着`,
    note:'搭乗券は航空会社のアプリ / Wallet で'});
  if(PROF.depart && PROF.depart.time) out.push({cat:'フライト',
    name:`${PROF.depart.flight||'復路'} サンフランシスコ発`,
    detail:`${PROF.depart.date}  ${PROF.depart.time} SFO発`,
    note:'搭乗券は航空会社のアプリ / Wallet で'});
  (PROF.stays||[]).forEach(s=>out.push({cat:'宿', name:s.name,
    detail:[s.from&&`${s.from} 〜 ${s.to||''}`, s.addr].filter(Boolean).join(' ／ '),
    code:s.code||'', note:`Mosconeまで徒歩${s.walk||10}分`,
    dir:s.lat?null:s.name}));
  (PROF.extras||[]).forEach(x=>out.push({cat:'その他', name:x.name,
    detail:x.detail||'', code:x.code||'', note:x.note||''}));
  /* 予約番号を入れた予定は、ここにも控えとして出す */
  (PROF.plans||[]).forEach(p=>{ if(!p.code) return;
    out.push({cat:'予定', name:`${p.icon||'📌'} ${p.title}`,
      detail:[p.date, p.time, p.place].filter(Boolean).join('　'),
      code:p.code, note:p.note||''}); });
  return out;
}

/* ---------- 反映 ---------- */
function applyProfile(){
  if(!PROF) return false;
  TRIP.days = buildDays();
  TRIP.bookings = buildBookings();
  TRIP.trip = Object.assign({}, TRIP.trip, {
    start: TRIP.days[0].date, end: TRIP.days[TRIP.days.length-1].date });
  return true;
}
