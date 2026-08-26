export type DomainErrorCode =
  | "INVALID_PHASE"
  | "UNKNOWN_MITIGATION"
  | "STALE_MITIGATION"
  | "NO_STAGED_MITIGATION"
  | "MITIGATION_ID_MISMATCH"
  | "NOT_APPROVED"
  | "INCIDENT_BINDING_MISMATCH"
  | "NO_RECOVERY";

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export const invariant: (
  condition: unknown,
  code: DomainErrorCode,
  message: string,
) => asserts condition = (condition, code, message) => {
  if (!condition) {
    throw new DomainError(code, message);
  }
};
