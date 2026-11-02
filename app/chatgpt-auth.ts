import {redirect} from 'next/navigation';
export type ChatGPTUser={userId:string;displayName:string;email:string;fullName:string|null};
// The independent deployment never trusts externally supplied identity headers.
export async function getChatGPTUser():Promise<ChatGPTUser|null>{return null}
export function chatGPTSignOutPath(_returnTo='/'){return '/acesso'}
export function chatGPTSignInPath(_returnTo='/'){return '/acesso'}
export async function requireChatGPTUser(_returnTo='/'):Promise<never>{redirect('/acesso')}
