export class LockStateError extends Error {
  constructor(msg: string) {
    super(msg);

    Object.setPrototypeOf(this, LockStateError.prototype);
  }
}

export class ConnectionNotFoundError extends Error {
  constructor(msg: string) {
    super(msg);

    Object.setPrototypeOf(this, LockStateError.prototype);
  }
}
