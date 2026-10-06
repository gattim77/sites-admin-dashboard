'use client';
import {useState} from 'react';
export default function SignOut(){const [error,setError]=useState('');return <><button className="secondary" onClick={async()=>{try{const r=await fetch('/api/auth/logout',{method:'POST'});if(!r.ok)throw Error();location.assign('/')}catch{setError('Unable to sign out. Try again.')}}}>Sign out</button>{error&&<p role="alert">{error}</p>}</>}
