import urllib.request,urllib.error,json,uuid
BASE='http://localhost:5173'
def call(path,method='GET',data=None,cookie='',extra=None):
 h={'Origin':BASE,'Content-Type':'application/json'}
 if cookie:h['Cookie']=cookie
 h.update(extra or {})
 r=urllib.request.Request(BASE+path,data=json.dumps(data).encode() if data is not None else None,headers=h,method=method)
 try:res=urllib.request.urlopen(r)
 except urllib.error.HTTPError as e:res=e
 return res.status,res.headers,res.read().decode()
assert call('/')[0]==200
assert call('/api/records',extra={'oai-authenticated-user-id':'spoof','oai-authenticated-user-email':'spoof@example.test'})[0]==401
payload={'email':str(uuid.uuid4())+'@example.test','password':'Test-only-passphrase-123','name':'Local test'}
assert call('/api/auth/register','POST',payload,extra={'Origin':'https://evil.test'})[0]==403
status,h,_=call('/api/auth/register','POST',payload);assert status==200,status
cookie=h['Set-Cookie'].split(';')[0]
assert all(x in h['Set-Cookie'] for x in ['HttpOnly','Secure','SameSite=Lax'])
assert call('/api/records',cookie=cookie)[0]==200
r=call('/api/records','POST',{'kind':'spot','name':'Auth isolation test','lat':44.7,'lng':9.5,'payload':{}},cookie)
assert r[0]==201,r
second={**payload,'email':str(uuid.uuid4())+'@example.test'}
s,h,_=call('/api/auth/register','POST',second);assert s==200
cookie2=h['Set-Cookie'].split(';')[0]
assert json.loads(call('/api/records',cookie=cookie2)[2])['records']==[]
assert call('/api/auth/logout','POST',{},cookie)[0]==200
assert call('/api/records',cookie=cookie)[0]==401
assert call('/api/auth/login','POST',{**payload,'password':'wrong'})[0]==401
assert call('/api/auth/login','POST',payload)[0]==200
print('PASS: registration, login, logout invalidation, CSRF, secure cookies, spoofed headers and cross-account record isolation')
