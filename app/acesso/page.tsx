import {env} from '../../db/runtime';
import {startState} from '../lib/domain';
import AccessScreen from '../access-screen';
import { getChatGPTUser } from '../chatgpt-auth';
import { getApplicationUser,loadProject,findMember } from '../lib/app-auth';
export const dynamic='force-dynamic';
export default async function AccessPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const params=await searchParams;const user=await getApplicationUser(),platform=await getChatGPTUser();let state=await loadProject();
 if(!state&&platform&&env.DB&&env.PROJECT_OWNER_EMAIL&&platform.email.toLowerCase()===env.PROJECT_OWNER_EMAIL.toLowerCase()){await env.DB.prepare('INSERT OR IGNORE INTO project_state(id,revision,payload) VALUES(1,0,?)').bind(JSON.stringify(startState(platform))).run();state=await loadProject()}
 const platformMember=platform?state?.members.find(m=>m.userId===platform.userId&&m.email===platform.email.toLowerCase()&&m.active):null;
 const member=user?findMember(state,user):null;
 return <AccessScreen canSetup={!!platformMember} platformEmail={platformMember?.email||null} nativeEmail={user?.provider==='password'?user.email:null} nativeStatus={user?.provider==='password'?(member?(member.active?'approved':'disabled'):'pending'):null} token={params.redefinir||null}/>;
}
