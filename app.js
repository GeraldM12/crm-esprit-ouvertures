// ===== DATA =====
const PRODUCTS=['Porte d\'entrée','Fenêtre','Volet roulant','Volet battant','Porte de garage','Pergola / véranda','VELUX','Portail','Portillon','Clôture','Autre'];
const STATUTS=['Prospect','À relancer','Devis envoyé','Signé','Perdu'];
const CALL_RESULTS=['Contacté — intéressé','Contacté — pas intéressé','Messagerie','Rappel demandé','Pas répondu']7
const TODAY=new Date().toISOString().split('T')[0];

function loadData(){
  try{return JSON.parse(localStorage.getItem('crm_clients'))||defaultClients();}catch{return defaultClients();}
}
function saveData(){
  try{localStorage.setItem('crm_clients',JSON.stringify(clients));}catch(e){console.warn('Storage full');}
}
function loadZones(){
  try{return JSON.parse(localStorage.getItem('crm_zones'))||defaultZones();}catch{return defaultZones();}
}
function saveZones(){
  try{localStorage.setItem('crm_zones',JSON.stringify(zones));}catch(e){}
}

function defaultClients(){
  return [
    {id:1,nom:'Dupont',prenom:'Michel',adresse:'12 rue des Lilas',cp:'77390',ville:'Guignes',tel:'06 12 34 56 78',email:'m.dupont@email.fr',statut:'Devis envoyé',produits:[{nom:'Fenêtre',qty:4},{nom:'Volet roulant',qty:4}],notes:'Double vitrage souhaité.',r1:{date:'2026-03-25',heure:'10:00',note:'Présentation devis'},r2:null,dateVisite:'2026-03-18',rappel:'2026-03-25',historique:[{date:'18/03/2026',texte:'Premier contact porte-à-porte.'}],appels:[{date:'20/03/2026',heure:'14h30',resultat:'Contacté — intéressé',note:'Confirme R1'}],photos:[],debrief:'',lat:48.5661,lng:2.7312},
    {id:2,nom:'Martin',prenom:'Sophie',adresse:'5 allée des Roses',cp:'77390',ville:'Guignes',tel:'06 98 76 54 32',email:'s.martin@email.fr',statut:'À relancer',produits:[{nom:'Porte d\'entrée',qty:1}],notes:'Veut réfléchir.',r1:{date:'2026-04-05',heure:'09:00',note:''},r2:null,dateVisite:'2026-03-15',rappel:'2026-04-02',historique:[{date:'15/03/2026',texte:'Intéressée mais veut réfléchir.'}],appels:[],photos:[],debrief:'',lat:48.5648,lng:2.7298},
    {id:3,nom:'Bernard',prenom:'Jean-Luc',adresse:'8 rue du Moulin',cp:'77390',ville:'Guignes',tel:'06 55 44 33 22',email:'jl.bernard@email.fr',statut:'Signé',produits:[{nom:'Pergola / véranda',qty:1}],notes:'Contrat signé 10/03.',r1:{date:'2026-03-08',heure:'14:00',note:'Devis'},r2:{date:'2026-03-10',heure:'10:00',note:'Signature'},dateVisite:'2026-03-05',rappel:'',historique:[{date:'05/03/2026',texte:'Premier contact.'},{date:'10/03/2026',texte:'Contrat signé !'}],appels:[],photos:[],debrief:'Client très satisfait. Budget validé dès le premier RDV.',lat:48.5672,lng:2.7285},
    {id:4,nom:'Leroy',prenom:'Isabelle',adresse:'3 impasse du Chêne',cp:'77390',ville:'Guignes',tel:'06 77 88 99 00',email:'i.leroy@email.fr',statut:'Prospect',produits:[{nom:'Porte de garage',qty:1},{nom:'Portail',qty:1}],notes:'Automatisation portail + garage.',r1:null,r2:null,dateVisite:'2026-03-20',rappel:'2026-03-27',historique:[{date:'20/03/2026',texte:'Très réceptive.'}],appels:[],photos:[],debrief:'',lat:48.5655,lng:2.7325},
  ];
}
function defaultZones(){
  return [
    {id:1,nom:'Rue des Lilas',ville:'Guignes',date:'2026-03-18',nb:8,visites:5,contacts:3,lat:48.5661,lng:2.7312},
    {id:2,nom:'Allée des Roses',ville:'Guignes',date:'2026-03-15',nb:12,visites:12,contacts:7,lat:48.5648,lng:2.7298},
    {id:3,nom:'Rue du Moulin',ville:'Guignes',date:'2026-03-05',nb:6,visites:4,contacts:2,lat:48.5672,lng:2.7285},
    {id:4,nom:'Route de Melun',ville:'Guignes',date:'2026-03-10',nb:20,visites:8,contacts:4,lat:48.5638,lng:2.7340},
  ];
}

let clients=loadData();
let zones=loadZones();
let gpsActive=false,currentPos=null,gpsWatchId=null;
let currentTab='dashboard',selId=clients[0]?.id||1,filterSt='Tous';
let scanPhase='scan',scanImageB64=null,scanPreviewUrl=null,scanData=null,lastCreated=null;

// ===== HELPERS =====
function avCol(id){return['ag','aa','ab','ac','ax'][id%5]}
function ini(c){return(c.prenom[0]||'')+(c.nom[0]||'')}
function bclass(s){if(s==='Prospect')return'bp';if(s==='À relancer')return'br';if(s==='Devis envoyé')return'bd';if(s==='Signé')return'bs';return'bl'}
function dd(d){if(!d)return null;return Math.ceil((new Date(d)-new Date(TODAY))/86400000)}
function fmt(d){if(!d)return'—';try{return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}catch{return d}}
function toast(m){const e=document.getElementById('toast');e.textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2500)}
function nextId(arr){return Math.max(...arr.map(x=>x.id),0)+1}

// ===== NAVIGATION =====
function showTab(t){
  currentTab=t;
  document.querySelectorAll('.nav button:not(.scan-btn)').forEach((b,i)=>b.classList.toggle('active',['dashboard','clients','prospection','relances','export'][i]===t));
  document.querySelector('.scan-btn').classList.toggle('active',d==='scanner');
  if(t==='scanner'){scanPhase='scan';scanImageB64=null;scanPreviewUrl=null;}
  render();
}

function render(){
  const el=document.getElementById('content');
  if(currentTab==='dashboard')el.innerHTML=renderDash();
  else if(currentTab==='clients')el.innerHTML=renderClients();
  else if(currentTab==='prospection')el.innerHTML=renderProspection();
  else if(currentTab==='relances')el.innerHTML=renderRelances();
  else if(currentTab==='export')el.innerHTML=renderExport();
  else if(currentTab==='scanner')el.innerHTML=renderScanner();
  if(currentTab==='prospection')setTimeout(drawMap,60);
}

