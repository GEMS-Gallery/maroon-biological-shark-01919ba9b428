import Blob "mo:base/Blob";
import Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";

import Text "mo:base/Text";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Result "mo:base/Result";
import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Error "mo:base/Error";

actor {
  // Types
  type CallId = Nat;
  type ParticipantId = Principal;
  type CallSession = {
    participants: [?ParticipantId];
    streamData: [?Blob];
  };

  // Stable variables
  stable var nextCallId: Nat = 0;
  stable var callSessionsEntries: [(CallId, CallSession)] = [];

  // Mutable state
  var callSessions = HashMap.HashMap<CallId, CallSession>(10, Nat.equal, Nat.hash);

  // Helper functions
  func generateCallId(): CallId {
    let id = nextCallId;
    nextCallId += 1;
    id
  };

  // API methods
  public func initializeCall(): async Result.Result<CallId, Text> {
    let callId = generateCallId();
    let newSession: CallSession = {
      participants = [null, null];
      streamData = [null, null];
    };
    callSessions.put(callId, newSession);
    #ok(callId)
  };

  public shared(msg) func joinCall(callId: CallId): async Result.Result<(), Text> {
    switch (callSessions.get(callId)) {
      case (null) { #err("Call session not found") };
      case (?session) {
        let participantIndex = if (Option.isNull(session.participants[0])) 0 else 1;
        if (participantIndex >= session.participants.size()) {
          return #err("Call session is full");
        };
        let updatedParticipants = Array.tabulate<?ParticipantId>(2, func (i) {
          if (i == participantIndex) { ?msg.caller } else { session.participants[i] }
        });
        let updatedSession: CallSession = {
          participants = updatedParticipants;
          streamData = session.streamData;
        };
        callSessions.put(callId, updatedSession);
        #ok(())
      };
    }
  };

  public shared(msg) func endCall(callId: CallId): async Result.Result<(), Text> {
    switch (callSessions.get(callId)) {
      case (null) { #err("Call session not found") };
      case (?session) {
        callSessions.delete(callId);
        #ok(())
      };
    }
  };

  public shared(msg) func updateStreamData(callId: CallId, data: Blob): async Result.Result<(), Text> {
    switch (callSessions.get(callId)) {
      case (null) { #err("Call session not found") };
      case (?session) {
        let participantIndex = if (Option.equal<ParticipantId>(session.participants[0], ?msg.caller, Principal.equal)) 0 else 1;
        let updatedStreamData = Array.tabulate<?Blob>(2, func (i) {
          if (i == participantIndex) { ?data } else { session.streamData[i] }
        });
        let updatedSession: CallSession = {
          participants = session.participants;
          streamData = updatedStreamData;
        };
        callSessions.put(callId, updatedSession);
        #ok(())
      };
    }
  };

  public query func getCallSession(callId: CallId): async Result.Result<CallSession, Text> {
    switch (callSessions.get(callId)) {
      case (null) { #err("Call session not found") };
      case (?session) { #ok(session) };
    }
  };

  // System functions
  system func preupgrade() {
    callSessionsEntries := Iter.toArray(callSessions.entries());
  };

  system func postupgrade() {
    callSessions := HashMap.fromIter<CallId, CallSession>(callSessionsEntries.vals(), 10, Nat.equal, Nat.hash);
    callSessionsEntries := [];
  };
}
