import ProjectApp from './project-app';
import AccessScreen from './access-screen';
import { getApplicationUser,findMember,loadProject } from './lib/app-auth';
import { chatGPTSignOutPath } from './chatgpt-auth';
import { redirect } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){
 const user=await getApplicationUser();if(!user||user.provider!=='password')redirect('/acesso');
 if(user.provider==='password'){
  const member=findMember(await loadProject(),user);
  if(!member||!member.active)return <AccessScreen canSetup={false} platformEmail={null} nativeEmail={user.email} nativeStatus={member?'disabled':'pending'} token={null}/>;
 }
 return <ProjectApp identity={user} signIn="/acesso" signOut={chatGPTSignOutPath('/')}/>;
}
