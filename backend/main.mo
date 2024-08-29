import Hash "mo:base/Hash";
import Iter "mo:base/Iter";

import Text "mo:base/Text";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Result "mo:base/Result";
import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Error "mo:base/Error";
import Principal "mo:base/Principal";

actor {
  type CallId = Nat;
  type ParticipantId = Principal;
  type SDPData = Text;
  type ICECandidate = Text;

  type CallSession = {
    participants: [?ParticipantId];
    offers: [?SDPData];
    answers: [?SDPData];
    iceCandidates: [[ICECandidate]];
  };

  stable var nextCallId: Nat = 0;
  stable var callSessionsEntries: [(CallId, CallSession)] = [];

  var callSessions = HashMap.HashMap<CallId, CallSession>(10, Nat.equal, Nat.hash);

  func generateCallId(): CallId {
    let id = nextCallId;
    nextCallId += 1;
    id
  };

  public func initializeCall(): async Result.Result<CallId, Text> {
    let callId = generateCallId();
    let newSession: CallSession = {
      participants = [null, null];
      offers = [null, null];
      answers = [null, null];
      iceCandidates = [[], []];
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
          offers = session.offers;
          answers = session.answers;
          iceCandidates = session.iceCandidates;
        };
        callSessions.put(callId, updatedSession);
        #ok(())
      };
    }
  };

  public shared(msg) func sendOffer(callId: CallId, offer: SDPData): async Result.Result<(), Text> {
    switch (callSessions.get(callId)) {
      case (null) { #err("Call session not found") };
      case (?session) {
        let participantIndex = if (Principal.equal(msg.caller, Option.get(session.participants[0], Principal.fromText("2vxsx-fae")))) 0 else 1;
        let updatedOffers = Array.tabulate<?SDPData>(2, func (i) {
          if (i == participantIndex) { ?offer } else { session.offers[i] }
        });
        let updatedSession: CallSession = {
          participants = session.participants;
          offers = updatedOffers;
          answers = session.answers;
          iceCandidates = session.iceCandidates;
        };
        callSessions.put(callId, updatedSession);
        #ok(())
      };
    }
  };

  public shared(msg) func sendAnswer(callId: CallId, answer: SDPData): async Result.Result<(), Text> {
    switch (callSessions.get(callId)) {
      case (null) { #err("Call session not found") };
      case (?session) {
        let participantIndex = if (Principal.equal(msg.caller, Option.get(session.participants[0], Principal.fromText("2vxsx-fae")))) 0 else 1;
        let updatedAnswers = Array.tabulate<?SDPData>(2, func (i) {
          if (i == participantIndex) { ?answer } else { session.answers[i] }
        });
        let updatedSession: CallSession = {
          participants = session.participants;
          offers = session.offers;
          answers = updatedAnswers;
          iceCandidates = session.iceCandidates;
        };
        callSessions.put(callId, updatedSession);
        #ok(())
      };
    }
  };

  public shared(msg) func addIceCandidate(callId: CallId, candidate: ICECandidate): async Result.Result<(), Text> {
    switch (callSessions.get(callId)) {
      case (null) { #err("Call session not found") };
      case (?session) {
        let participantIndex = if (Principal.equal(msg.caller, Option.get(session.participants[0], Principal.fromText("2vxsx-fae")))) 0 else 1;
        let updatedIceCandidates = Array.tabulate<[ICECandidate]>(2, func (i) {
          if (i == participantIndex) { Array.append(session.iceCandidates[i], [candidate]) } else { session.iceCandidates[i] }
        });
        let updatedSession: CallSession = {
          participants = session.participants;
          offers = session.offers;
          answers = session.answers;
          iceCandidates = updatedIceCandidates;
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

  public shared(msg) func endCall(callId: CallId): async Result.Result<(), Text> {
    switch (callSessions.get(callId)) {
      case (null) { #err("Call session not found") };
      case (?session) {
        callSessions.delete(callId);
        #ok(())
      };
    }
  };

  system func preupgrade() {
    callSessionsEntries := Iter.toArray(callSessions.entries());
  };

  system func postupgrade() {
    callSessions := HashMap.fromIter<CallId, CallSession>(callSessionsEntries.vals(), 10, Nat.equal, Nat.hash);
    callSessionsEntries := [];
  };
}
