import base64, json, os, urllib.parse, re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
os.chdir(ROOT)
os.makedirs("dist", exist_ok=True)
maps=[("overview","キャンパス全体"),("levels","全レベル"),("ground","Ground"),
      ("lower","Lower"),("ybg","Yerba Buena")]
entries=[{"id":m,"label":l,
          "src":"data:image/webp;base64,"+base64.b64encode(open(f"assets/{m}.webp","rb").read()).decode()}
         for m,l in maps]
common=json.load(open("data/common.json",encoding="utf-8"))
common["days"]=[]; common["bookings"]=[]
pins=json.load(open("data/pins.json",encoding="utf-8"))
geo=open("assets/geo_generic.svg",encoding="utf-8").read()
icon=("data:image/svg+xml,"+urllib.parse.quote(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">'
  '<rect width="180" height="180" rx="40" fill="#17131F"/>'
  '<text x="90" y="82" font-family="system-ui" font-size="52" font-weight="800" '
  'fill="#F5C518" text-anchor="middle">SF</text>'
  '<text x="90" y="126" font-family="system-ui" font-size="30" font-weight="700" '
  'fill="#A97FE0" text-anchor="middle">2026</text></svg>'))
manifest=urllib.parse.quote(json.dumps({
  "name":"SF 2026 — 旅のしおり","short_name":"SF 2026","start_url":"./","display":"standalone",
  "background_color":"#17131F","theme_color":"#17131F",
  "icons":[{"src":icon,"sizes":"180x180","type":"image/svg+xml"}]},ensure_ascii=False))
h=open("src/shared_template.html",encoding="utf-8").read()
for k,v in [("__TRIP__",json.dumps(common,ensure_ascii=False)),
            ("__MAPS__",json.dumps(entries,ensure_ascii=False)),
            ("__PINS__",json.dumps(pins,ensure_ascii=False)),
            ("__SETUP__",open("src/setup.js",encoding="utf-8").read()),
            ("__SETUPUI__",open("src/setup_ui.js",encoding="utf-8").read()),
            ("__GEO__",geo),("__ICON__",icon),("__MANIFEST__",manifest)]:
    h=h.replace(k,v)
out="index.html"   # GitHub Pages にそのまま置けるよう、リポジトリ直下に出す
open(out,"w",encoding="utf-8").write(h)
s=open(out,encoding="utf-8").read()
print(f"{out}  {os.path.getsize(out)/1024/1024:.2f} MB")
print("未置換:", re.findall(r'__[A-Z]+__',s) or "なし")
# 検出語のうち個人を特定するもの（予約番号・氏名・住所・便名）は private/ に置く。
# このファイル自体は公開リポジトリに入るので、ここに実物を書かないこと。
wordfile=pathlib.Path("private/leakwords.json")
if wordfile.exists():
    words=json.load(open(wordfile,encoding="utf-8"))
    leak=[b for b in words if b in s]
    print(f"個人情報の混入（{len(words)}語で検査）:", leak or "なし ✓")
else:
    print("⚠ private/leakwords.json が無いため、個人情報チェックを実行できませんでした。"
          "配布する前に、必ず本人環境でビルドし直して確認すること。")
