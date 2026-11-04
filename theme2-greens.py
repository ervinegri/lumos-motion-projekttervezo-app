import re,colorsys,sys
import os;app=os.path.dirname(os.path.abspath(__file__))+'/'
s=open(app+'index.html').read()
css=s[s.index('<style>')+7:s.index('</style>')]
css=re.sub(r'/\*.*?\*/','',css,flags=re.S)
KEEP={'2c6e49','2e7d52','2f8a57','2f8d60','2e7d4f','1f6b3d','2f6f4a','2c6b4c'}  # „rendben/kifizetve” állapotzöldek maradnak
def isgreen(h):
    r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)];H,L,S=colorsys.rgb_to_hls(r,g,b);return 0.25<H<0.5 and S>0.12,L
def mapc(h):
    h=h.lower();g,L=isgreen(h)
    if not g or h in KEEP:return None
    if L<0.35:return '#243347'          # sötét márkazöld → tintakék
    if L<0.6:return '#3a4a5e'
    if L<0.8:return '#c3ceda'           # keretek
    if L<0.9:return '#dfe6ee'
    if L<0.95:return '#eaeff4'          # halvány hátterek
    return '#f5f7fa'
out=[]
def walk(txt,prefix_media=None):
    i=0;n=len(txt)
    while i<n:
        j=txt.find('{',i)
        if j<0:break
        sel=txt[i:j].strip()
        # find matching brace
        d=1;k=j+1
        while k<n and d:
            if txt[k]=='{':d+=1
            elif txt[k]=='}':d-=1
            k+=1
        body=txt[j+1:k-1]
        if sel.startswith('@media') or sel.startswith('@supports'):
            sub=[];global out;save=out;out=[];walk(body);inner=out;out=save
            if inner:out.append(sel+'{'+''.join(inner)+'}')
        elif sel.startswith('@'):pass
        else:
            decls=[]
            for dcl in body.split(';'):
                if '#' not in dcl:continue
                new=re.sub(r'#([0-9a-fA-F]{6})\b',lambda m:(mapc(m.group(1)) or '#'+m.group(1)),dcl)
                if new!=dcl:decls.append(new.strip())
            if decls and sel and not sel.startswith(':root'):
                sels=','.join('html.th2 '+x.strip() for x in sel.split(',') if x.strip() and not x.strip().startswith('html'))
                if sels:out.append(sels+'{'+';'.join(decls)+'}')
        i=k
walk(css)
gen='\n'.join(out)
t=open(app+'theme2.css').read()
A,B='/* GEN-GREENS:START – generálva (greens.py): a régi kinézet beégetett zöldjei kékes-szürkén */','/* GEN-GREENS:END */'
if A in t:t=t[:t.index(A)]+t[t.index(B)+len(B):]
# a generált blokk a kézi szabályok elé kerül, hogy azok felülírhassák
parts=t.split('html.th2{',1)
t=parts[0]+A+'\n'+gen+'\n'+B+'\nhtml.th2{'+parts[1] if False else t
idx=t.index('html.th2 body{')
t=t[:idx]+A+'\n'+gen+'\n'+B+'\n'+t[idx:]
open(app+'theme2.css','w').write(t)
print(len(out),'rules')
