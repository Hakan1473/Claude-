import json, subprocess, os
dur={}
for f in os.listdir('lines'):
    if f.endswith('.wav') and '-' not in f:
        dur[f[:-4]]=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','lines/'+f]).decode())
env = open('env.json').read() if os.path.exists('env.json') else '[]'
s=open('promo3.html').read().replace('LOGO_DATA',open('logo.b64').read().strip()).replace('ENV_DATA',env).replace('DUR_DATA',json.dumps(dur))
open('built.html','w').write(s)
