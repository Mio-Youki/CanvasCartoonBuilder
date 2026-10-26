/* Compact row weights: no rejection loops and no full-sized float CDF. */
(function(global){
  'use strict';
  function create(field){
    const rows=new Float64Array(field.h);let total=0;
    for(let y=0;y<field.h;y++){for(let x=0;x<field.w;x++)total+=field.data[y*field.w+x];rows[y]=total;}
    return Object.freeze({field,total,pick(u,v){
      if(!total)return null;const target=Math.max(0,Math.min(1-Number.EPSILON,u))*total;let lo=0,hi=rows.length-1;
      while(lo<hi){const mid=(lo+hi)>>>1;if(rows[mid]>target)hi=mid;else lo=mid+1;}
      const y=lo,rowTotal=rows[y]-(y?rows[y-1]:0),column=Math.max(0,Math.min(1-Number.EPSILON,v))*rowTotal;let sum=0;
      for(let x=0;x<field.w;x++){sum+=field.data[y*field.w+x];if(sum>column)return{x,y};}return null;
    }});
  }
  global.ToSampoolRuntimeVNext.modules.weightedDistribution=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
