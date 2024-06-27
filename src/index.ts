/**
 * A simple and powerful high order function to extend fetch.
 *
 * @packageDocumentation
 */

/**
 * Arguments of fetch function.
 *
 * @throws {Error} if a first argument of fetch is `Request` object. only string and URL are supported.
 * @see {fetch, RequestInfo, Request}
 *
 * @public
 */
export type FetchArgs = [string | URL, RequestInit | undefined];

/**
 * Type of `returnFetch` function.
 * It is useful for whom want to write customized returnFetch function.
 *
 * @public
 */
export type ReturnFetch = typeof returnFetch;

/**
 * Options of `returnFetch` function.
 *
 * @public
 */
export type ReturnFetchDefaultOptions = {
  /**
   * `fetch` function to be used in `returnFetch` function.
   * If not provided, `fetch` function in global scope will be used.
   * Any fetch implementation can be used, such as `node-fetch`, `cross-fetch`, `isomorphic-fetch`, etc.
   *
   * a `fetch` function created by `returnFetch` also can be used here.
   *
   * @public
   */
  fetch?: ReturnType<ReturnFetch>;
  /**
   * Base URL of fetch. It will be used when the first argument of fetch is relative URL.
   *
   * @public
   */
  baseUrl?: string | URL;
  /**
   * Default headers of fetch. It will be used when the second argument of fetch does not have `headers` property.
   * If it is provided and `headers` also provided when calling a `fetch`, headers will be merged.
   * Priority of headers is `requestInit.headers` > `defaultOptions.headers`. Duplicated headers will be overwritten.
   *
   * @public
   */
  headers?: HeadersInit;
  interceptors?: {
    /**
     * Request interceptor. It will be called before request.
     *
     * @param requestArgs Arguments of fetch function.
     * @param fetch the `fetch` you provided at {@link ReturnFetchDefaultOptions['fetch']}
     *
     * @public
     */
    request?: (
      requestArgs: FetchArgs,
      fetch: NonNullable<ReturnFetchDefaultOptions["fetch"]>,
    ) => Promise<FetchArgs>;
    /**
     * Response interceptor. It will be called after response.
     *
     * @param response Response object received from fetch function.
     * @param requestArgs Arguments of fetch function.
     * @param fetch the `fetch` you provided at {@link ReturnFetchDefaultOptions['fetch']}
     *
     * @public
     */
    response?: (
      response: Response,
      requestArgs: FetchArgs,
      fetch: NonNullable<ReturnFetchDefaultOptions["fetch"]>,
    ) => Promise<Response>;
  };
};

const applyDefaultOptions = (
  [input, requestInit]: FetchArgs,
  defaultOptions?: ReturnFetchDefaultOptions,
): FetchArgs => {
  const headers = new Headers(defaultOptions?.headers);
  new Headers(requestInit?.headers).forEach((value, key) => {
    headers.set(key, value);
  });

  let inputToReturn: FetchArgs[0] = input;
  if (defaultOptions?.baseUrl) {
    inputToReturn = new URL(input, defaultOptions.baseUrl);
  }

  return [
    inputToReturn,
    {
      ...requestInit,
      headers,
    },
  ];
};

// To handle Request object we need to read body as ArrayBuffer.
// If you have a better way, please let me know.
const mergeRequestObjectWithRequestInit = async(
  request: Request,
  requestInit?: RequestInit,
): Promise<RequestInit> => {
  const mergedRequest = new Request(request, requestInit);
  
  const body = await mergedRequest.arrayBuffer()
  
  return {
    method: mergedRequest.method,
    headers: mergedRequest.headers,
    body,
    referrer: mergedRequest.referrer,
    referrerPolicy: mergedRequest.referrerPolicy,
    mode: mergedRequest.mode,
    cache: mergedRequest.cache,
    redirect: mergedRequest.redirect,
    credentials: mergedRequest.credentials,
    integrity: mergedRequest.integrity,
    keepalive: mergedRequest.keepalive,
    signal: mergedRequest.signal,
    window: requestInit?.window,
  }
};

const normalizeArgs = async (
  ...args: Parameters<typeof fetch>
): Promise<FetchArgs> => {
  let input: string | URL;
  let requestInit: RequestInit | undefined;
  if (args[0] instanceof Request) {
    input = args[0].url;
    requestInit = await mergeRequestObjectWithRequestInit(args[0], args[1]);
  } else {
    input = args[0];
    requestInit = args[1];
  }

  return [input, requestInit];
};

const returnFetch =
  (defaultOptions?: ReturnFetchDefaultOptions) =>
  async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const defaultOptionAppliedArgs = applyDefaultOptions(
      await normalizeArgs(...args),
      defaultOptions,
    );

    // apply request interceptor
    const fetchProvided = defaultOptions?.fetch || fetch;
    let requestInterceptorAppliedArgs: FetchArgs;
    if (defaultOptions?.interceptors?.request) {
      requestInterceptorAppliedArgs =
        await defaultOptions?.interceptors?.request?.(
          defaultOptionAppliedArgs,
          fetchProvided,
        );
    } else {
      requestInterceptorAppliedArgs = defaultOptionAppliedArgs;
    }

    // ajax call
    const response = await fetchProvided(...requestInterceptorAppliedArgs);

    // apply response interceptor
    return (
      defaultOptions?.interceptors?.response?.(
        response,
        requestInterceptorAppliedArgs,
        fetchProvided,
      ) || response
    );
  };

export default returnFetch;
