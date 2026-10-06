import type {ElevationProvider,VegetationProvider,MineProvider,ParkingProvider,RoutingProvider,ImageProvider} from './types';
import {unavailable} from './types';
export const elevation:ElevationProvider={async sample(){return {status:'unavailable',data:null,reason:'No supported elevation provider is configured.'}}};
export const vegetation:VegetationProvider={async sample(){return {status:'unavailable',data:null,reason:'No dated vegetation raster is configured.'}}};
export const miningPois:MineProvider={async viewport(){return unavailable('No current mine or quarry inventory is configured. Historical MRDS reports are separate.')}};
export const parking:ParkingProvider={async nearby(){return unavailable('No compliant parking endpoint is configured.')}};
export const routing:RoutingProvider={async route(){return unavailable('No driving or hiking routing credential is configured.')}};
export const mineralImages:ImageProvider={async images(){return unavailable('No licensed mineral-photo collection is configured. User photographs remain private.')}};
export interface IdentificationProvider{identify(input:{photoIds:string[];location?:{lat:number;lng:number};geologicalUnit?:string;documentedMinerals?:string[]}):Promise<{status:'unavailable'|'available';suggestions:{mineralId:string;score:number}[];reason?:string}>}
export const photoIdentification:IdentificationProvider={async identify(){return {status:'unavailable',suggestions:[],reason:'No scientifically validated identification model is configured.'}}};
