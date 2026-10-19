import numpy as np, wave, json
import json as _j
_T=_j.load(open('timing.json'))
_W=[c['t'] for c in _T['cues'] if c['type'] in('whoosh','reveal')]
PH0,LAP,RECAP,CLOSE=_W[2],_W[3],_W[4],_W[5]
sr=48000; D=_T['total']; n=int(sr*D); t=np.arange(n)/sr
L=np.zeros(n); R=np.zeros(n)
rng=np.random.default_rng(11)
hz=lambda m: 440*2**((m-69)/12)
def add(at, sig, g=1.0, pan=0.5):
    i0=int(at*sr); i1=min(n,i0+len(sig))
    if i0>=n or i1<=0: return
    s=sig[:i1-i0]*g; L[i0:i1]+=s*(1-pan)*1.4; R[i0:i1]+=s*pan*1.4
def tone(f, dur, decay, att=0.003, harm=((1,1),)):
    x=np.arange(int(dur*sr))/sr
    s=sum(a*np.sin(2*np.pi*f*h*x) for h,a in harm)
    return s*np.exp(-x*decay)*np.minimum(1,x/att)
def noise(dur, f0, f1, bw=0.5):
    m=int(dur*sr); no=rng.standard_normal(m)
    # time-varying bandpass via STFT-ish chunks
    out=np.zeros(m); ch=2048
    for i in range(0,m,ch):
        seg_=no[i:i+ch]; k=i/m; fc=f0+(f1-f0)*k
        sp=np.fft.rfft(seg_,ch); fr=np.fft.rfftfreq(ch,1/sr)
        sp*=np.exp(-((fr-fc)/(fc*bw))**2); out[i:i+ch]=np.fft.irfft(sp,ch)[:len(seg_)]
    out/=np.abs(out).max()+1e-9
    x=np.linspace(0,1,m); return out*np.sin(np.pi*x)**1.5
bellH=((1,1),(2.01,.35),(3.98,.12))
# ---------------- Music ----------------
chords=[[50,57,62,64,69],[47,54,62,66,69],[43,50,59,62,66],[45,52,61,64,69],
        [50,57,62,66,71],[47,54,61,62,66],[43,50,57,62,67],[45,52,57,64,69]]
CL=8.0
def chord_at(k): return chords[k%len(chords)]
nch=int(D/CL)+2
for k in range(nch):
    a=k*CL-0.6; b=a+CL+1.6; i0=max(0,int(a*sr)); i1=min(n,int(b*sr))
    if i0>=n: break
    x=t[i0:i1]-a; dur=b-a
    e=np.minimum(1,x/2.2)*np.minimum(1,np.maximum(0,(dur-x)/2.4))
    for m in chord_at(k):
        f=hz(m)
        for det,pan in ((-0.13,0.22),(0.13,0.78)):
            ph=rng.uniform(0,6.28)
            s=np.sin(2*np.pi*(f+det)*t[i0:i1]+ph)+0.28*np.sin(2*np.pi*2*(f+det)*t[i0:i1]+ph)+0.1*np.sin(2*np.pi*3*(f+det)*t[i0:i1])
            amp=0.03 if m>55 else 0.042
            L[i0:i1]+=s*e*amp*(1-pan); R[i0:i1]+=s*e*amp*pan
    bi0=int(k*CL*sr); bi1=min(n,int((k*CL+CL+0.3)*sr))
    if bi0<n:
        xb=t[bi0:bi1]-k*CL; eb=np.minimum(1,xb/0.8)*np.minimum(1,np.maximum(0,(CL+0.3-xb)/1.2))
        s=np.sin(2*np.pi*hz(chord_at(k)[0]-12)*t[bi0:bi1])*eb*0.075; L[bi0:bi1]+=s; R[bi0:bi1]+=s
