/** COLLECTIVE-010 — human-controlled, reference-linked outcome adjudication.
 * The UI never assumes a source is independently verified merely because a user
 * wrote a citation. Research-only, no graph import and no network side effects.
 */
import {makeResolutionReceipt,fitResolutionPrior,scoreChronological} from './calibration.mjs';
export function bindCalibrationUI({state,setStatus,el}){
 const $=id=>document.getElementById(id);
 const head=()=>state.calibrationRecords?.at(-1)?.id??null;
 const output=$('calibration-output');
 function line(text,cls='muted'){output.append(el('p',cls,text));}
 async function refresh(){
  state.calibrationRecords=await state.store.getResolutionReceipts(state.scope);
  const tag=$('calibration-tag').value.trim()||'general';
  let fit,score;
  try{
   fit=fitResolutionPrior(state.calibrationRecords,{tag});
   score=scoreChronological(state.calibrationRecords,{tag});
  }catch(e){output.replaceChildren();line(e.message,'warn');return;}
  $('calibration-count').textContent=String(state.calibrationRecords.length);
  output.replaceChildren();
  line('Family '+tag+' · '+fit.declaredIndependentGroups+' declared distinct checked groups · '+fit.echoRemoved+' repeated cases discounted · '+fit.conflictedGroupsHeld+' conflicting groups held.');
  line(fit.eligible?'Estimated support if externally resolved: '+(fit.pYes*100).toFixed(1)+'% · external-check conclusiveness: '+(fit.pAnswered*100).toFixed(1)+'%. NOT a peer response rate or certified real-world truth.':
   'Calibration withheld: fewer than '+fit.minGroups+' distinct groups. Using uncalibrated planning assumptions.','calibration-summary');
  if(score.answered.evaluated){
   line('PREQUENTIAL (past-only) score over '+score.answered.evaluated+' held-forward case(s): check-conclusiveness Brier '+score.answered.modelBrier+' vs baseline '+score.answered.baselineBrier+'.');
   if(score.supportsConditionalOnAnswer.evaluated)
    line('Support given answer: Brier '+score.supportsConditionalOnAnswer.modelBrier+' vs baseline '+score.supportsConditionalOnAnswer.baselineBrier+' across '+score.supportsConditionalOnAnswer.evaluated+' answers. LOWER is better.');
  }else line('No out-of-sample scoring yet: enter enough chronologically distinct reference-backed outcomes.');
  line('Every check is supplied by the operator. A reference or key signature does not prove an independently verified fact. Nothing was added to the evidence ledger.');
  $('calibration-export').disabled=!state.calibrationRecords.length;
  state.calibrationHead=head();
 }
 $('calibration-record-form').addEventListener('submit',async e=>{
  e.preventDefault();
  try{
   const input={caseId:$('calibration-case').value.trim(),groupId:$('calibration-group').value.trim(),
    tag:$('calibration-tag').value.trim(),question:{from:$('calibration-from').value.trim(),to:$('calibration-to').value.trim()},
    outcome:$('calibration-outcome').value,method:$('calibration-method').value,
    sourceReference:$('calibration-reference').value.trim()};
   if(!$('calibration-declared').checked)throw Error('A separate check must be declared; peer agreement and repetition are not ground truth.');
   const receipt=await makeResolutionReceipt(state.scope,input);
   await state.store.recordResolutionReceipt(receipt,state.scope);
   $('calibration-case').value='';$('calibration-reference').value='';$('calibration-declared').checked=false;
   await refresh();
   if(state.adaptiveUI)await state.adaptiveUI.refresh();
   setStatus('Independent-check claim recorded locally with its reference. The claim was not verified automatically or promoted to source truth.');
  }catch(error){setStatus('Resolution held: '+error.message,true);}
 });
 $('calibration-export').onclick=()=>{
  const data={schema:'motif.collective010.resolutions-export.v1',scope:state.scope,
   independentChecksVerifiedByApp:false,notAcceptedWorldFacts:true,
   records:state.calibrationRecords};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=el('a');a.href=url;a.download='motif-resolution-checks-sensitive.json';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);
  setStatus('Resolution references exported. They may disclose experiment metadata; share deliberately.');
 };
 return {refresh};
}
