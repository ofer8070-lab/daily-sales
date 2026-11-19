import{initializeApp}from"https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import{getAuth,GoogleAuthProvider,signInWithPopup,signInAnonymously,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import{getFirestore,doc,getDoc,setDoc,onSnapshot,deleteDoc,serverTimestamp}from"https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
const app=initializeApp({apiKey:"AIzaSyAGWfcxWJegzLm1crx34nKH8sM6T7JxbZw",authDomain:"daily-sales-a34cc.firebaseapp.com",projectId:"daily-sales-a34cc",appId:"1:1005078843731:web:88f2d5a93381aecbb051a6"}),auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);
const fields=['employee','station','diesel','gas','urea','washer','oils','workers','safe','ureaMeter','shortages','dieselDoc','dieselTankQty','gasDoc','gasTankQty','morningWorker','afternoonWorker','nightWorker'];
let user=null,allowed=false,stopMember=null,stopReport=null,loadedKey='',dirty=false;
const admin=u=>!!u&&u.email?.toLowerCase()==='ofer8070@gmail.com'&&u.emailVerified&&u.providerData.some(p=>p.providerId==='google.com');
const status=(t)=>{$('cloudState').textContent=t};
const reportKey=()=>[$('station').value,$('date').value].join('_');
const snapshotForm=()=>Object.fromEntries(fields.map(k=>[k,$(k).value]));
const setForm=v=>{fields.forEach(k=>$(k).value=v[k]??'');$('total').textContent=new Intl.NumberFormat('he-IL').format(['diesel','gas','urea'].reduce((a,k)=>a+(Number($(k).value)||0),0))};
const backup=()=>{try{const k='daily-sales-backup-before-cloud:'+reportKey();if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify(snapshotForm()))}catch(e){}};
const clearReport=()=>{stopReport?.();stopReport=null;loadedKey=''};
const sync=()=>{clearReport();if(!allowed){status('כדי להשתמש בענן יש להמתין לאישור המנהל');return}if(!$('station').value){status('בחר תחנה כדי לטעון דוח משותף');return}const k=reportKey();loadedKey=k;status('מתחבר לדוח המשותף...');stopReport=onSnapshot(doc(db,'dailySales',k),s=>{if(loadedKey!==k)return;if(s.exists()){if(!dirty){backup();setForm(s.data().fields||{});status('דוח משותף נטען מהענן')}else status('יש נתונים שלא נשמרו. לחץ שמירה בענן או טען מחדש.')}else status('אין דוח בענן לתחנה ולתאריך הזה. ניתן למלא ולשמור.')},e=>status('שגיאת טעינה: '+e.message))};
const controls=()=>{$('cloudIn').hidden=!!user;$('cloudGoogle').hidden=!!user;$('cloudOut').hidden=!user;$('cloudRequest').hidden=!user||allowed;$('saveBtn').disabled=!allowed};
onAuthStateChanged(auth,u=>{stopMember?.();stopMember=null;clearReport();user=u;allowed=false;controls();if(!u){status('בחר כניסה ללא סיסמה לעובד, או Google למנהל');return}if(admin(u)){allowed=true;controls();sync();return}stopMember=onSnapshot(doc(db,'members',u.uid),s=>{allowed=!!s.exists()&&s.data().blocked===false&&s.data().apps?.['daily-sales']===true;controls();sync()},e=>status('שגיאת הרשאה: '+e.message))});
$('cloudIn').onclick=async()=>{try{await signInAnonymously(auth)}catch(e){status('שגיאת כניסה: '+e.message)}};
$('cloudGoogle').onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){status('כניסת Google נכשלה: '+e.message)}};
$('cloudOut').onclick=async()=>{if(confirm('יציאה עשויה לחייב אישור מחדש לעובד. להמשיך?'))await signOut(auth)};
$('cloudRequest').onclick=async()=>{const name=$('employee').value.trim();if(!name){alert('כתוב שם עובד לפני בקשת הצטרפות');return}try{const r=doc(db,'accessRequests',user.uid);if((await getDoc(r)).exists()){status('הבקשה קיימת. יש להמתין לאישור המנהל.');return}await setDoc(r,{name,status:'pending',requestedAt:Date.now(),appId:'daily-sales'});status('בקשת ההצטרפות נשלחה למנהל')}catch(e){status('שגיאה בשליחת בקשה: '+e.message)}};
async function saveCloud(){if(!allowed){status('אין הרשאה לשמור בענן');return}if(!$('station').value||!$('employee').value.trim()){alert('יש לבחור תחנה ולמלא שם עובד');return}try{const k=reportKey(),r=doc(db,'dailySales',k);await setDoc(r,{station:$('station').value,date:$('date').value,fields:snapshotForm(),updatedBy:user.uid,updatedAt:serverTimestamp()});dirty=false;status('הנתונים נשמרו בענן ונגישים לכל העובדים המאושרים');$('saveToast').textContent='הנתונים נשמרו בענן';$('saveToast').hidden=false;setTimeout(()=>$('saveToast').hidden=true,2000)}catch(e){status('השמירה לענן נכשלה: '+e.message)}}
$('saveBtn').addEventListener('click',e=>{e.stopImmediatePropagation();e.preventDefault();saveCloud()},true);
$('deleteEntry').addEventListener('click',async e=>{e.stopImmediatePropagation();e.preventDefault();if(!allowed)return;if(!confirm('למחוק את הדוח מהענן עבור '+$('station').value+' '+$('date').value+'?'))return;try{await deleteDoc(doc(db,'dailySales',reportKey()));dirty=false;status('הדוח נמחק מהענן')}catch(err){status('המחיקה נכשלה: '+err.message)}},true);
$('cloudReload').onclick=()=>{if(dirty&&!confirm('לטעון את הדוח מהענן ולבטל שינויים שלא נשמרו?'))return;dirty=false;sync()};
for(const k of fields){if(k==='station')$(k).addEventListener('change',()=>{dirty=false;setTimeout(sync,0)});else $(k).addEventListener('input',()=>{dirty=true})}
$('date').addEventListener('change',()=>{dirty=false;setTimeout(sync,0)});
for(const k of ['prev','next'])$(k).addEventListener('click',()=>{dirty=false;setTimeout(sync,0)});
status('מערכת הענן נטענת...');