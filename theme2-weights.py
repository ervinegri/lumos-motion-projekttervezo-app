# Új design (html.th2): a régi kinézet nagyon vastag betűsúlyai (750–900) Montserrattal túl erősek.
# Nagy méretnél (>=20px) 700, kisebbnél 600 lesz. Újrafuttatható: a theme2.css GEN-WEIGHTS blokkját cseréli.
import re,os
app=os.path.dirname(os.path.abspath(__file__))+'/'
s=open(app+'index.html').read()
css=re.sub(r'/\*.*?\*/','',s[s.index('<style>')+7:s.index('</style>')],flags=re.S)
out=[]
def walk(txt,sink):
    i=0;n=len(txt)
    while i<n:
        j=txt.find('{',i)
        if j<0:break
        sel=txt[i:j].strip();d=1;k=j+1
        while k<n and d:
            d+=1 if txt[k]=='{' else -1 if txt[k]=='}' else 0;k+=1
        body=txt[j+1:k-1]
        if sel.startswith('@media'):
            inner=[];walk(body,inner)
            if inner:sink.append(sel+'{'+''.join(inner)+'}')
        elif not sel.startswith('@') and sel and not sel.startswith(':root'):
            m=re.search(r'font-weight:\s*(\d+)',body)
            if m and int(m.group(1))>=750:
                fs=re.search(r'font-size:\s*(?:clamp\([^,]*,[^,]*,\s*)?(\d+(?:\.\d+)?)px',body)
                w=700 if fs and float(fs.group(1))>=20 else 600
                sels=','.join('html.th2 '+x.strip() for x in sel.split(',') if x.strip() and not x.strip().startswith('html'))
                if sels:sink.append(sels+'{font-weight:%d}'%w)
        i=k
walk(css,out)
t=open(app+'theme2.css').read()
A,B='/* GEN-WEIGHTS:START – generálva (theme2-weights.py) */','/* GEN-WEIGHTS:END */'
if A in t:t=t[:t.index(A)]+t[t.index(B)+len(B)+1:]
idx=t.index('html.th2 body{')
t=t[:idx]+A+'\n'+'\n'.join(out)+'\n'+B+'\n'+t[idx:]
open(app+'theme2.css','w').write(t)
print(len(out),'rules')
