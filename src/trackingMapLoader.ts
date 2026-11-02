import {setOptions,importLibrary} from '@googlemaps/js-api-loader';
let configured=false;
export async function loadTrackingMap(key:string){
 if(!key.trim())throw new Error('Map configuration is unavailable.');
 if(!configured){
  setOptions({key,v:'quarterly',region:'IN',authReferrerPolicy:'origin'});
  const host=window as Window & {gm_authFailure?:()=>void};
  const previous=host.gm_authFailure;
  host.gm_authFailure=()=>{window.dispatchEvent(new Event('gilo-map-auth-failure'));previous?.();};
  configured=true;
 }
 const [maps,core]=await Promise.all([importLibrary('maps'),importLibrary('core')]);
 return {...maps,LatLngBounds:core.LatLngBounds};
}
