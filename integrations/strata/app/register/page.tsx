import AuthForm from '../auth-form';
import {safeReturnTo} from '@/lib/auth';
import {googleConfigured} from '@/lib/google-auth';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{returnTo?:string;error?:string}>}){const params=await searchParams;return <AuthForm mode='register' returnTo={safeReturnTo(params.returnTo)} googleEnabled={googleConfigured()} initialError={params.error}/>;}
