import Explorer from '@/components/explorer';
import {getUser} from '@/lib/auth';
export const dynamic='force-dynamic';
export default async function Home(){const user=await getUser();return <Explorer user={user?{name:user.displayName}:null}/>;}
