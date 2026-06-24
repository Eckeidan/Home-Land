import { describe, expect, it } from "vitest";
import {
  canTransitionMaintenance,
  type MaintenanceAction,
  type MaintenanceStatus,
  nextMaintenanceStatus,
} from "./maintenance-state-machine.js";

describe("maintenance state machine", () => {
  it.each([
    ["triage", "SUBMITTED", "TRIAGED"],
    ["assign", "TRIAGED", "ASSIGNED"],
    ["assign", "ASSIGNED", "ASSIGNED"],
    ["complete", "ASSIGNED", "COMPLETED"],
    ["complete", "SCHEDULED", "COMPLETED"],
    ["complete", "IN_PROGRESS", "COMPLETED"],
    ["verify", "COMPLETED", "VERIFIED"],
    ["close", "VERIFIED", "CLOSED"],
  ] satisfies Array<
    [MaintenanceAction, MaintenanceStatus, MaintenanceStatus]
  >)("allows %s from %s to %s", (action, status, expected) => {
    expect(canTransitionMaintenance(action, status)).toBe(true);
    expect(nextMaintenanceStatus(action, status)).toBe(expected);
  });

  it.each([
    ["triage", "ASSIGNED"],
    ["assign", "SUBMITTED"],
    ["complete", "SUBMITTED"],
    ["verify", "ASSIGNED"],
    ["close", "COMPLETED"],
    ["close", "CLOSED"],
  ] satisfies Array<
    [MaintenanceAction, MaintenanceStatus]
  >)("rejects %s from %s", (action, status) => {
    expect(canTransitionMaintenance(action, status)).toBe(false);
    expect(nextMaintenanceStatus(action, status)).toBeNull();
  });
});
