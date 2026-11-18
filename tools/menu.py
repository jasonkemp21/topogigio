# Turn the scraped menu rows into clean data: title-case Italian dish names, sentence-case descriptions, fixed typos.
import re, json
from bs4 import BeautifulSoup
REF = '/home/claude/topo/ref/'
PART = {'al','alla','alle','ai','di','del','della','delle','dei','e','con','le','la','il','in','en','da','ed','a','de','lo','i','con','d'}
PROPER = ['Parmigiano Reggiano','Parmigiano-Reggiano','Parmigiano','Parmigiana','Parmesan','Pecorino','Prosciutto di Parma','Mozzarella di Bufala','Fontina',
  'Lake Superior','Scottish','Niman Ranch','Barolo','Chardonnay','Prosecco di Valdobbiadene','Prosecco','Valle d’Aosta','Valle D’Aosta','Ligurian','Umbrian','Alaskan King','Alaskan','Norwegian','North Pacific','West Coast','Greek','Italian','Sicilian','Neapolitan','Calabrese','Caesar','Little Neck','Carnaroli','Manila','Bolognese','Tajin','Topo Gigio','Vic Damone','Joe’s','Italy','Tuscany']
FIX = {'C ONCHIGLIE':'CONCHIGLIE','S ORBET':'SORBET','Paramgiaan':'Parmesan','PROTIEN':'PROTEIN','Bistechhe':'Bistecche','Fileto':'Filetto','Shrimps':'Shrimp','Every day':'every day','COZZE E VONGOLE ALL CALABRESE':'COZZE E VONGOLE ALLA CALABRESE','Meat Balls':'Meatballs','Baralo':'Barolo','Sanoma':'Sonoma','Ferrari Carno':'Ferrari Carano','Giancario':'Giancarlo','Frisee':'Frisée','FRISEE':'FRISÉE'}
def fix(t):
    for a,b in FIX.items(): t=t.replace(a,b)
    return t
def name_case(n):
    n=fix(n); out=[]
    for i,w in enumerate(re.split(r'(\s+)',n)):
        if not w.strip(): out.append(w); continue
        core=w.strip('“”"(),.')
        lw=core.lower()
        if i>0 and lw in PART: out.append(w.replace(core,lw)); continue
        if re.fullmatch(r'[A-ZÀ-Ü’\'&/-]+',core) or core.islower():
            cw='-'.join(p[:1].upper()+p[1:].lower() for p in core.split('-'))
            cw=re.sub(r"’S\b","’s",cw); cw=re.sub(r"(?<=[a-z])’([A-Z])",lambda m:'’'+m.group(1),cw)
            out.append(w.replace(core,cw))
        else: out.append(w)
    s=''.join(out)
    s=s.replace('Oz','oz').replace('Bone-in','Bone-In').replace('D’aosta','d’Aosta')
    return s
def sent_case(d):
    d=fix(d).strip()
    if not d: return d
    marks={}
    for k,p in enumerate(sorted(PROPER,key=len,reverse=True)):
        def rep(m,k=k,p=p): marks[f'\x00{k}\x00']=p; return f'\x00{k}\x00'
        d=re.sub(re.escape(p),rep,d,flags=re.I)
    d=d.lower()
    d=re.sub(r'(^|[.!?]\s+)([a-zà-ü])',lambda m:m.group(1)+m.group(2).upper(),d)
    for k,p in marks.items(): d=d.replace(k,p)
    d=re.sub(r'\s+([,.;:!?])',r'\1',d); d=re.sub(r'\s+',' ',d)
    d=d.replace(' & ',' and ').replace('( ','(').replace(' )',')').replace('home made','homemade').replace('(no meat/ seafood)','(no meat or seafood)').replace('frisee','frisée').replace('valle d’aosta','Valle d’Aosta').replace('Valle D’Aosta','Valle d’Aosta').replace('soup of the day…','Soup of the day.').replace('Soup of the day…','Soup of the day.')
    d=re.sub(r'\s*…\s*$','',d)
    return d
