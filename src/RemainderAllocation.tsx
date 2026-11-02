export type RemainderAmounts = {outcome:"refund_rider"|"settle_traveler"; remaining_held_paise:number; rider_refund_paise:number; traveler_payout_paise:number; platform_fee_paise:number};
export function RemainderAllocation({value}:{value:RemainderAmounts}) {
 return <div className="space-y-2 text-sm"><p className="font-semibold">{value.outcome==='refund_rider'?'Refund remainder to rider':'Settle remainder with traveler'}</p><dl className="grid grid-cols-2 gap-2">{([
 ['Remaining held',value.remaining_held_paise],['Rider refund',value.rider_refund_paise],['Traveler payout',value.traveler_payout_paise],['Platform fee',value.platform_fee_paise]
 ] as const).map(([label,amount])=><div key={label}><dt>{label}</dt><dd className="font-semibold">{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(amount/100)}</dd></div>)}</dl><p>Approval does not move money. An authorized reviewer must execute the approved decision separately.</p></div>;
}
