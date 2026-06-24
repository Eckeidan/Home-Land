import { describe, expect, it } from "vitest";
import {
  assertLeaseTransition,
  canTransitionLease,
  type LeaseStatus,
  type LeaseTransitionAction,
} from "./lease-state-machine.js";

describe("lease state machine", () => {
  it.each([
    ["DRAFT", "validate"],
    ["READY_FOR_ACTIVATION", "activate"],
    ["ACTIVE", "renewal-marker"],
    ["ACTIVE", "terminate"],
  ] satisfies Array<[LeaseStatus, LeaseTransitionAction]>)("allows %s -> %s", (status, action) => {
    expect(canTransitionLease(status, action)).toBe(true);
    expect(() => assertLeaseTransition(status, action)).not.toThrow();
  });

  it.each([
    ["DRAFT", "activate"],
    ["DRAFT", "terminate"],
    ["READY_FOR_ACTIVATION", "validate"],
    ["READY_FOR_ACTIVATION", "terminate"],
    ["TERMINATED", "activate"],
    ["TERMINATED", "renewal-marker"],
  ] satisfies Array<[LeaseStatus, LeaseTransitionAction]>)("rejects %s -> %s", (status, action) => {
    expect(canTransitionLease(status, action)).toBe(false);
    expect(() => assertLeaseTransition(status, action)).toThrow("Invalid lease transition");
  });
});
