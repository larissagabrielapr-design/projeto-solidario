import {createHash,timingSafeEqual} from 'node:crypto';
export const BACKUP_FORMAT='projeto-ibpv-solidario-migration-v1';
const checksum=data=>createHash('sha256').update(JSON.stringify(data),'utf8').digest('hex');
const requireValue=(condition,message)=>{if(!condition)throw new Error(message)};
export function createBackup(projectState,credentials){const data={project_state:projectState,credentials};return {format:BACKUP_FORMAT,createdAt:new Date().toISOString(),data,sha256:checksum(data)}}
export function validateBackup(backup){
 requireValue(backup?.format===BACKUP_FORMAT&&backup.data,'Formato de backup não reconhecido.');
 const actual=checksum(backup.data);requireValue(typeof backup.sha256==='string'&&/^[a-f0-9]{64}$/.test(backup.sha256)&&timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(backup.sha256,'hex')),'O backup está incompleto ou foi alterado.');
 const {project_state:row,credentials}=backup.data;requireValue(row?.id===1&&Number.isSafeInteger(row.revision)&&row.revision>=0&&typeof row.payload==='string','Estado do projeto inválido.');
 let state;try{state=JSON.parse(row.payload)}catch{throw new Error('Dados do projeto inválidos.')}
 for(const key of ['members','families','events','entries','deliveries','activity'])requireValue(Array.isArray(state[key]),'Estrutura do projeto incompleta.');
 requireValue(Array.isArray(credentials),'Contas do backup inválidas.');
 const ids=new Set(),emails=new Set(),principals=new Set();
 for(const c of credentials){
  requireValue(c&&typeof c.id==='string'&&c.id.length<=128&&typeof c.email==='string'&&c.email.length<=180&&typeof c.name==='string'&&typeof c.principal==='string'&&c.principal.length<=256,'Conta do backup inválida.');
  requireValue(!ids.has(c.id)&&!emails.has(c.email.toLowerCase())&&!principals.has(c.principal),'Há contas duplicadas no backup.');ids.add(c.id);emails.add(c.email.toLowerCase());principals.add(c.principal);
  requireValue(typeof c.password_hash==='string'&&/^[a-f0-9]{128}$/.test(c.password_hash)&&typeof c.salt==='string'&&c.salt.length>=32&&c.salt.length<=128,'Formato de senha incompatível.');
  requireValue(Number.isSafeInteger(c.version)&&c.version>=1&&(c.blocked===0||c.blocked===1)&&typeof c.created_at==='string','Metadados de conta inválidos.');
 }
 const admin=state.members.find(m=>m.role==='admin'&&m.active&&credentials.some(c=>c.principal===m.userId&&c.email===m.email&&c.blocked===0));
 requireValue(admin,'O backup precisa incluir a conta ativa da administração e sua senha cadastrada.');
 requireValue(state.events.some(e=>e.id===state.eventId)&&Number.isSafeInteger(state.cost)&&state.cost>0,'Configurações do projeto inválidas.');
 return {projectState:row,credentials,state,checksum:actual};
}
