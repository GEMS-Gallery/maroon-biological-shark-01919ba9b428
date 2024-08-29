import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type CallId = bigint;
export interface CallSession {
  'participants' : Array<[] | [ParticipantId]>,
  'answers' : Array<[] | [SDPData]>,
  'offers' : Array<[] | [SDPData]>,
  'iceCandidates' : Array<Array<ICECandidate>>,
}
export type ICECandidate = string;
export type ParticipantId = Principal;
export type Result = { 'ok' : null } |
  { 'err' : string };
export type Result_1 = { 'ok' : CallSession } |
  { 'err' : string };
export type Result_2 = { 'ok' : CallId } |
  { 'err' : string };
export type SDPData = string;
export interface _SERVICE {
  'addIceCandidate' : ActorMethod<[CallId, ICECandidate], Result>,
  'endCall' : ActorMethod<[CallId], Result>,
  'getCallSession' : ActorMethod<[CallId], Result_1>,
  'initializeCall' : ActorMethod<[], Result_2>,
  'joinCall' : ActorMethod<[CallId], Result_1>,
  'sendAnswer' : ActorMethod<[CallId, SDPData], Result>,
  'sendOffer' : ActorMethod<[CallId, SDPData], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
