export const idlFactory = ({ IDL }) => {
  const CallId = IDL.Nat;
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const ParticipantId = IDL.Principal;
  const CallSession = IDL.Record({
    'participants' : IDL.Vec(IDL.Opt(ParticipantId)),
    'streamData' : IDL.Vec(IDL.Opt(IDL.Vec(IDL.Nat8))),
  });
  const Result_2 = IDL.Variant({ 'ok' : CallSession, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : CallId, 'err' : IDL.Text });
  return IDL.Service({
    'endCall' : IDL.Func([CallId], [Result], []),
    'getCallSession' : IDL.Func([CallId], [Result_2], ['query']),
    'initializeCall' : IDL.Func([], [Result_1], []),
    'joinCall' : IDL.Func([CallId], [Result], []),
    'updateStreamData' : IDL.Func([CallId, IDL.Vec(IDL.Nat8)], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
