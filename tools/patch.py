# Run after menu.py. Small hand corrections to the generated menu data.
import json, io
p = 'src/js/00-menu.js'
s = open(p, encoding='utf8').read()
head, body = s[:s.index('{')], s[s.index('{'):s.rindex('}') + 1]
tail = s[s.rindex('}') + 1:]
m = json.loads(body)
for k in ('dinner', 'lunch'):
    for sec in m[k]:
        for i in sec['items']:
            i['d'] = i.get('d', '').replace('12 oz. Veal chop', '12 oz. veal chop').replace('“our own recipe”. ', 'Our own recipe. ')
            if i.get('x'): i['x'] = i['x'].replace('garlic/ oil', 'garlic and oil')
m['drinks'][-1] = {'title': 'Water', 'items': [
    {'n': 'San Pellegrino Sparkling Water', 'd': 'Small 250 ml or large 750 ml.'},
    {'n': 'Acqua Panna', 'd': 'Still Italian spring water.'}]}
fix = {'*CONCHIGLIE alla SARDA*': 'Conchiglie alla Sarda', 'I Nsalata Rustica di Nonna Caruso': 'Insalata Rustica di Nonna Caruso', 'Insalata ai Fruitti di Mare': 'Insalata ai Frutti di Mare', 'Tiramisu ( House Made )': 'Tiramisu, house made'}
cat = m['catering']
for sec in cat:
    for i in sec['items']: i['d'] = i.get('d', '').replace('artichokes, Roasted eggplant', 'artichokes, roasted eggplant').replace('grilled med. Rare. Garlic', 'grilled medium rare. Garlic')
for sec in cat:
    for i in sec['items']: i['n'] = fix.get(i['n'], i['n'])
if not any(x['title'] == 'Dessert' for x in cat):
    last = cat[-1]; k = next(n for n, i in enumerate(last['items']) if i['n'].startswith('Tiramisu'))
    cat.append({'title': 'Dessert', 'items': last['items'][k:]}); last['items'] = last['items'][:k]
for sec in m['drinks']:
    for i in sec['items']: i['n'] = i['n'].replace('Tignaello', 'Tignanello')
# tidy what the page layout ran together, and lift the sauces out of the tortellini description into their own section
import re
for sec in cat:
    for i in sec['items']:
        d = i.get('d', '')
        d = re.sub(r'\s*Side of sauces.*$', '', d)
        d = re.sub(r'\s*\*\s*half pan = 9 pieces, full pan = 18 \{both cut in half\}\s*\*\s*$', ' A half pan is 9 pieces and a full pan is 18, each cut in half.', d)
        d = re.sub(r'\s*\*\s*half pan = 9 pieces, full pan = 18\s*\*\s*$', ' A half pan is 9 pieces and a full pan is 18.', d)
        d = re.sub(r'\s+Dessert\s*$', '', d)
        d = d.replace('S paghetti', 'Spaghetti').replace('raisin, In a', 'raisin, in a').replace('onions In a', 'onions in a').replace('light Tomato cream', 'light tomato cream').replace('meatballs!!', 'meatballs!')
        i['d'] = d.strip()
if not any(x['title'] == 'Sauces on the side' for x in cat):
    k = next(n for n, x in enumerate(cat) if x['title'] == 'Pastasciutta') + 1
    cat.insert(k, {'title': 'Sauces on the side', 'cols': ['16 oz', '32 oz'], 'items': [
        {'n': 'Bolognese', 'a': '$14.50', 'b': '$29.00', 'd': ''}, {'n': 'Four cheese', 'a': '$15.00', 'b': '$30.00', 'd': ''},
        {'n': 'Marinara', 'a': '$14.00', 'b': '$28.00', 'd': ''}, {'n': 'Pomodoro', 'a': '$14.00', 'b': '$28.00', 'd': ''},
        {'n': 'Cream', 'a': '$14.00', 'b': '$28.00', 'd': ''}, {'n': 'Pesto', 'a': '$14.50', 'b': '$29.00', 'd': ''}]})
open(p, 'w', encoding='utf8').write(head + json.dumps(m, ensure_ascii=False, separators=(',', ':')) + tail)
print('patched', sum(len(x['items']) for x in m['dinner']), 'dinner items')
