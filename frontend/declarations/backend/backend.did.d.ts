import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type CallId = bigint;
export interface CallSession {
  'participants' : Array<[] | [ParticipantId]>,
  'streamData' : Array<[] | [Uint8Array | number[]]>,
}
export type ParticipantId = Principal;
export type Result = { 'ok' : null } |
  { 'err' : string };
export type Result_1 = { 'ok' : CallId } |
  { 'err' : string };
export type Result_2 = { 'ok' : CallSession } |
  { 'err' : string };
export interface _SERVICE {
  'endCall' : ActorMethod<[CallId], Result>,
  'getCallSession' : ActorMethod<[CallId], Result_2>,
  'initializeCall' : ActorMethod<[], Result_1>,
  'joinCall' : ActorMethod<[CallId], Result>,
  'updateStreamData' : ActorMethod<[CallId, Uint8Array | number[]], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
