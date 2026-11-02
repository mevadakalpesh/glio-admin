import {Children, cloneElement, isValidElement, useState, type ReactNode, type ReactElement, type ComponentProps} from 'react';
import {ColumnPicker} from './column-picker';
import {cn} from 'cn';
type CellProps={children?:ReactNode;colSpan?:number};
function elements(children:ReactNode){return Children.toArray(children).filter(isValidElement) as ReactElement<CellProps>[];}
function text(node:ReactNode):string{return Children.toArray(node).map(child=>typeof child==='string'||typeof child==='number'?String(child):isValidElement<CellProps>(child)?text(child.props.children):'').join(' ').trim();}
/** Presentation only: retains row keys, handlers and access checks supplied by each module. */
export function AdminTable({children,className,toolbar,...props}:ComponentProps<'table'> & {toolbar?:ReactNode}){
 const [hidden,setHidden]=useState<string[]>([]);
 const sections=elements(children);
 const head=sections.find(section=>section.type==='thead');
 const headerRows=elements(head?.props.children);
 const headers=elements(headerRows[0]?.props.children);
 // Grouped tables keep their original layout; no ambiguous column mapping.
 const simple=headerRows.length===1&&headers.every(cell=>!cell.props.colSpan||cell.props.colSpan===1);
 const options=simple?headers.flatMap((cell,index)=>{const label=text(cell.props.children);return index>0&&label&&!/actions?/i.test(label)?[{key:String(index),label}]:[];}):[];
 const hiddenIndexes=new Set(options.filter(option=>hidden.includes(option.key)).map(option=>Number(option.key)));
 function row(node:ReactElement<CellProps>){
  const cells=elements(node.props.children);
  if(cells.length!==headers.length||cells.some(cell=>cell.props.colSpan&&cell.props.colSpan>1))return node;
  return cloneElement(node,{},cells.filter((_,index)=>!hiddenIndexes.has(index)));
 }
 return <div className="admin-data-table">{(toolbar||options.length>0)&&<div className="flex flex-wrap items-start gap-3 border-b px-4 py-3">{toolbar&&<div className="min-w-0 flex-1">{toolbar}</div>}{options.length>0&&<div className="ml-auto shrink-0"><ColumnPicker columns={options} hidden={hidden} onChange={setHidden}/></div>}</div>}<div className="overflow-x-auto"><table {...props} className={cn('w-full text-left text-sm',className)}>{simple?sections.map(section=>['thead','tbody','tfoot'].includes(String(section.type))?cloneElement(section,{},elements(section.props.children).map(row)):section):children}</table></div></div>;
}