// ===== DASHBOARD =====
function renderDash(){
  const t=clients.length,s=clients.filter(c=>c.statut==='Signé').length,d=clients.filter(c=>c.statut==='Devis envoyé').length;
  const rdvAuj=clients.filter(c=>(c.r1&&c.r1.date===TODAY)||(c.r2&&c.r2.date===TODAY)).length;
  const up=clients.filter(c=>c.rappel&&dd(c.rappel)!==null&&dd(c.rappel)<=7&&dd(c.rappel)>=0).sort((a,b)=>dd(a.rappel)-dd(b.rappel)).slice(0,5);
  const pipeline=STATUTS.map(st=>{
    const ph=st==='À relancer'?'br':st==='Devis envoyé'?'bd':st==='Signé'?'bs':st==='Perdu'?'bl':'bp';
    const list=clients.filter(c=>c.statut===st);
    return`<div class="pc"><div class="ph ${ph}">${st} (${list.length})</div>${list.map(c=>`<div class="pcard" onclick="goTo(${c.id})"><div style="font-weight:600">${c.prenom} ${c.nom}</div><div style="color:var(--text-m);font-size:10px">${c.produits.map(p=>p.qty>1?p.qty+'× '+p.nom:p.nom).join(', ')}</div></div>`).join('')}</div>`;
  }).join('');
  return`
  <div class="stats">
    <div class="stat"><div class="stat-l">Clients</div><div class="stat-v">${t}</div></div>
    <div class="stat"><div class="stat-l">Devis</div><div class="stat-v">${d}</div></div>
    <div class="stat"><div class="stat-l">Signés</div><div class="stat-v">${s}</div></div>
    <div class="stat"><div class="stat-l">RDV auj.</div><div class="stat-v">${rdvAuj}</div></div>
  </div>
  <div style="margin-bottom:12px">
    <div style="background:var(--green-light);border-radius:12px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="showTab('scanner')">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.7);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="#1D9E75" stroke-width="1.5"/><rect x="11.5" y="1.5" width="5" height="5" rx="1" stroke="#1D9E75" stroke-width="1.5"/><rect x="1.5" y="11.5" width="5" height="5" rx="1" stroke="#1D9E75" stroke-width="1.5"/><path d="M11.5 11.5h2v2h-2zM15 11.5h1.5M11.5 15v1.5M15 15h1.5v1.5H15z" stroke="#1D9E75" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--green-text)">Scanner une fiche contact</div>
          <div style="font-size:11px;color:var(--green)">IA · Carte de visite · Fiche papier · Manuscrit</div>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
  </div>
  <div style="margin-bottom:12px"><div class="sh"><div class="st">Pipeline</div></div>
    <div class="card"><div class="pipe">${pipeline}</div></div>
  </div>
  <div><div class="sh"><div class="st">Rappels à venir (7j)</div></div>
    ${up.length===0?'<div style="text-align:center;padding:16px;color:var(--text-m);font-size:12px">Aucun rappel dans les 7 jours</div>':
    `<div>${up.map(c=>{const dv=dd(c.rappel);return`<div class="rem-item" onclick="goTo(${c.id})"><div class="rdot ${dv===0?'du':dv<=2?'dt':'ds'}"></div><div style="flex:1"><div style="font-size:12px;font-weight:600">${c.prenom} ${c.nom}</div><div style="font-size:11px;color:var(--text-m)">${c.produits.map(p=>p.qty>1?p.qty+'× '+p.nom:p.nom).join(', ')}</div></div><div style="font-size:11px;color:var(--text-m)">${dv===0?'Aujourd\'hui':dv===1?'Demain':'J+'+dv}</div></div>`;}).join('')}</div>`}
  </div>`;
}

// ===== SCANNER IA =====
function renderScanner(){
  if(scanPhase==='scan')return renderScanPhase();
  if(scanPhase==='analyze')return renderAnalyzePhase();
  if(scanPhase==='verify')return renderVerifyPhase();
  if(scanPhase==='done')return renderDonePhase();
  return '';
}
function scanSteps(a){return`<div class="steps">${['1 · Scanner','2 · Analyse IA','3 · Vérifier','4 · Créé'].map((s,i)=>`<div class="step ${i+1<a?'done':i+1===a?'active':''}">${s}</div>`).join('')}</div>`;}

function renderScanPhase(){return`<div style="max-width:480px;margin:0 auto">
  ${scanSteps(1)}
  <div class="scan-zone" onclick="document.getElementById('scan-input').click()">
    <div class="scan-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="var(--green)" stroke-width="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="var(--green)" stroke-width="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="var(--green)" stroke-width="1.5"/><path d="M14 14h2v2h-2zM18 14h3M14 18v3M18 18h3v3h-3z" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div style="font-size:14px;font-weight:700;margin-bottom:4px">Scanner une fiche contact</div>
    <div style="font-size:12px;color:var(--text-m)">Carte de visite · Fiche papier · Manuscrit · Screenshot</div>
  </div>
  <input type="file" id="scan-input" accept="image/*" capture="environment" style="display:none" onchange="handleScanFile(this)">
  <button class="btn btn-g" style="width:100%;justify-content:center;padding:12px;font-size:13px;margin-bottom:8px" onclick="document.getElementById('scan-input').click()">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5V3a1 1 0 011-1h2M11 2h2a1 1 0 011 1v2M14 11v2a1 1 0 01-1 1h-2M5 14H3a1 1 0 01-1-1v-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.4"/></svg>
    Prendre une photo / Importer
  </button>
  <div style="text-align:center;font-size:11px;color:var(--text-m)">Tester sans photo → <button class="btn btn-o btn-sm" onclick="useDemo()" style="margin-left:4px">Démo</button></div>
</div>`;}

function renderAnalyzePhase(){return`<div style="max-width:480px;margin:0 auto">
  ${scanSteps(2)}
  ${scanPreviewUrl?`<img src="${scanPreviewUrl}" class="prev-img" alt="">`:''}
  <div class="ai-status ai-think">
    <div class="pulse"></div>
    <span id="ai-msg">Analyse de l'image en cours...</span>
  </div>
</div>`;}

function renderVerifyPhase(){
  const d=scanData||{};
  return`<div style="max-width:480px;margin:0 auto">
  ${scanSteps(3)}
  ${scanPreviewUrl?`<img src="${scanPreviewUrl}" class="prev-img" alt="">`:''}
  <div class="ai-status ai-ok">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    Informations extraites — vérifiez avant d'enregistrer
  </div>
  <div class="g2">
    <div class="field-row"><label>Prénom</label><input id="v-prenom" value="${d.prenom||''}" class="${d.prenom?'pre':''}">
      ${d.confidence?.prenom?`<span class="confidence ${d.confidence.prenom==='high'?'conf-h':'conf-l'}">${d.confidence.prenom==='high'?'Certain':'À vérifier'}</span>`:''}</div>
    <div class="field-row"><label>Nom</label><input id="v-nom" value="${d.nom||''}" class="${d.nom?'pre':''}">
      ${d.confidence?.nom?`<span class="confidence ${d.confidence.nom==='high'?'conf-h':'conf-l'}">${d.confidence.nom==='high'?'Certain':'À vérifier'}</span>`:''}</div>
  </div>
  <div class="field-row"><label>Adresse</label><input id="v-adresse" value="${d.adresse||''}" class="${d.adresse?'pre':''}"></div>
  <div class="g2">
    <div class="field-row"><label>Code postal</label><input id="v-cp" value="${d.cp||'77390'}" class="${d.cp?'pre':''}"></div>
    <div class="field-row"><label>Ville</label><input id="v-ville" value="${d.ville||'Guignes'}" class="${d.ville?'pre':''}"></div>
  </div>
  <div class="g2">
    <div class="field-row"><label>Téléphone</label><input id="v-tel" value="${d.tel||''}" class="${d.tel?'pre':''}">
      ${d.confidence?.tel?`<span class="confidence ${d.confidence.tel==='high'?'conf-h':'conf-l'}">${d.confidence.tel==='high'?'Certain':'À vérifier'}</span>`:''}</div>
    <div class="field-row"><label>Email</label><input id="v-email" value="${d.email||''}" class="${d.email?'pre':''}">
      ${d.confidence?.email?`<span class="confidence ${d.confidence.email==='high'?'conf-h':'conf-l'}">${d.confidence.email==='high'?'Certain':'À vérifier'}</span>`:''}</div>
  </div>
  <div class="field-row"><label>Notes extraites</label><input id="v-notes" value="${d.notes||''}" class="${d.notes?'pre':''}"></div>
  <div style="display:flex;gap:8px;margin-top:12px">
    <button class="btn btn-o" onclick="resetScanner()" style="flex:1">Recommencer</button>
    <button class="btn btn-g" onclick="confirmScanCreate()" style="flex:2">Créer le client</button>
  </div>
</div>`;}

