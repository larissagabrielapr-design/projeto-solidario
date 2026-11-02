export type Role = 'admin' | 'common' | 'finance';
export const roles: Record<Role, string> = {admin:'Administrador principal',common:'Comum',finance:'Financeiro'};
export type Member = {id:string; userId:string|null; name:string;email:string;role:Role;active:boolean};
export type Family = {id:string;name:string;phone:string;address:string;neighborhood:string;residents:number;notes:string;createdAt:string;demo?:boolean};
export type Event = {id:string;name:string;date:string};
export type Correction = {at:string;by:string;reason:string;description:string};
export type Delivery = {id:string;familyId:string;eventId:string;quantity:number;at:string;by:string;demo?:boolean;corrections?:Correction[]};
export type Entry = {id:string;type:'donation'|'purchase'|'basket';amount:number;quantity:number;note:string;at:string;by:string;demo?:boolean;corrections?:Correction[]};
export type Activity = {id:string;message:string;at:string;by:string;demo?:boolean;scope?:'operations'|'finance'|'admin'};
export type State = {members:Member[];families:Family[];events:Event[];eventId:string;deliveries:Delivery[];entries:Entry[];cost:number;activity:Activity[];demoLoaded:boolean};
export class AppError extends Error {constructor(message:string,public status=400){super(message)}}
export function demand(condition:unknown,message:string,status=400):asserts condition {if(!condition)throw new AppError(message,status)}
export function baskets(residents:number){demand(Number.isInteger(residents)&&residents>=1&&residents<=6,'Informe de 1 a 6 moradores. Acima de 6, a regra precisa ser definida pela coordenação.');return residents<=3?1:2}
export function totals(s:State){
 const raised=s.entries.filter(e=>e.type==='donation').reduce((a,e)=>a+e.amount,0);
 const spent=s.entries.filter(e=>e.type==='purchase').reduce((a,e)=>a+e.amount,0);
 const incoming=s.entries.reduce((a,e)=>a+e.quantity,0);
 const outgoing=s.deliveries.reduce((a,e)=>a+e.quantity,0);
 return {raised,spent,balance:raised-spent,incoming,outgoing,stock:incoming-outgoing,possible:Math.max(0,Math.floor((raised-spent)/s.cost))};
}
export function startState(user:{userId:string;displayName:string;email:string}):State{return {members:[{id:crypto.randomUUID(),userId:user.userId,name:user.displayName,email:user.email.toLowerCase(),role:'admin',active:true}],families:[],events:[{id:'initial',name:'Ação solidária',date:''}],eventId:'initial',deliveries:[],entries:[],cost:15000,activity:[],demoLoaded:false}}
function txt(v:unknown,label:string,min=1,max=200){const x=String(v??'').trim();demand(x.length>=min&&x.length<=max,`${label}: informe de ${min} a ${max} caracteres.`);return x}
function money(v:unknown){const n=Number(v);demand(Number.isSafeInteger(n)&&n>0&&n<=100000000,'Informe um valor válido maior que zero.');return n}
function count(v:unknown){const n=Number(v);demand(Number.isInteger(n)&&n>0&&n<=10000,'Informe uma quantidade inteira de 1 a 10.000.');return n}
function log(s:State,by:Member,message:string,scope:Activity['scope']='operations'){s.activity.unshift({id:crypto.randomUUID(),message,at:new Date().toISOString(),by:by.name,scope});s.activity=s.activity.slice(0,200)}
const currency=(n:number)=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function mutate(s:State,actor:Member,role:Role,action:string,p:any){
 demand(actor.active,'Conta desativada.',403);
 const finance=role==='admin'||role==='finance';
 const id=crypto.randomUUID(),now=new Date().toISOString();
 if(action==='family.save'){
  const f:Family={id:p.id||id,name:txt(p.name,'Nome',3,100),phone:txt(p.phone,'Contato',10,30),address:txt(p.address,'Endereço',5,200),neighborhood:txt(p.neighborhood,'Bairro',2,80),residents:Number(p.residents),notes:txt(p.notes,'Observações',0,500),createdAt:now};
  baskets(f.residents);demand(f.phone.replace(/\D/g,'').length>=10,'Informe um telefone com DDD.');
  const old=s.families.find(x=>x.id===p.id);
  if(p.id){demand(old,'Família não encontrada.',404);Object.assign(old,{...f,createdAt:old.createdAt})}else{s.families.unshift(f)}
  log(s,actor,`${p.id?'Cadastro atualizado':'Família cadastrada'}: ${f.name}`);
 }else if(action==='family.delete'){
  const f=s.families.find(x=>x.id===p.id);demand(f,'Família não encontrada.',404);
  demand(!s.deliveries.some(x=>x.familyId===p.id),'Esta família possui retiradas registradas e não pode ser excluída.');
  s.families=s.families.filter(x=>x.id!==p.id);log(s,actor,`Cadastro excluído: ${f.name}`);
 }else if(action==='delivery.create'){
  const f=s.families.find(x=>x.id===p.id);demand(f,'Família não encontrada.',404);
  demand(!s.deliveries.some(x=>x.familyId===p.id&&x.eventId===s.eventId),'A retirada desta família já foi registrada neste evento.',409);
  const quantity=baskets(f.residents);demand(totals(s).stock>=quantity,'Estoque insuficiente. Confirme uma entrada antes da retirada.',409);
  s.deliveries.unshift({id,familyId:f.id,eventId:s.eventId,quantity,at:now,by:actor.name});
  log(s,actor,`Retirada registrada: ${f.name} · ${quantity} ${quantity===1?'cesta':'cestas'}`);
 }else if(action==='delivery.edit'){
  demand(role==='admin','Somente o administrador principal pode corrigir uma retirada.',403);
  const d=s.deliveries.find(x=>x.id===p.id);demand(d,'Retirada não encontrada.',404);
  demand(p.expected&&p.expected.familyId===d.familyId&&p.expected.quantity===d.quantity,'Esta retirada foi alterada. Atualize a página antes de corrigir.',409);
  const f=s.families.find(x=>x.id===p.familyId);demand(f,'Selecione a família correta.',404);
  demand(f.id!==d.familyId,'Selecione uma família diferente da registrada.');
  demand(!s.deliveries.some(x=>x.id!==d.id&&x.familyId===f.id&&x.eventId===d.eventId),'A família selecionada já possui retirada neste evento.',409);
  const quantity=baskets(f.residents);
  demand(totals(s).stock+d.quantity>=quantity,'Estoque insuficiente para corrigir esta retirada.',409);
  const reason=txt(p.reason,'Motivo da correção',3,300);
  const previous=s.families.find(x=>x.id===d.familyId)?.name||'Família anterior';
  const description=`${previous} (${d.quantity} cesta(s)) → ${f.name} (${quantity} cesta(s))`;
  d.corrections=[...(d.corrections||[]),{at:now,by:actor.name,reason,description}];
  d.familyId=f.id;d.quantity=quantity;
  log(s,actor,`Retirada corrigida: ${description}. Motivo: ${reason}`);
 }else if(action==='delivery.undo'){
  demand(role==='admin','Somente o administrador principal pode estornar uma retirada.',403);
  const d=s.deliveries.find(x=>x.id===p.id);demand(d,'Retirada não encontrada.',404);
  s.deliveries=s.deliveries.filter(x=>x.id!==p.id);log(s,actor,`Retirada estornada: ${s.families.find(f=>f.id===d.familyId)?.name} · ${d.quantity} cesta(s) devolvida(s) ao estoque`);
 }else if(action==='donation.create'||action==='purchase.create'||action==='basket.create'){
  demand(finance,'Acesso restrito ao perfil financeiro.',403);
  const type=action.split('.')[0] as Entry['type'];
  const amount=type==='basket'?0:money(p.amount);const quantity=type==='donation'?0:count(p.quantity);
  if(type==='purchase')demand(amount<=totals(s).balance,'Saldo insuficiente para confirmar esta compra. Registre a arrecadação primeiro.',409);
  const note=txt(p.note,'Descrição',3,200);
  s.entries.unshift({id,type,amount,quantity,note,at:now,by:actor.name});
  log(s,actor,type==='donation'?`Arrecadação registrada: ${currency(amount)}`:`Entrada confirmada: ${quantity} cesta(s) · ${note}`,'finance');
 }else if(action==='entry.edit'){
  demand(finance,'Acesso restrito ao perfil financeiro.',403);
  const entry=s.entries.find(x=>x.id===p.id);demand(entry,'Lançamento não encontrado.',404);
  demand(p.expected&&p.expected.amount===entry.amount&&p.expected.quantity===entry.quantity&&p.expected.note===entry.note,'Este lançamento foi alterado. Atualize a página antes de corrigir.',409);
  const amount=entry.type==='basket'?0:money(p.amount);
  const quantity=entry.type==='donation'?0:count(p.quantity);
  const note=txt(p.note,'Descrição',3,200),reason=txt(p.reason,'Motivo da correção',3,300);
  const t=totals(s);
  demand(t.stock-entry.quantity+quantity>=0,'Esta correção deixaria o estoque negativo. Corrija ou estorne as retiradas vinculadas antes de reduzir a entrada.',409);
  if(entry.type==='purchase'&&amount>entry.amount)demand(amount-entry.amount<=t.balance,'Saldo insuficiente para aumentar o valor desta compra.',409);
  const label=entry.type==='donation'?'Arrecadação':entry.type==='purchase'?'Compra / montagem':'Cestas doadas';
  const description=`${label}: ${currency(entry.amount)} → ${currency(amount)}; ${entry.quantity} → ${quantity} cesta(s); descrição: “${entry.note}” → “${note}”`;
  entry.corrections=[...(entry.corrections||[]),{at:now,by:actor.name,reason,description}];
  entry.amount=amount;entry.quantity=quantity;entry.note=note;
  log(s,actor,`Lançamento corrigido: ${description}. Motivo: ${reason}`,'finance');
 }else if(action==='cost.save'){
  demand(finance,'Acesso restrito ao perfil financeiro.',403);s.cost=money(p.cost);log(s,actor,'Custo de referência da cesta atualizado','finance');
 }else if(action==='registration.approve'){
  demand(role==='admin','Somente o administrador principal pode aprovar cadastros.',403);
  demand(p.role==='common'||p.role==='finance','Selecione um perfil válido.');
  const registration=p.registration;
  demand(registration&&typeof registration.userId==='string'&&registration.userId.startsWith('password:'),'Cadastro inválido.');
  const email=txt(registration.email,'E-mail',5,180).toLowerCase(),name=txt(registration.name,'Nome',2,100);
  const existing=s.members.find(m=>m.email===email);
  demand(!existing?.userId||existing.userId===registration.userId,'Este e-mail já está vinculado a outra conta.',409);
  demand(!existing||existing.role!=='admin','O administrador principal mantém seu acesso.');
  demand(!s.members.some(m=>m.userId===registration.userId),'Este cadastro já foi aprovado.',409);
  if(existing){existing.userId=registration.userId;existing.name=name;existing.role=p.role;existing.active=true}
  else{s.members.push({id,userId:registration.userId,name,email,role:p.role,active:true})}
  log(s,actor,`Cadastro aprovado: ${name} · ${roles[p.role as Role]}`,'admin');
 }else if(action==='member.save'){
  demand(role==='admin','Somente o administrador principal pode gerenciar permissões.',403);
  const old=s.members.find(x=>x.id===p.id);demand(!old||old.role!=='admin','O administrador principal mantém seu acesso.');
  demand(p.role==='common'||p.role==='finance','Selecione um perfil válido.');
  const email=txt(p.email,'E-mail',5,180).toLowerCase();demand(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Informe um e-mail válido.');
  demand(!s.members.some(x=>x.email===email&&x.id!==p.id),'Este e-mail já está cadastrado.',409);
  if(old){demand(old.email===email,'O e-mail de uma conta existente não pode ser alterado.');old.name=txt(p.name,'Nome',2,100);old.role=p.role;old.active=p.active!==false}
  else{s.members.push({id,userId:null,name:txt(p.name,'Nome',2,100),email,role:p.role,active:p.active!==false})}
  log(s,actor,`Permissões atualizadas: ${email}`,'admin');
 }else if(action==='event.save'){
  demand(role==='admin','Somente o administrador principal pode configurar eventos.',403);
  const name=txt(p.name,'Nome do evento',3,100);const date=txt(p.date,'Data',10,10);
  demand(/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date)),'Informe uma data válida.');
  if(p.newEvent){s.events.unshift({id,name,date});s.eventId=id}else{const e=s.events.find(x=>x.id===s.eventId)!;e.name=name;e.date=date}
  log(s,actor,p.newEvent?`Novo evento criado: ${name}`:`Evento atualizado: ${name}`,'admin');
 }else if(action==='event.select'){
  demand(role==='admin','Somente o administrador principal pode mudar o evento.',403);demand(s.events.some(x=>x.id===p.id),'Evento não encontrado.');s.eventId=p.id;
 }else if(action==='demo.load'){
  demand(role==='admin','Somente o administrador principal pode carregar exemplos.',403);
  demand(!s.demoLoaded&&s.families.length===0&&s.entries.length===0&&s.deliveries.length===0,'Os exemplos só podem ser carregados em um ambiente vazio.');
  const examples=[['Maria de Oliveira','Olaria',3],['José Carlos Santos','Jardim São Pedro',5],['Ana Paula Ferreira','Olaria',2],['Marcos Antônio Lima','Centro',6],['Juliana Rodrigues','Jardim São Pedro',4],['Pedro Henrique Alves','Olaria',1],['Beatriz Costa','Centro',3],['Antônia Ribeiro','Jardim das Oliveiras',5],['Luciana Souza','Olaria',2],['Rafael Pereira','Centro',4],['Cláudia Martins','Jardim das Oliveiras',3],['Paulo Roberto Dias','Olaria',6]];
  s.families=examples.map(([name,neighborhood,residents],i)=>({id:`demo-${i}`,name:String(name),neighborhood:String(neighborhood),residents:Number(residents),phone:`(11) 90000-${String(i+1).padStart(4,'0')}`,address:`Rua de Exemplo, ${(i+1)*10}`,notes:'Cadastro fictício para testar o fluxo.',createdAt:now,demo:true}));
  s.entries=[{id:'demo-donation',type:'donation',amount:720000,quantity:0,note:'Arrecadação de exemplo',at:now,by:actor.name,demo:true},{id:'demo-purchase',type:'purchase',amount:420000,quantity:28,note:'Montagem de cestas de exemplo',at:now,by:actor.name,demo:true}];
  s.deliveries=[0,1,2].map(i=>({id:`demo-delivery-${i}`,familyId:`demo-${i}`,eventId:s.eventId,quantity:baskets(Number(examples[i][2])),at:now,by:actor.name,demo:true}));
  s.demoLoaded=true;const e=s.events.find(x=>x.id===s.eventId)!;e.name='Ação solidária · demonstração';e.date='2026-12-19';log(s,actor,'Dados fictícios carregados para teste','admin');
 }else if(action==='demo.clear'){
  demand(role==='admin','Somente o administrador principal pode limpar os exemplos.',403);
  demand(s.demoLoaded,'Não há exemplos para limpar.');
  demand(s.families.every(f=>f.demo)&&s.entries.every(e=>e.demo)&&s.deliveries.every(d=>d.demo),'Há registros adicionados após os exemplos. Para preservar seu teste, a limpeza automática está bloqueada.');
  s.families=[];s.entries=[];s.deliveries=[];s.demoLoaded=false;log(s,actor,'Dados fictícios removidos','admin');
 }else{throw new AppError('Operação desconhecida.',404)}
 return s;
}
export function visibleState(s:State,actor:Member,role:Role){
 const t=totals(s);
 return {families:s.families,events:s.events,eventId:s.eventId,deliveries:s.deliveries,
 entries:role==='common'?[]:s.entries,cost:role==='common'?null:s.cost,
 totals:role==='common'?{stock:t.stock,incoming:t.incoming,outgoing:t.outgoing}:t,
 members:role==='admin'?s.members:[],activity:role==='common'?s.activity.filter(a=>a.scope==='operations'||!a.scope&&/^(Família|Cadastro|Retirada)/.test(a.message)):s.activity,
 demoLoaded:s.demoLoaded,user:{...actor,role,actualRole:actor.role}};
}
