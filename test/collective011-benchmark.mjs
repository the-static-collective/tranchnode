/** Reproducible illustrative hazard benchmark, NOT real-world verification.
 * The matched regime is a self-consistency check, NOT an independent validation.
 * The mismatched regime demonstrates the wrong volatility assumptions can hurt.
 */
import {presumedDelta,MS_DAY} from '../apps/collective/temporal.mjs';
const start=Date.parse('2024-01-01T00:00:00.000Z');
let seed=20261110;
function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed+0.5)/4294967296;}
const regimes=[
 {name:'assumptions_match_constructed_generator',n:1200},
 {name:'unanticipated_stability',n:1200},
 {name:'sudden_regime_shift_to_fast_change',n:1200}
];
function stats(regime){let loss=0,constant=0,positive=0;const raw=[];
 for(let i=0;i<regime.n;i++){
  const profile=['slow','ordinary','fast','rapid'][i%4],ageDays=[1,14,90,365][Math.floor(i/4)%4];
  const pred=presumedDelta({since:start,now:start+ageDays*MS_DAY,profile}).pAtLeastOneChange;
  let actualP=pred;
  if(regime.name==='unanticipated_stability')actualP=0.02;
  if(regime.name==='sudden_regime_shift_to_fast_change')actualP=Math.min(0.999,0.5+0.5*pred);
  const y=Number(rand()<actualP);
  loss+=(pred-y)**2;constant+=(0.5-y)**2;positive+=y;
  if(i<3)raw.push({profile,ageDays,modelPrediction:pred,constructedOutcome:y});
 }
 return {regime:regime.name,cases:regime.n,syntheticPositiveRate:+(positive/regime.n).toFixed(5),
  hazardModelBrier:+(loss/regime.n).toFixed(5),constantHalfBrier:+(constant/regime.n).toFixed(5),examples:raw};
}
const results=regimes.map(stats);
console.log(JSON.stringify({schema:'motif.collective011.synthetic-hazard-benchmark.v1',
 independentFieldValidation:false,groundTruthSource:'AUTHOR_CONSTRUCTED_GENERATOR',
 supportClaim:'illustrative mathematical behavior and falsifiers only',seed:20261110,results},null,2));