function renderDonePhase(){const c=lastCreated;return`<div style="max-width:480px;margin:0 auto;text-align:center;padding:28px 16px">
  ${scanSteps(4)}
  <div style="width:56px;height:56px;border-radius:50%;background:var(--green-light);display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M5 13l6 6L21 7" stroke="var(--green)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>
  <div style="font-size:15px;font-weight:700;margin-bottom:4px">${c?c.prenom+' '+c.nom:''}</div>
  <div style="font-size:12px;color:var(--text-m);margin-bottom:20px">Client créé avec succès !</div>
  <div style="display:flex;flex-direction:column;gap:8px;max-width:280px;margin:0 auto">
    <button class="btn btn-g" style="width:100%;justify-content:center" onclick="goTo(${c?c.id:1})">Ouvrir la fiche client</button>
    <button class="btn btn-o" style="width:100%;justify-content:center" onclick="resetScanner()">Scanner une autre fiche</button>
  </div>
</div>`;}

function handleScanFile(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    scanPreviewUrl=e.target.result;
    scanImageB64=e.target.result.split(',')[1];
    scanPhase='analyze';render();
    startAIAnalysis(false);
  };
  reader.readAsDataURL(file);
}

function useDemo(){
  scanPreviewUrl=null;scanImageB64=null;scanPhase='analyze';render();
  startAIAnalysis(true);
}

async function startAIAnalysis(isDemo){
  const msgs=isDemo
    ?[{role:'user',content:[{type:'text',text:'Voici le contenu texte d\'une fiche contact:\n\nJean-Pierre Lefebvre\n15 avenue du Parc\n77390 Guignes\nTel: 06 23 45 67 89\njp.lefebvre@email.fr\nIntéressé par 3 fenêtres PVC double vitrage\n\nRéponds UNIQUEMENT en JSON sans markdown: {"prenom":"","nom":"","adresse":"","cp":"","ville":"","tel":"","email":"","notes":"","confidence":{"prenom":"high","nom":"high","tel":"high","email":"high"}}'}]}]
    :[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:scanImageB64}},{type:'text',text:'Analyse cette image (carte de visite, fiche papier, manuscrit) et extrait les coordonnées du contact pour un CRM de menuiserie en France. Réponds UNIQUEMENT avec un objet JSON valide sans markdown:\n{"prenom":"","nom":"","adresse":"","cp":"","ville":"","tel":"","email":"","notes":"","confidence":{"prenom":"high/low","nom":"high/low","tel":"high/low","email":"high/low"}}\nRègles: champs vides si absent, confidence high=certain/low=douteux, notes=infos utiles, téléphone format "0X XX XX XX XX".'}]}];

  const rotating=['Détection du texte...','Identification des coordonnées...','Extraction des informations...','Vérification...'];
  let ri=0;
  const interval=setInterval(()=>{ri=(ri+1)%rotating.length;const el=document.getElementById('ai-msg');if(el)el.textContent=rotating[ri];},1100);

  try{
    const resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:500,messages:msgs})});
    clearInterval(interval);
    const data=await resp.json();
    const raw=data.content?.filter(b=>b.type==='text').map(b=>b.text).join('')||'{}';
    try{scanData=JSON.parse(raw.replace(/```json|```/g,'').trim());}
    catch{scanData={prenom:'',nom:'',adresse:'',cp:'77390',ville:'Guignes',tel:'',email:'',notes:'',confidence:{}};}
  }catch(err){
    clearInterval(interval);
    scanData={prenom:'',nom:'',adresse:'',cp:'77390',ville:'Guignes',tel:'',email:'',notes:'',confidence:{}};
    toast('Connexion impossible — remplissez manuellement');
  }
  scanPhase='verify';render();
}

function confirmScanCreate(){
  const c={id:nextId(clients),prenom:document.getElementById('v-prenom').value||'?',nom:document.getElementById('v-nom').value||'?',adresse:document.getElementById('v-adresse').value||'',cp:document.getElementById('v-cp').value||'77390',ville:document.getElementById('v-ville').value||'Guignes',tel:document.getElementById('v-tel').value||'',email:document.getElementById('v-email').value||'',statut:'Prospect',produits:[{nom:'—',qty:1}],notes:document.getElementById('v-notes').value||'',r1:null,r2:null,dateVisite:TODAY,rappel:'',historique:[{date:new Date().toLocaleDateString('fr-FR'),texte:'Créé via scan IA.'}],appels:[],photos:[],debrief:'',lat:currentPos?currentPos.lat:null,lng:currentPos?currentPos.lng:null};
  clients.push(c);saveData();lastCreated=c;scanPhase='done';render();
}
function resetScanner(){scanPhase='scan';scanImageB64=null;scanPreviewUrl=null;scanData=null;render();}

// ===== CLIENTS =====
function renderClients(){
  let fil=clients;if(filterSt!=='Tous')fil=clients.filter(c=>c.statut===filterSt);
  const c=clients.find(c=>c.id===selId)||clients[0];
  return`<div class="two">
    <div>
      <input class="sb" placeholder="Rechercher..." oninput="filterSearch(this.value)">
      <div class="frow">${['Tous',...STATUTS].map(s=>`<button class="fb ${filterSt===s?'active':''}" onclick="setSt('${s}')">${s}</button>`).join('')}</div>
      <div class="sh"><div class="st">${fil.length} client${fil.length>1?'s':''}</div>
        <div style="display:flex;gap:5px">
          <button class="btn btn-o btn-sm" onclick="showTab('scanner')">Scanner</button>
          <button class="btn btn-g btn-sm" onclick="openNew()">+ Nouveau</button>
        </div>
      </div>
      <div class="clist" id="clist">${renderList(fil)}</div>
    </div>
    <div>${c?renderDetail(c):'<div style="text-align:center;padding:30px;color:var(--text-m)">Sélectionnez un client</div>'}</div>
  </div>`;
}
function renderList(list){return list.map(c=>`<div class="cc ${c.id===selId?'sel':''}" onclick="selClient(${c.id})">
  <div style="display:flex;align-items:center;gap:8px">
    <div class="av ${avCol(c.id)}">${ini(c)}</div>
    <div class="ci"><div class="cn">${c.prenom} ${c.nom}</div><div class="ca">${c.adresse}, ${c.ville}</div></div>
  </div>
  <div class="cm"><span class="badge ${bclass(c.statut)}">${c.statut}</span>
    ${c.r1?`<span class="badge r1b">R1 ${fmt(c.r1.date)}</span>`:''}
    ${c.r2?`<span class="badge r2b">R2 ${fmt(c.r2.date)}</span>`:''}
    ${c.produits.slice(0,2).map(p=>`<span class="tag">${p.qty>1?p.qty+'× ':''} ${p.nom}</span>`).join('')}
  </div>
</div>`).join('');}

