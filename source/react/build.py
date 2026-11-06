import base64, subprocess, os, json
os.environ['NODE_PATH']='/home/claude/.npm-global/lib/node_modules'
subprocess.run(['/opt/npm-tools/node_modules/esbuild/bin/esbuild','src/App.jsx','--bundle','--minify','--format=iife','--jsx=automatic','--define:process.env.NODE_ENV="production"','--outfile=dist/app.js'],check=True)
D='../f/vendor/gsaprepo/dist/'
head=open('../pro/head.html').read().split('\n')
for i,l in enumerate(head[:8]):
    if 'fonts.googleapis' in l or 'fonts.gstatic' in l: head[i]=''
FONTS=''.join('@font-face{font-family:\''+n+'\';src:url(data:font/woff;base64,'+base64.b64encode(open('fonts/'+f,'rb').read()).decode()+') format(\'woff\');font-weight:'+w+';font-style:normal;font-display:swap}\n' for n,f,w in [('Onest','onest.woff','100 900'),('JetBrains Mono','jbmono.woff','100 800')])
def uri(f,mime): return 'url(data:'+mime+';base64,'+base64.b64encode(open(f,'rb').read()).decode()+')'
svg=open('logos/nouveau-regard.svg').read()
CSSX=open('extra.css').read()+'\n.lg.nr{--m:'+uri('logos/nouveau-regard.svg','image/svg+xml')+'}\n.lg.not{--m:'+uri('logos/notaire.png','image/png')+'}\n.lg.bon{--m:'+uri('logos/bonvoisin.png','image/png')+'}\n.lg.cc{--m:'+uri('logos/charlotte.png','image/png')+'}\n'
style='\n'.join(head[:256])+FONTS+CSSX+'\n'+head[256]
libs=''.join('<script>\n'+open(D+f).read().replace('//# sourceMappingURL','// ')+'\n</script>\n' for f in ['gsap.min.js','ScrollTrigger.min.js','CustomEase.min.js'])+'<script>\n'+open('../pro/smooth.js').read()+'\n</script>\n'
img={k:'data:image/jpeg;base64,'+base64.b64encode(open(f,'rb').read()).decode() for k,f in [('call','../new-call.jpg'),('trays','../new-trays.jpg'),('door','../new-door-crop.jpg')]}
html=style+'\n<div id="root"></div>\n<script>window.__IMG='+json.dumps(img)+'</script>\n'+libs+'<script>\n'+open('dist/app.js').read().replace('</script','<\\/script')+'\n</script>\n'
html=html.replace('<title>Ma boîte au carré Pro</title>','<title>Ma boîte au carré</title>')
open('index.html','w').write(html); print(len(html))
