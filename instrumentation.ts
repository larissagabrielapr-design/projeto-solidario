export async function register(){
 if(process.env.NEXT_RUNTIME!=='nodejs')return;
 if(process.env.NODE_ENV==='development'){
  const {getLocalResources}=await import('./db/local.mjs');
  const {DB}=await getLocalResources();
  const {bootstrapAdmin}=await import('./db/bootstrap-admin');
  await bootstrapAdmin(DB);
  console.log('D1 e R2 prontos · Debug: http://127.0.0.1:8787');
 }
}
