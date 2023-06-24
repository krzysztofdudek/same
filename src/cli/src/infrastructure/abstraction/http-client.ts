export interface HttpResponseError {
    code: number;
    body: string;
}

export interface IHttpClient {
    get<ResponseType>(url: string): Promise<HttpResponseError | ResponseType>;
    downloadFile(url: string, filePath: string): Promise<void>;
}