export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure<TProblem> = {
  ok: false;
  problem: TProblem;
};

export type ApiResult<TData, TProblem> = ApiSuccess<TData> | ApiFailure<TProblem>;
