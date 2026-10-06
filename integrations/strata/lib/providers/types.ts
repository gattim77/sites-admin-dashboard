export type Point={lat:number;lng:number};
export type Bbox=[number,number,number,number];
export type Provenance={provider:string;sourceId:string;url:string;licence:string;retrievedAt:string;raw:unknown;authority:'A'|'B'|'C'|'D'|'E';references:string[]};
export type Availability<T>={status:'available'|'unavailable';data:T;reason?:string;retrievedAt?:string};
export interface GeologyProvider{inspect(point:Point):Promise<Availability<unknown[]>>}
export interface MineralOccurrenceProvider{viewport(bbox:Bbox,mineralId?:string):Promise<Availability<unknown[]>>}
export interface ElevationProvider{sample(point:Point):Promise<Availability<{metres:number;model:string}|null>>}
export interface VegetationProvider{sample(point:Point):Promise<Availability<{density:number;date:string}|null>>}
export interface MineProvider{viewport(bbox:Bbox):Promise<Availability<unknown[]>>}
export interface ParkingProvider{nearby(point:Point,radius:number):Promise<Availability<unknown[]>>}
export interface RoutingProvider{route(points:Point[],mode:'driving-car'|'foot-hiking'):Promise<Availability<unknown>>}
export interface GeocoderProvider{search(query:string):Promise<Availability<unknown[]>>}
export interface MineralTaxonomyProvider{search(query:string):Promise<Availability<unknown[]>>}
export interface ImageProvider{images(mineralId:string):Promise<Availability<unknown[]>>}
export const unavailable=(reason='No supported data source is currently configured for this feature.')=>({status:'unavailable' as const,data:[],reason});
export const mindatAdapter:MineralOccurrenceProvider={async viewport(){return unavailable('Mindat API permission and suitable licence have not been established.')}};