function renderDetail(c){
  return`<div class="card" style="overflow-y:auto;max-height:560px">
  <div style="display:flex;gap:9px;align-items:flex-start;margin-bottom:11px;padding-bottom:10px;border-bottom:0.5px solid var(--bdr)">
    <div class="av ${avCol(c.id)}" style="width:38px;height:38px;font-size:13px">${ini(c)}</div>
    <div style="flex:1"><div style="font-size:14px;font-weight:700">${c.prenom} ${c.nom}</div>
      <div style="font-size:12px;color:var(--text-m)">${c.adresse}, ${c.cp} ${c.ville}</div>
      <div style="margin-top:4px"><span class="badge ${bclass(c.statut)}">${c.statut}</span></div>
    </div>
  </div>
  <div class="g2" style="margin-bottom:10px">
    <div class="df"><label>Téléphone</label><div class="v">${c.tel||'—'}</div></div>
    <div class="df"><label>Email</label><div class="v" style="font-size:11px">${c.email||'—'}</div></div>
    <div class="df"><label>Visite</label><div class="v">${fmt(c.dateVisite)}</div></div>
    <div class="df"><label>Rappel</label><div class="v">${fmt(c.rappel)}</div></div>
  </div>
  <div class="df" style="margin-bottom:9px"><label>Statut</label>
    <select class="sel-s" onchange="updateSt(${c.id},this.value)">${STATUTS.map(s=>`<option ${c.statut===s?'selected':''}>${s}</option>`).join('')}</select>
  </div>
  <div class="rdv-block">
    <div style="font-size:11px;font-weight:600;color:var(--text-m);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Rendez-vous</div>
    ${c.r1?`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px"><div><span class="badge r1b" style="margin-right:5px">R1</span><span style="font-size:12px;font-weight:600">${fmt(c.r1.date)} ${c.r1.heure?'à '+c.r1.heure:''}</span>${c.r1.note?`<div style="font-size:11px;color:var(--text-m)">${c.r1.note}</div>`:''}</div><button class="btn btn-o btn-sm" onclick="editRdv(${c.id},'r1')">Modifier</button></div>`:
    `<button class="btn btn-o btn-sm" onclick="editRdv(${c.id},'r1')" style="margin-bottom:5px">+ Ajouter R1</button>`}
    ${c.r2?`<div style="display:flex;align-items:center;justify-content:space-between"><div><span class="badge r2b" style="margin-right:5px">R2</span><span style="font-size:12px;font-weight:600">${fmt(c.r2.date)} ${c.r2.heure?'à '+c.r2.heure:''}</span>${c.r2.note?`<div style="font-size:11px;color:var(--text-m)">${c.r2.note}</div>`:''}</div><button class="btn btn-o btn-sm" onclick="editRdv(${c.id},'r2')">Modifier</button></div>`:
    (c.r1?`<button class="btn btn-o btn-sm" onclick="editRdv(${c.id},'r2')">+ Ajouter R2</button>`:'')}
  </div>
  <div style="margin-bottom:9px">
    <div style="font-size:11px;font-weight:600;color:var(--text-m);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px">Produits</div>
    <div style="background:var(--bg-surf);border-radius:8px;padding:8px 10px">
      ${c.produits.map((p,i)=>`<div class="qty-row"><span style="font-size:12px">${p.nom}</span><div style="display:flex;align-items:center;gap:5px"><button class="qty-btn" onclick="changeQty(${c.id},${i},-1)">−</button><span class="qty-val">${p.qty}</span><button class="qty-btn" onclick="changeQty(${c.id},${i},1)">+</button><button class="btn btn-o btn-sm" style="padding:2px 6px;font-size:10px" onclick="removeProd(${c.id},${i})">×</button></div></div>`).join('')}
      <button class="btn btn-o btn-sm" style="margin-top:5px" onclick="addProd(${c.id})">+ Ajouter</button>
    </div>
  </div>
  <div class="df" style="margin-bottom:9px"><label>Notes</label>
    <textarea class="ta" onblur="updateNotes(${c.id},this.value)">${c.notes}</textarea>
  </div>
  <div style="margin-bottom:9px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
      <div style="font-size:11px;font-weight:600;color:var(--text-m);text-transform:uppercase;letter-spacing:.04em">Suivi appels (${c.appels.length})</div>
      <button class="btn btn-o btn-sm" onclick="addAppel(${c.id})">+ Appel</button>
    </div>
    <div>${c.appels.length===0?`<div style="font-size:11px;color:var(--text-m)">Aucun appel enregistré</div>`:
    c.appels.map(a=>`<div class="call-item"><div class="ci-i ${a.resultat.includes('intéressé')?'ci-green':a.resultat.includes('Messagerie')||a.resultat.includes('répondu')?'ci-gray':'ci-amber'}"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 2C1.5 2 2.5 3.5 3.5 4.5S5.5 6.5 5.5 6.5l1-1 2 2-1.5 1.5C5.5 10 2.5 8.5 1.5 7.5S0 4.5 1 3L1.5 2z" fill="currentColor" opacity=".7"/></svg></div><div style="flex:1"><div style="font-size:11px;font-weight:600">${a.resultat}</div><div style="font-size:10px;color:var(--text-m)">${a.date} ${a.heure}${a.note?' — '+a.note:''}</div></div></div>`).join('')}</div>
  </div>
  <div class="debrief-block" style="margin-bottom:9px">
    <div style="font-size:11px;font-weight:600;color:var(--text-m);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Débrief RDV (Plaud Note)</div>
    ${c.debrief?`<div style="font-size:12px;line-height:1.6">${c.debrief}</div><button class="btn btn-o btn-sm" style="margin-top:5px" onclick="importDebrief(${c.id})">Remplacer</button>`:
    `<div class="debrief-import" onclick="importDebrief(${c.id})"><div style="font-size:12px;color:var(--text-m)">Importer depuis Plaud Note</div><div style="font-size:11px;color:var(--text-h)">Coller texte ou fichier .txt</div></div>`}
  </div>
  <div style="margin-bottom:9px">
    <div style="font-size:11px;font-weight:600;color:var(--text-m);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px">Photos (${c.photos.length})</div>
    <div class="photo-grid">
      ${c.photos.map((p,i)=>`<img class="photo-thumb" src="${p}" onclick="document.getElementById('pv-img').src='${p}';document.getElementById('photo-viewer').classList.add('open')" alt="Photo ${i+1}">`).join('')}
      <div class="photo-add" onclick="addPhoto(${c.id})"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M9 6v6M6 9h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg><span>Photo</span></div>
    </div>
  </div>
  <div style="margin-bottom:9px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
      <div style="font-size:11px;font-weight:600;color:var(--text-m);text-transform:uppercase;letter-spacing:.04em">Historique</div>
      <button class="btn btn-o btn-sm" onclick="addHisto(${c.id})">+ Ajouter</button>
    </div>
    <div class="hlist">${c.historique.map(h=>`<div class="hi"><div class="hd">${h.date}</div>${h.texte}</div>`).join('')}</div>
  </div>
  <div style="display:flex;gap:6px;padding-top:10px;border-top:0.5px solid var(--bdr)">
    <button class="btn btn-g" style="flex:1;font-size:11px" onclick="openEdit(${c.id})">Modifier</button>
    <button class="btn btn-o" style="font-size:11px" onclick="confirmDel(${c.id})">Supprimer</button>
  </div>
