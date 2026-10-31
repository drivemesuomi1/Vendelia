/** An expected failure with a client-facing error code (translated by the frontend). */
export class HttpProblem extends Error {
  constructor(public readonly statusCode: number, public readonly code: string) { super(code); }
}
