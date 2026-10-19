import json, wave, subprocess, numpy as np
T=json.load(open('timing.json')); sr=48000; n=int(T['total']*sr)+sr
who={l[0]:l[1] for l in json.load(open('lines.json'))}; who['kore']='sys'
def load(id):
    af = 'highpass=f=170,lowpass=f=7800,equalizer=f=2600:t=q:w=1.2:g=2.5' if who[id].startswith('sys') else 'highpass=f=80'
    raw=subprocess.check_output(['ffmpeg','-loglevel','error','-i',f'lines/{id}.wav','-af',af,'-f','s16le','-ac','1','-ar','48000','-'])
    return np.frombuffer(raw,dtype=np.int16).astype(float)/32768
V=np.zeros(n)
for v in T['voices']:
    x=load(v['id'])
    if v.get('dur'): x=x[:int(v['dur']*sr)]; f=int(0.4*sr); x[-f:]*=np.linspace(1,0,f)
    i=int(v['at']*sr); V[i:i+len(x)]+=x
V*=0.9/np.abs(V).max()
w=wave.open('voices.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((V*32767).astype('<i2').tobytes()); w.close()
hop=sr//30; frames=len(V)//hop
rms=np.array([np.sqrt((V[i*hop:(i+1)*hop]**2).mean()) for i in range(frames)])
ref=np.percentile(rms[rms>0.01],90); e=np.clip(rms/ref,0,1.2)
sm=np.zeros_like(e); a=0
for i,x in enumerate(e): a = a+(x-a)*(0.6 if x>a else 0.25); sm[i]=a
json.dump([round(float(x),3) for x in sm], open('env.json','w'))
print(frames, ref)