</div>`;}

// ===== PROSPECTION =====
function renderProspection(){
  const tP=zones.reduce((a,z)=>a+z.nb,0),tV=zones.reduce((a,z)=>a+z.visites,0),tC=zones.reduce((a,z)=>a+z.contacts,0);
  return`<div style="display:flex;gap:7px;margin-bottom:10px;flex-wrap:wrap;align-items:center">
    <button class="btn ${gpsActive?'btn-g':'btn-o'}" onclick="toggleGPS()">${gpsActive?'GPS actif — Arrêter':'Démarrer GPS'}</button>
    ${currentPos?`<span style="font-size:11px;color:var(--text-m)">${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)}</span>`:''}
    <button class="btn btn-o" onclick="openNewZone()">+ Nouvelle zone</button>
  </div>
  <div style="background:var(--bg-card);border:0.5px solid var(--bdr);border-radius:var(--rl);height:260px;position:relative;overflow:hidden;margin-bottom:12px">
    <canvas id="map-canvas" style="width:100%;height:100%"></canvas>
    <div style="position:absolute;bottom:7px;right:7px;display:flex;gap:4px">
      <div style="display:flex;align-items:center;gap:4px;background:var(--bg-card);padding:3px 7px;border-radius:6px;border:0.5px solid var(--bdr)">
        <div style="width:8px;height:8px;border-radius:50%;background:var(--green)"></div><span style="font-size:10px;color:var(--text-m)">Zone</span>
        <div style="width:8px;height:8px;border-radius:50%;background:#378ADD;margin-left:5px"></div><span style="font-size:10px;color:var(--text-m)">Client</span>
        ${gpsActive?`<div style="width:8px;height:8px;border-radius:50%;background:var(--red);margin-left:5px"></div><span style="font-size:10px;color:var(--text-m)">Moi</span>`:''}
      </div>
    </div>
  </div>
  <div class="sh" style="margin-bottom:8px"><div class="st">Zones (${zones.length})</div><div style="font-size:11px;color:var(--text-m)">${tV}/${tP} portes · ${tC} contacts</div></div>
  <div style="display:flex;flex-direction:column;gap:7px">${zones.sort((a,b)=>b.date.localeCompare(a.date)).map(z=>`<div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-size:13px;font-weight:600">${z.nom}</div><div style="font-size:11px;color:var(--text-m)">${z.ville} · ${fmt(z.date)}</div></div><span class="badge bp">${z.contacts} contacts</span></div><div style="height:4px;background:var(--bg-surf);border-radius:2px;margin:7px 0 5px"><div style="height:4px;background:var(--green);border-radius:2px;width:${Math.round(z.visites/z.nb*100)}%"></div></div><div style="display:flex;gap:10px;font-size:11px;color:var(--text-m)"><span>${z.visites}/${z.nb} portes</span><span>Taux: <strong>${Math.round(z.contacts/z.visites*100)}%</strong></span></div></div>`).join('')}</div>`;
}

// ===== RELANCES =====
function renderRelances(){
  const raps=clients.filter(c=>c.rappel).map(c=>({...c,dv:dd(c.rappel)})).sort((a,b)=>a.dv-b.dv);
  const enR=raps.filter(r=>r.dv<0),auj=raps.filter(r=>r.dv===0),pro=raps.filter(r=>r.dv>0);
  const rdvs=clients.filter(c=>(c.r1&&dd(c.r1.date)!==null&&dd(c.r1.date)>=0&&dd(c.r1.date)<=7)||(c.r2&&dd(c.r2.date)!==null&&dd(c.r2.date)>=0&&dd(c.r2.date)<=7));
  function grp(title,list,dot){if(!list.length)return'';return`<div style="margin-bottom:13px"><div class="st" style="margin-bottom:6px">${title} (${list.length})</div><div>${list.map(c=>`<div class="rem-item" onclick="goTo(${c.id})"><div class="rdot ${dot}"></div><div style="flex:1"><div style="font-size:12px;font-weight:600">${c.prenom} ${c.nom}</div><div style="font-size:11px;color:var(--text-m)">${c.produits.map(p=>p.qty>1?p.qty+'× '+p.nom:p.nom).join(', ')}</div></div><div style="font-size:11px;color:var(--text-m)">${c.dv<0?'Retard '+Math.abs(c.dv)+'j':c.dv===0?'Auj.':'J+'+c.dv}</div></div>`).join('')}</div></div>`;}
  return`<div class="sh" style="margin-bottom:12px"><div class="st">Relances & rappels</div></div>
    ${enR.length+auj.length+pro.length===0?'<div style="text-align:center;padding:24px;color:var(--text-m);font-size:12px">Aucun rappel programmé</div>':''}
    ${grp('En retard',enR,'du')}${grp('Aujourd\'hui',auj,'dt')}${grp('À venir',pro,'ds')}
    ${rdvs.length?`<div style="margin-bottom:13px"><div class="st" style="margin-bottom:6px">RDV à venir (7 jours)</div><div>${rdvs.map(c=>{const r=(c.r1&&dd(c.r1.date)>=0&&dd(c.r1.date)<=7)?{...c.r1,num:'R1'}:(c.r2&&dd(c.r2.date)>=0&&dd(c.r2.date)<=7)?{...c.r2,num:'R2'}:null;if(!r)return'';return`<div class="rem-item" onclick="goTo(${c.id})"><div class="rdot ds"></div><div style="flex:1"><div style="font-size:12px;font-weight:600">${c.prenom} ${c.nom} <span class="badge ${r.num==='R1'?'r1b':'r2b'}">${r.num}</span></div><div style="font-size:11px;color:var(--text-m)">${fmt(r.date)} ${r.heure?'à '+r.heure:''}${r.note?' — '+r.note:''}</div></div></div>`;}).join('')}</div></div>`:''}`;
}

// ===== EXPORT =====
function renderExport(){
  return`<div class="sh" style="margin-bottom:12px"><div class="st">Import / Export</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${[['Exporter clients Excel','exportXLSX()'],['Rapport PDF','exportPDF()'],['Importer Excel','document.getElementById(\'imp\').click()'],['Exporter zones','exportZones()']].map(([t,fn])=>`<div class="card" style="text-align:center;cursor:pointer" onclick="${fn}" onmouseover="this.style.borderColor='var(--green)'" onmouseout="this.style.borderColor='var(--bdr)'"><div style="font-size:12px;font-weight:600">${t}</div></div>`).join('')}
    </div>
    <input type="file" id="imp" accept=".xlsx,.xls" style="display:none" onchange="importXLSX(this)">
    <div style="margin-top:14px;background:var(--bg-surf);border-radius:8px;padding:11px">
      <div style="font-size:12px;font-weight:600;margin-bottom:5px">Format d'import</div>
      <div style="font-size:11px;color:var(--text-m);line-height:1.8">A:Prénom · B:Nom · C:Adresse · D:CP · E:Ville · F:Tél · G:Email · H:Statut · I:Produits · J:Rappel · K:Notes</div>
    </div>`;
}

// ===== MAP =====
function drawMap(){
  const canvas=document.getElementById('map-canvas');if(!canvas)return;
  const W=canvas.parentElement.clientWidth,H=260;canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');const isDark=window.matchMedia('(prefers-color-scheme:dark)').matches;
  ctx.fillStyle=isDark?'#252523':'#f0f0eb';ctx.fillRect(0,0,W,H);
  const all=[...zones.map(z=>({lat:z.lat,lng:z.lng})),...clients.filter(c=>c.lat).map(c=>({lat:c.lat,lng:c.lng}))];
  if(!all.length)return;
  const lats=all.map(p=>p.lat),lngs=all.map(p=>p.lng);
  const minLat=Math.min(...lats)-0.003,maxLat=Math.max(...lats)+0.003,minLng=Math.min(...lngs)-0.004,maxLng=Math.max(...lngs)+0.004;
  function xy(lat,lng){return{x:((lng-minLng)/(maxLng-minLng))*(W*0.85)+W*0.075,y:(1-(lat-minLat)/(maxLat-minLat))*(H*0.82)+H*0.09}}
  ctx.strokeStyle=isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.07)';ctx.lineWidth=0.5;
  for(let i=0;i<=4;i++){const y=H*0.09+i*(H*0.82/4);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  zones.forEach(z=>{const p=xy(z.lat,z.lng),r=14+z.visites*1.5;ctx.globalAlpha=0.15;ctx.fillStyle='#1D9E75';ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle='#1D9E75';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();ctx.fillStyle=isDark?'#9a9a96':'#6b6b67';ctx.font='10px -apple-system,sans-serif';ctx.textAlign='center';ctx.fillText(z.nom.length>12?z.nom.slice(0,11)+'…':z.nom,p.x,p.y+r+11);ctx.fillText(new Date(z.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}),p.x,p.y+r+21);});
  clients.forEach(c=>{if(!c.lat)return;const p=xy(c.lat,c.lng);ctx.globalAlpha=1;ctx.fillStyle='#378ADD';ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();});
  if(currentPos){const p=xy(currentPos.lat,currentPos.lng);ctx.globalAlpha=0.2;ctx.fillStyle='#E24B4A';ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#E24B4A';ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();}
}

function toggleGPS(){
  if(!gpsActive){if(!navigator.geolocation){toast('GPS non disponible');return}gpsWatchId=navigator.geolocation.watchPosition(pos=>{currentPos={lat:pos.coords.latitude,lng:pos.coords.longitude};gpsActive=true;render();setTimeout(drawMap,60);},()=>toast('Accès GPS refusé'),{enableHighAccuracy:true,maximumAge:5000});}
  else{if(gpsWatchId)navigator.geolocation.clearWatch(gpsWatchId);gpsActive=false;currentPos=null;render();}
}

// ===== ACTIONS =====
function goTo(id){selId=id;showTab('clients')}
function selClient(id){selId=id;render()}
function setSt(s){filterSt=s;render()}
function filterSearch(v){const q=v.toLowerCase();const el=document.getElementById('clist');if(el)el.innerHTML=renderList(clients.filter(c=>(c.nom+' '+c.prenom+' '+c.adresse+' '+c.ville).toLowerCase().includes(q)))}
function updateSt(id,val){const c=clients.find(c=>c.id===id);if(c){c.statut=val;saveData();render()}}
function updateNotes(id,val){const c=clients.find(c=>c.id===id);if(c){c.notes=val;saveData();}}
function changeQty(id,i,d){const c=clients.find(c=>c.id===id);c.produits[i].qty=Math.max(1,c.produits[i].qty+d);saveData();render()}
function removeProd(id,i){const c=clients.find(c=>c.id===id);c.produits.splice(i,1);saveData();render()}

function addPhoto(id){const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.capture='environment';inp.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const c=clients.find(c=>c.id===id);if(c){c.photos.push(ev.target.result);saveData();toast('Photo ajoutée');render();}};r.readAsDataURL(f);};inp.click();}

function editRdv(id,type){const c=clients.find(c=>c.id===id);const r=c[type]||{date:'',heure:'',note:''};showModal(`<div class="mt">${type==='r1'?'R1':'R2'} — ${c.prenom} ${c.nom}</div><div class="g2"><div class="ff"><label>Date</label><input type="date" id="rd" value="${r.date||''}"></div><div class="ff"><label>Heure</label><input type="time" id="rh" value="${r.heure||''}"></div></div><div class="ff"><label>Objet du RDV</label><input id="rn" value="${r.note||''}"></div><div class="ma">${c[type]?`<button class="btn btn-o btn-sm" style="color:var(--red)" onclick="delRdv(${id},'${type}')">Supprimer</button>`:''}<button class="btn btn-o" onclick="closeModal()">Annuler</button><button class="btn btn-g" onclick="saveRdv(${id},'${type}')">OK</button></div>`);}
function saveRdv(id,type){const c=clients.find(c=>c.id===id);c[type]={date:document.getElementById('rd').value,heure:document.getElementById('rh').value,note:document.getElementById('rn').value};saveData();closeModal();render();}
function delRdv(id,type){clients.find(c=>c.id===id)[type]=null;saveData();closeModal();render();}

function addAppel(id){showModal(`<div class="mt">Enregistrer un appel</div><div class="g2"><div class="ff"><label>Date</label><input type="date" id="ad" value="${TODAY}"></div><div class="ff"><label>Heure</label><input type="time" id="ah"></div></div><div class="ff"><label>Résultat</label><select id="ar">${CALL_RESULTS.map(r=>`<option>${r}</option>`).join('')}</select></div><div class="ff"><label>Note</label><input id="an"></div><div class="ma"><button class="btn btn-o" onclick="closeModal()">Annuler</button><button class="btn btn-g" onclick="saveAppel(${id})">OK</button></div>`);}
function saveAppel(id){const c=clients.find(c=>c.id===id);c.appels.unshift({date:new Date(document.getElementById('ad').value).toLocaleDateString('fr-FR'),heure:document.getElementById('ah').value||'',resultat:document.getElementById('ar').value,note:document.getElementById('an').value});saveData();closeModal();toast('Appel enregistré');render();}

function importDebrief(id){showModal(`<div class="mt">Débrief Plaud Note</div><div class="ff"><label>Coller le compte-rendu</label><textarea id="dt" style="width:100%;font-family:inherit;font-size:12px;padding:7px;border-radius:8px;border:0.5px solid var(--bdr-md);background:var(--bg-card);color:var(--text);min-height:110px" placeholder="Collez le texte exporté depuis Plaud Note Pro..."></textarea></div><div class="ff"><label>Ou charger un fichier .txt</label><input type="file" id="df" accept=".txt"></div><div class="ma"><button class="btn btn-o" onclick="closeModal()">Annuler</button><button class="btn btn-g" onclick="saveDebrief(${id})">Importer</button></div>`);document.getElementById('df').onchange=e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>{document.getElementById('dt').value=ev.target.result;};r.readAsText(f);}};}
function saveDebrief(id){const c=clients.find(c=>c.id===id);c.debrief=document.getElementById('dt').value;saveData();closeModal();toast('Débrief importé !');render();}

function addProd(id){showModal(`<div class="mt">Ajouter un produit</div><div class="ff"><label>Produit</label><select id="pp">${PRODUCTS.map(p=>`<option>${p}</option>`).join('')}</select></div><div class="ff"><label>Quantité</label><input type="number" id="pq" value="1" min="1"></div><div class="ma"><button class="btn btn-o" onclick="closeModal()">Annuler</button><button class="btn btn-g" onclick="saveProd(${id})">Ajouter</button></div>`);}
function saveProd(id){const c=clients.find(c=>c.id===id);c.produits.push({nom:document.getElementById('pp').value,qty:parseInt(document.getElementById('pq').value)||1});saveData();closeModal();render();}

function addHisto(id){showModal(`<div class="mt">Ajouter une entrée</div><div class="ff"><label>Note</label><textarea id="hn" style="width:100%;font-family:inherit;font-size:12px;padding:7px;border-radius:8px;border:0.5px solid var(--bdr-md);background:var(--bg-card);color:var(--text);min-height:80px"></textarea></div><div class="ma"><button class="btn btn-o" onclick="closeModal()">Annuler</button><button class="btn btn-g" onclick="saveHisto(${id})">OL</button></div>`);}
function saveHisto(id){const c=clients.find(c=>c.id===id);const n=document.getElementById('hn').value;if(c&&n.trim()){c.historique.push({date:new Date().toLocaleDateString('fr-FR'),texte:n});saveData();closeModal();render();}}

function openNew(){showModal(`<div class="mt">Nouveau client</div><div class="g2"><div class="ff"><label>Prénom</label><input id="fp"></div><div class="ff"><label>Nom</label><input id="fn"></div></div><div class="ff"><label>Adresse</label><input id="fa"></div><div class="g2"><div class="ff"><label>CP</label><input id="fc" value="77390"></div><div class="ff"><label>Ville</label><input id="fv" value="Guignes"></div></div><div class="g2"><div class="ff"><label>Tél</label><input id="ft"></div><div class="ff"><label>Email</label><input id="fe"></div></div><div class="ff"><label>Statut</label><select id="fs">${STATUTS.map(s=>`<option>${s}</option>`).join('')}</select></div><div class="ff"><label>Produits</label><div class="cg">${PRODUCTS.map(p=>`<label class="cl"><input type="checkbox" value="${p}"> ${p}</label>`).join('')}</div></div><div class="g2"><div class="ff"><label>R1 Date</label><input type="date" id="fr1d"></div><div class="ff"><label>R1 Heure</label><input type="time" id="fr1h"></div></div><div class="ff"><label>Rappel</label><input type="date" id="frp"></div><div class="ff"><label>Notes</label><textarea id="fno" style="width:100%;font-family:inherit;font-size:12px;padding:7px;border-radius:8px;border:0.5px solid var(--bdr-md);background:var(--bg-card);color:var(--text);min-height:50px"></textarea></div><div class="ma"><button class="btn btn-o" onclick="closeModal()">Annuler</button><button class="btn btn-g" onclick="saveNew()">Enregistrer</button></div>`);}
function saveNew(){const prods=[...document.querySelectorAll('#modal-inner input[type=checkbox]:checked')].map(el=>({nom:el.value,qty:1}));const r1d=document.getElementById('fr1d').value;const c={id:nextId(clients),prenom:document.getElementById('fp').value||'?',nom:document.getElementById('fn').value||'?',adresse:document.getElementById('fa').value||'',cp:document.getElementById('fc').value||'77390',ville:document.getElementById('fv').value||'Guignes',tel:document.getElementById('ft').value||'',email:document.getElementById('fe').value||'',statut:document.getElementById('fs').value,produits:prods.length?prods:[{nom:'—',qty:1}],notes:document.getElementById('fno').value||'',r1:r1d?{date:r1d,heure:document.getElementById('fr1h').value||'',note:''}:null,r2:null,dateVisite:TODAY,rappel:document.getElementById('frp').value||'',historique:[{date:new Date().toLocaleDateString('fr-FR'),texte:'Nouveau contact.'}],appels:[],photos:[],debrief:'',lat:currentPos?currentPos.lat:null,lng:currentPos?currentPos.lng:null};clients.push(c);saveData();selId=c.id;closeModal();toast('Client ajouté !');render();}

function openEdit(id){const c=clients.find(c=>c.id===id);showModal(`<div class="mt">Modifier — ${c.prenom} ${c.nom}</div><div class="g2"><div class="ff"><label>Prénom</label><input id="fp" value="${c.prenom}"></div><div class="ff"><label>Nom</label><input id="fn" value="${c.nom}"></div></div><div class="ff"><label>Adresse</label><input id="fa" value="${c.adresse}"></div><div class="g2"><div class="ff"><label>CP</label><input id="fc" value="${c.cp}"></div><div class="ff"><label>Ville</label><input id="fv" value="${c.ville}"></div></div><div class="g2"><div class="ff"><label>Tél</label><input id="ft" value="${c.tel}"></div><div class="ff"><label>Email</label><input id="fe" value="${c.email}"></div></div><div class="ff"><label>Statut</label><select id="fs">${STATUTS.map(s=>`<option ${c.statut===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="ff"><label>Rappel</label><input type="date" id="frp" value="${c.rappel||''}"></div><div class="ff"><label>Notes</label><textarea id="fno" style="width:100%;font-family:inherit;font-size:12px;padding:7px;border-radius:8px;border:0.5px solid var(--bdr-md);background:var(--bg-card);color:var(--text);min-height:50px">${c.notes}</textarea></div><div class="ma"><button class="btn btn-o" onclick="closeModal()">Annuler</button><button class="btn btn-g" onclick="saveEdit(${id})">Enregistrer</button></div>`);}
function saveEdit(id){const c=clients.find(c=>c.id===id);c.prenom=document.getElementById('fp').value;c.nom=document.getElementById('fn').value;c.adresse=document.getElementById('fa').value;c.cp=document.getElementById('fc').value;c.ville=document.getElementById('fv').value;c.tel=document.getElementById('ft').value;c.email=document.getElementById('fe').value;c.statut=document.getElementById('fs').value;c.rappel=document.getElementById('frp').value;c.notes=document.getElementById('fno').value;saveData();closeModal();toast('Mis à jour');render();}
function confirmDel(id){const c=clients.find(c=>c.id===id);showModal(`<div class="mt">Supprimer ${c.prenom} ${c.nom} ?</div><p style="font-size:12px;color:var(--text-m);margin-bottom:12px">Cette action est irréversible.</p><div class="ma"><button class="btn btn-o" onclick="closeModal()">Annuler</button><button class="btn btn-r" onclick="delClient(${id})">Supprimer</button></div>`);}
function delClient(id){clients=clients.filter(c=>c.id!==id);saveData();selId=clients[0]?.id||null;closeModal();toast('Supprimé');render();}