def conv(page):
    secs=[]; cur=None
    for line in open(REF+f'{page}.rows.txt',encoding='utf8'):
        tag,_,t=line.rstrip('\n').partition('\t')
        t=t.replace('­','').replace('→','').replace('←','').strip()
        if tag in('h1','h2','h3','h4'):
            m=re.match(r'(.*?)\s*\((.*)\)\s*$',t)
            if 'Lunch:' in t or 'Dinner:' in t: cur=None; continue
            cur={'it':name_case(m.group(1)) if m else name_case(t),'en':m.group(2) if m else '','items':[]}; secs.append(cur); continue
        m=re.search(r'\$\s*([0-9]+(?:\.[0-9]{2})?)',t)
        if cur is not None and m and '=' not in t[:20] and 'Split Plate' not in t:
            head,_,desc=t.partition('¦')
            tags=sorted(set(re.findall(r'\[(GF|V|P)\]',head)))
            name=re.sub(r'\[(GF|V|P|IMG)\]|…|\$\s*[0-9.]*|–|™','',head); name=re.sub(r'\s+',' ',name).strip(' -–')
            note=''
            mm=re.search(r'\s*\(([^)]*)\)\s*$',name)
            if mm: note=mm.group(1).strip().lower().replace('3','3 pieces') if mm.group(1).strip()=='3' else mm.group(1).strip().lower(); name=name[:mm.start()].strip()
            desc=re.sub(r'\s*¦\s*',' ',desc); desc=re.sub(r'\[(GF|V|P|IMG)\]','',desc)
            cur['items'].append({'n':name_case(name),'p':float(m.group(1)),'t':tags,'d':sent_case(desc),**({'x':note} if note else {})})
    return [s for s in secs if s['items']]
data={'dinner':conv('dinner-menu'),'lunch':conv('lunch-menu')}
# wine and cocktails
wine=[]; cur=None
for line in open(REF+'wine-list.rows.txt',encoding='utf8'):
    t=line.rstrip('\n').partition('\t')[2].replace('¦',' ').strip()
    m=re.fullmatch(r'\*\s*(.+?)\s*\*',t)
    if m and '$' not in t: cur={'title':fix(m.group(1)),'items':[]}; wine.append(cur); continue
    if cur is None or set(t)<=set('—-– '): continue
    if cur['title']=='BEER':
        for b in re.findall(r'([A-Za-z0-9\-/() ]+?)\s*…+\.*\s*\$\s*([0-9.]+)',t): cur['items'].append({'n':b[0].strip(' .'),'p':float(b[1])})
        continue
    m=re.search(r'^(.*?)[…\.\s]*\$\s*([0-9]+(?:\.[0-9]{2})?)\s*(?:\((.*?)\))?',t)
    if m:
        cur['items'].append({'n':fix(m.group(1).strip(' *…. ')),'p':float(m.group(2)),**({'r':fix(m.group(3))} if m.group(3) else {})})
    elif cur['items'] and 'd' not in cur['items'][-1] and len(t)>8: cur['items'][-1]['d']=fix(t)
for s in wine:
    s['title']={'BEER':'Beer'}.get(s['title'],s['title'])
data['drinks']=[s for s in wine if s['items']]
# catering trays
soup=BeautifulSoup(open(REF+'pages/catering_3.html',encoding='utf8',errors='replace').read(),'html.parser')
cat=[]; cur={'title':'Antipasti','unit':['Half pan','Full pan'],'items':[]}; cat.append(cur)
for tr in soup.find('table').find_all('tr'):
    cells=[re.sub(r'\s+',' ',td.get_text(' ')).strip() for td in tr.find_all(['td','th'])]
    if not any(cells): continue
    c0=cells[0]; rest=[c for c in cells[1:] if c]
    if re.search(r'\$',' '.join(rest)):
        nm=re.sub(r'[….\s]+$','',c0).strip()
        cur['items'].append({'n':name_case(nm),'a':rest[0],'b':rest[1] if len(rest)>1 else ''})
    elif c0.isupper() and len(c0)<40 and not rest: cur={'title':name_case(c0),'items':[]}; cat.append(cur)
    elif 'Sold By' in c0: pass
    elif cur['items'] and c0: cur['items'][-1]['d']=(cur['items'][-1].get('d','')+' '+sent_case(c0)).strip()
data['catering']=[s for s in cat if s['items']]
json.dump(data,open('/home/claude/topo/ref/menu-clean.json','w'),ensure_ascii=False,indent=1)
open('/home/claude/topo/src/js/00-menu.js','w').write('/* Generated by tools/menu.py from the restaurant\'s own menu pages (read 2026-11-17). Names and prices are theirs. */\nconst MENU = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
for k,v in data.items(): print(k,[(s.get('it') or s.get('title'),len(s['items'])) for s in v])
for s in data['dinner'][:4]:
    for i in s['items'][:14]: print('  ',i['n'],'|',i['p'],'|',i['t'],'|',i.get('x',''),'|',i['d'][:110])
print(json.dumps(data['drinks'][0]['items'][:2],ensure_ascii=False)); print(json.dumps(data['drinks'][5]['items'][:3],ensure_ascii=False)); print(json.dumps(data['catering'][0]['items'][:3],ensure_ascii=False)[:500])
