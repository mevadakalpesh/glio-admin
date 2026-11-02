import { SegmentedControl, SegmentedItem } from "@/components/ui/segmented-control";
import {RideMatchingPolicies} from "./RideMatchingPolicies";
import {useState} from 'react';
import {RidePricingPolicies} from './RidePricingPolicies';
import {VehicleRidePricingPolicies} from './VehicleRidePricingPolicies';
import {RideCancellationPolicies} from './RideCancellationPolicies';
export function Policies(){const [section,setSection]=useState('ride');return <div className="space-y-5"><SegmentedControl aria-label="Policy categories" className="mb-5">{[['ride','Ride pricing'],['vehicles','Vehicle pricing'],['cancellation','Cancellation terms'],['matching','Matching rules']].map(([id,label])=><SegmentedItem key={id} aria-pressed={section===id}  onClick={()=>setSection(id)}>{label}</SegmentedItem>)}</SegmentedControl>{section==='ride'?<RidePricingPolicies/>:section==='vehicles'?<VehicleRidePricingPolicies/>:section==='cancellation'?<RideCancellationPolicies/>:<RideMatchingPolicies/>}</div>;}