function openNewZone(){showModal(`<div class="mt">Nouvelle zone</div><div class="ff"><label>Rue / secteur</label><input id="zn"></div><div class="g2"><div class="ff"><label>CP</label><input id="zc" value="77390"></div><div class="ff"><label>Ville</label><input id="zv" value="Guignes"></div></div><div class="g2"><div class="ff"><label>Date</label><input type="date" id="zd" value="${TODAY}"></div><div class="ff"><label>Maisons</label><input type="number" id="znb" value="10"></div></div><div class="g2"><div class="ff"><label>Visitées</label><input type="number" id="zvi" value="0"></div><div class="ff"><label>Contacts</label><input type="number" id="zco" value="0"></div></div><div class="g2"><div class="ff"><label>Latitude</label><input id="zlat" value="${currentPos?currentPos.lat.toFixed(5):'48.5660'}"></div><div class="ff"><label>Longitude</label><input id="zlng" value="${currentPos?currentPos.lng.toFixed(5):'2.7310'}"></div></div><div class="ma"><button class="btn btn-o" onclick="closeModal()">Annuler</button><button class="btn btn-g" onclick="saveZone()">OK</button></div>`);}
function saveZone(){zones.push({id:nextId(zones),nom:document.getElementById('zn').value||'Zone',ville:document.getElementById('zv').value,date:document.getElementById('zd').value,nb:parseInt(document.getElementById('znb').value)||10,visites:parseInt(document.getElementById('zvi').value)||0,contacts:parseInt(document.getElementById('zco').value)||0,lat:parseFloat(document.getElementById('zlat').value)||48.566,lng:parseFloat(document.getElementById('zlng').value)||2.731});saveZones();closeModal();toast('Zone ajoutée');render();setTimeout(drawMap,60);}

