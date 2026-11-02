import {useEffect,useRef,useState,type ComponentProps} from 'react';
import {Button} from './button';
/** Clear is available for applied filters or nonempty draft fields in this form. */
export function FilterClearButton({active,fields,...props}:ComponentProps<typeof Button>&{active:boolean;fields:string[]}){
 const anchor=useRef<HTMLSpanElement>(null);
 const [draft,setDraft]=useState(false);
 const fieldKey=fields.join('|');
 useEffect(()=>{
  const form=anchor.current?.closest('form');if(!form)return;
  const names=fieldKey.split('|');
  const update=()=>{const values=new FormData(form);setDraft(names.some(name=>String(values.get(name)||'').trim()!==''));};
  update();form.addEventListener('input',update);form.addEventListener('change',update);
  const observer=new MutationObserver(update);observer.observe(form,{subtree:true,childList:true,attributes:true,attributeFilter:['value']});
  return ()=>{form.removeEventListener('input',update);form.removeEventListener('change',update);observer.disconnect();};
 },[fieldKey]);
 return <span ref={anchor} className={active||draft?'inline-flex':'hidden'}>{(active||draft)&&<Button {...props} type="button"/>}</span>;
}
