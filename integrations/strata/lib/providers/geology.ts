import {cached} from '@/lib/upstream';
import type {GeologyProvider,Point} from './types';
export const macrostrat:GeologyProvider & {inspect(point:Point):Promise<any>}={async inspect({lat,lng}){const r=await cached(`geo:${lat.toFixed(5)},${lng.toFixed(5)}`,'macrostrat',`https://macrostrat.org/api/v2/geologic_units/map?lat=${lat}&lng=${lng}`,86400);const raw=r.raw.success;if(!raw?.data)throw new Error('Geological source returned an unsupported response');return {status:'available',data:raw.data,units:raw.data,refs:raw.refs||{},retrievedAt:r.retrievedAt,licence:raw.license};}};