// ===== EXPORT/IMPORT =====
function exportXLSX(){if(!window.XLSX){toast('XLSX non chargé');return}const ws=XLSX.utils.json_to_sheet(clients.map(c=>({'Prénom':c.prenom,'Nom':c.nom,'Adresse':c.adresse,'CP':c.cp,'Ville':c.ville,'Tél':c.tel,'Email':c.email,'Statut':c.statut,'Produits':c.produits.map(p=>p.qty+'x '+p.nom).join(', '),'R1':c.r1?.date||'','R2':c.r2?.date||'','Rappel':c.rappel,'Notes':c.notes,'Nb appels':c.appels.length,'Débrief':c.debrief})));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Clients');XLSX.writeFile(wb,'EspritOuvertures_'+TODAY+'.xlsx');toast('Excel exporté !');}
function exportZones(){if(!window.XLSX){toast('XLSX non chargé');return}const ws=XLSX.utils.json_to_sheet(zones.map(z=>({'Zone':z.nom,'Ville':z.ville,'Date':z.date,'Maisons':z.nb,'Visitées':z.visites,'Contacts':z.contacts,'Taux':Math.round(z.contacts/Math.max(z.visites,1)*100)+'%'})));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Zones');XLSX.writeFile(wb,'Zones_'+TODAY+'.xlsx');toast('Zones exportées !');}
function exportPDF(){const w=window.open('','_blank','width=820,height=900');if(!w){toast('Autorisez les popups');return}const rows=clients.map(c=>`<tr><td>${c.prenom} ${c.nom}</td><td>${c.tel}</td><td>${c.statut}</td><td>${c.produits.map(p=>p.qty+'x '+p.nom).join(', ')}</td><td>${c.r1?fmt(c.r1.date):'—'}</td><td>${fmt(c.rappel)}</td><td style="font-size:10px;max-width:160px">${c.notes}</td></tr>`).join('');w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>CRM Esprit</title><style>body{font-family:Arial,sans-serif;font-size:11px;padding:20px}h1{font-size:15px}h2{font-size:12px;color:#0F6E56;border-bottom:1px solid #ccc;padding-bottom:3px;margin:14px 0 7px}table{width:100%;border-collapse:collapse}th{background:#E1F5EE;color:#0F6E56;padding:4px 6px;font-size:10px;text-align:left;border:0.5px solid #ccc}td{padding:4px 6px;border:0.5px solid #eee;vertical-align:top}tr:nth-child(even) td{background:#f9fafb}</style></head><body><h1>CRM Esprit d'Ouvertures</h1><div style="font-size:10px;color:#888;margin:4px 0 14px">Généré le ${new Date().toLocaleDateString('fr-FR')} · ${clients.length} clients</div><h2>Clients</h2><table><thead><tr><th>Nom</th><th>Tél</th><th>Statut</th><th>Produits</th><th>R1</th><th>Rappel</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print()}<\/script></body></html>`);w.document.close();toast('PDF prêt');}
function importXLSX(input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{try{const wb=XLSX.read(e.target.result,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];const data=XLSX.utils.sheet_to_json(ws,{defval:''});let n=0;data.forEach(row=>{const prenom=(row['Prénom']||'').toString().trim(),nom=(row['Nom']||'').toString().trim();if(!prenom&&!nom)return;const st=STATUTS.includes(row['Statut'])?row['Statut']:'Prospect';const prods=(row['Produits']||'').toString().split(',').map(p=>p.trim()).filter(Boolean).map(p=>{const m=p.match(/^(\d+)x?\s*(.+)/i);return m?{nom:m[2].trim(),qty:parseInt(m[1])}:{nom:p,qty:1}});clients.push({id:nextId(clients),prenom:prenom||'?',nom:nom||'?',adresse:(row['Adresse']||'').toString(),cp:(row['CP']||'').toString(),ville:(row['Ville']||'').toString(),tel:(row['Tél']||'').toString(),email:(row['Email']||'').toString(),statut:st,produits:prods.length?prods:[{nom:'—',qty:1}],notes:(row['Notes']||'').toString(),r1:null,r2:null,dateVisite:TODAY,rappel:(row['Rappel']||'').toString(),historique:[{date:new Date().toLocaleDateString('fr-FR'),texte:'Importé Excel.'}],appels:[],photos:[],debrief:'',lat:null,lng:null});n++;});saveData();toast(n+' client(s) importé(s)');input.value='';selId=clients[clients.length-1]?.id||1;render();}catch{toast('Erreur import');}};r.readAsArrayBuffer(f);}

// ===== MODAL =====
function showModal(html){document.getElementById('modal-inner').innerHTML=html;document.getElementById('modal-overlay').classList.add('open');}
function closeModal(){document.getElementById('modal-overlay').classList.remove('open')}
function closeModalOut(e){if(e.target===document.getElementById('modal-overlay'))closeModal()}

// ===== SERVICE WORKER =====
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

// ===== INIT =====
render();
