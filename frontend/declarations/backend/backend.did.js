export const idlFactory = ({ IDL }) => {
  const CallId = IDL.Nat;
  const ICECandidate = IDL.Text;
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const ParticipantId = IDL.Principal;
  const SDPData = IDL.Text;
  const CallSession = IDL.Record({
    'participants' : IDL.Vec(IDL.Opt(ParticipantId)),
    'answers' : IDL.Vec(IDL.Opt(SDPData)),
    'offers' : IDL.Vec(IDL.Opt(SDPData)),
    'iceCandidates' : IDL.Vec(IDL.Vec(ICECandidate)),
  });
  const Result_1 = IDL.Variant({ 'ok' : CallSession, 'err' : IDL.Text });
  const Result_2 = IDL.Variant({ 'ok' : CallId, 'err' : IDL.Text });
  return IDL.Service({
    'addIceCandidate' : IDL.Func([CallId, ICECandidate], [Result], []),
    'endCall' : IDL.Func([CallId], [Result], []),
    'getCallSession' : IDL.Func([CallId], [Result_1], ['query']),
    'initializeCall' : IDL.Func([], [Result_2], []),
    'joinCall' : IDL.Func([CallId], [Result_1], []),
    'sendAnswer' : IDL.Func([CallId, SDPData], [Result], []),
    'sendOffer' : IDL.Func([CallId, SDPData], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
