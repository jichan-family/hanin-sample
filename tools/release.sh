#!/bin/bash
# usage: release.sh vX.Y.Z "notes"  — copies /home/claude/v6 code into repo releases/<ver>
set -e; V=$1; N=$2; R=/home/claude/repo; D=$R/releases/$V; mkdir -p $D
for f in Code.gs Index.html Editor.html Docs.html App.html; do cp /home/claude/v6/$f $D/; done
python3 - "$V" "$N" "$D" <<'P'
import json,sys,datetime
v,n,d=sys.argv[1:4]
files=[{"name":"Code","type":"SERVER_JS","path":"Code.gs"}]+[{"name":x,"type":"HTML","path":x+".html"} for x in ["Index","Editor","Docs","App"]]
open('/home/claude/repo/latest.json','w').write(json.dumps({"version":v,"date":datetime.date.today().isoformat(),"notes":n,"files":files},ensure_ascii=False,indent=2))
P