# soft arpeggio (8ths @ 96bpm) during the walkthrough, brighter in recap
step=60/96/2
for i in range(int((CLOSE-PH0)/step)+1):
    at=PH0+1.0+i*step
    if RECAP-0.4<at<RECAP+0.2: continue
    if at>CLOSE: break
    k=int(at//CL); ch=chord_at(k); pat=[0,2,4,3,1,3,2,4]
    m=ch[pat[i%8]]+12
    g=0.016 if at<RECAP else 0.026
    fade=min(1,(at-PH0)/4) * (1-max(0,min(1,(at-(RECAP-4))/3.6)) if at<RECAP else 1)
    add(at, tone(hz(m),0.6,7,0.004,((1,1),(2,.2))), g*fade, 0.3+0.4*((i%4)/3))
# ---------------- SFX from cues ----------------
cues=_T['cues']
mel=[74,78,81,76,79,83,81]
for c in cues:
    at=c['t']; ty=c['type']
    if ty=='tap':
        add(at-0.01, tone(1750,0.06,80,0.001)+0.4*tone(3400,0.06,160,0.001), 0.11)
    elif ty=='key': add(at, tone(2600,0.03,180,0.0008), 0.05, 0.45)
    elif ty in('sheetUp','sheetDown','slide','zoom'):
        f0,f1={'sheetUp':(500,2600),'sheetDown':(2400,500),'slide':(900,2200),'zoom':(400,1600)}[ty]
        add(at, noise(0.45 if ty!='zoom' else 0.9,f0,f1,0.6), 0.05)
    elif ty in('whoosh','reveal'):
        add(at-0.5, noise(1.2,600,2600,0.7), 0.08)
        if ty=='reveal':
            for j,m in enumerate([74,78,81,86]): add(at+0.1+j*0.12, tone(hz(m),3.5,1.5,0.004,bellH), 0.06, 0.35+0.1*j)
    elif ty=='chapter':
        add(at-0.2, noise(0.7,700,2000,0.6), 0.035)
        add(at+0.05, tone(hz(88),2.0,2.6,0.003,bellH), 0.035, 0.6); add(at+0.2, tone(hz(93),2.0,2.6,0.003,bellH), 0.03, 0.4)
    elif ty=='micOn':
        add(at, tone(hz(81),0.25,14,0.003), 0.08); add(at+0.09, tone(hz(88),0.4,9,0.003), 0.08)
    elif ty=='ready': add(at, tone(hz(93),0.4,10,0.003,bellH), 0.04)
    elif ty=='tts':
        for j,m in enumerate([86,90,93]): add(at+j*0.07, tone(hz(m),0.8,6,0.003,bellH), 0.022, 0.4+0.1*j)
    elif ty=='voiceIn': add(at, tone(hz(69),0.3,12,0.01), 0.025)
    elif ty=='msg':
        x=np.arange(int(0.09*sr))/sr; f=900-300*x/0.09
        add(at, np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-x*40), 0.06)
    elif ty=='card':
        i=sum(1 for c2 in cues if c2['type']=='card' and c2['t']<at-0.01); m=[76,79,81,83,86][i%5]
        add(at, tone(hz(m),0.5,10,0.002,((1,1),(2,.25))), 0.06, 0.4+0.05*i)
    elif ty=='ding':
        add(at, tone(1318,1.4,3.2,0.002,bellH), 0.07); add(at+0.1, tone(1975,1.4,3.2,0.002,bellH), 0.055)
    elif ty=='paper': add(at, noise(0.35,2500,5000,0.5), 0.03)
    elif ty=='pop':
        x=np.arange(int(0.12*sr))/sr; f=500+900*x/0.12
        add(at, np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-x*28), 0.07)
    elif ty=='press':
        add(at, tone(160,0.15,30,0.002), 0.12)
        add(at+0.7, tone(hz(76),1.6,2.4,0.003,bellH), 0.06); add(at+1.05, tone(hz(72),1.8,2.2,0.003,bellH), 0.06)
    elif ty=='sample':
        for j,m in enumerate([74,78,81,78]): add(at+0.15+j*0.6, tone(hz(m),0.9,4,0.02,((1,1),(2,.15))), 0.035)
    elif ty=='swish':
        add(at-0.1, noise(0.8,3000,500,0.6), 0.05); add(at, tone(hz(50),1.4,2.0,0.05), 0.08)
    elif ty=='tick': add(at, tone(hz(93),0.5,10,0.002,bellH), 0.035, 0.6)
    elif ty=='bell': add(at, tone(hz(mel[c['i']]),3.5,1.6,0.004,bellH), 0.07, 0.3+0.4*(c['i']%2))
    elif ty=='tile':
        m=[74,76,78,81,83,86,88,90,93,95,98,100][c['i']]; add(at, tone(hz(m),0.6,9,0.002), 0.025, 0.3+0.04*c['i'])
# closing chord
for j,m in enumerate([62,69,74,78,81,86]): add(CLOSE+0.2+j*0.1, tone(hz(m),6,0.7,0.01,bellH), 0.04, 0.3+0.08*j)
# ---------------- Reverb + master ----------------
def verb(x):
    y=x.copy()
    for d,g in [(0.029,0.3),(0.043,0.27),(0.067,0.23),(0.101,0.19),(0.149,0.15),(0.211,0.11)]:
        k=int(d*sr); y[k:]+=x[:-k]*g
    return y
L,R=verb(L),verb(R)
import wave as _w
_v=_w.open('voices.wav'); VO=np.frombuffer(_v.readframes(_v.getnframes()),dtype=np.int16).astype(float)/32768; VO=np.pad(VO,(0,max(0,n-len(VO))))[:n]
hop=480; env=np.sqrt(np.convolve(VO**2,np.ones(hop*10)/(hop*10),'same')); duck=1-0.62*np.clip(env/0.05,0,1)
k=np.ones(int(0.25*sr))/int(0.25*sr); duck=np.convolve(duck,k,'same')
pk0=max(np.abs(L).max(),np.abs(R).max()); L=L/pk0*0.55*duck; R=R/pk0*0.55*duck
L+=VO*0.95; R+=VO*0.95
fade=np.ones(n); fi=int(1.2*sr); fade[:fi]=np.linspace(0,1,fi); fo=int((D-3.5)*sr); fade[fo:]=np.linspace(1,0,n-fo)**1.5
L*=fade; R*=fade
pk=max(np.abs(L).max(),np.abs(R).max()); L=np.tanh(L/pk*1.3)/np.tanh(1.3)*0.9; R=np.tanh(R/pk*1.3)/np.tanh(1.3)*0.9
st=(np.stack([L,R],1)*32767).astype('<i2')
w=wave.open('audio.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(st.tobytes()); w.close()
print('ok', D)
