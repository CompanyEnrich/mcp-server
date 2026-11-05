type ToolTextContent = {
	type: "text";
	text: string;
};

export type ToolResult = {
	content: ToolTextContent[];
	isError?: boolean;
	structuredContent?: Record<string, unknown>;
};

export type QueryValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| Array<string | number | boolean | null | undefined>;

export type ApiRequestOptions = {
	method?: "GET" | "POST" | "PUT" | "DELETE";
	query?: Record<string, QueryValue>;
	body?: unknown;
	notFoundMessage?: string;
};

export function requireEnvValue(value: string | undefined, name: string) {
	if (!value) {
		throw new Error(`${name} is not configured`);
	}

	return value;
}

type CreditInfo = {
	balance?: number;
	cost?: number;
	remaining?: number;
};

export async function apiRequest(
	baseUrl: string,
	accessToken: string | undefined,
	path: string,
	options: ApiRequestOptions = {},
): Promise<ToolResult> {
	try {
		const response = await fetch(buildUrl(baseUrl, path, options.query), {
			method: options.method ?? "GET",
			headers: buildHeaders(accessToken, options.body !== undefined),
			body:
				options.body === undefined ? undefined : JSON.stringify(options.body),
		});

		const errorResponse = await handleHttpError(
			response,
			options.notFoundMessage,
		);
		if (errorResponse) {
			return errorResponse;
		}

		const data = await readJson(response);
		const result = attachCreditInfo(data, parseCreditHeaders(response.headers));

		return jsonToolResult(result);
	} catch (error) {
		return toolError(
			`Error calling CompanyEnrich API: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

export function toolError(message: string): ToolResult {
	return {
		content: [
			{
				type: "text",
				text: message,
			},
		],
		isError: true,
	};
}

function buildUrl(
	baseUrl: string,
	path: string,
	query?: Record<string, QueryValue>,
) {
	const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const url = new URL(`${normalizedBase}${normalizedPath}`);

	for (const [key, value] of Object.entries(query ?? {})) {
		appendQueryValue(url.searchParams, key, value);
	}

	return url.toString();
}

function appendQueryValue(
	searchParams: URLSearchParams,
	key: string,
	value: QueryValue,
) {
	if (value === undefined || value === null) {
		return;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			if (item !== undefined && item !== null) {
				searchParams.append(key, String(item));
			}
		}
		return;
	}

	searchParams.append(key, String(value));
}

function buildHeaders(accessToken: string | undefined, hasBody: boolean) {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${accessToken ?? ""}`,
		"x-companyenrich-app": "mcp",
	};

	if (hasBody) {
		headers["Content-Type"] = "application/json";
	}

	return headers;
}

async function handleHttpError(
	response: Response,
	notFoundMessage?: string,
): Promise<ToolResult | null> {
	if (response.ok) {
		return null;
	}

	if (response.status === 404 && notFoundMessage) {
		return toolError(notFoundMessage);
	}

	const bodyMessage = await readErrorMessage(response);
	const statusMessage = getStatusMessage(response.status);
	const message = bodyMessage
		? `${statusMessage}: ${bodyMessage}`
		: statusMessage;

	return toolError(message);
}

function getStatusMessage(status: number) {
	if (status === 400) {
		return "Invalid request";
	}
	if (status === 401) {
		return "Authentication failed. Please check your API key.";
	}
	if (status === 402) {
		return "Insufficient credits. Please check your account balance.";
	}
	if (status === 403) {
		return "Forbidden. Your API key does not have access to this endpoint.";
	}
	if (status === 404) {
		return "Resource not found in the database.";
	}
	if (status === 429) {
		return "Rate limit exceeded. Please try again later.";
	}
	return `Error ${status}`;
}

async function readErrorMessage(response: Response) {
	const text = await response.text();
	if (!text) {
		return undefined;
	}

	try {
		const parsed = JSON.parse(text);
		return extractProblemMessage(parsed) ?? text;
	} catch {
		return text;
	}
}

function extractProblemMessage(value: unknown): string | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const detail = readString(value.detail);
	if (detail) {
		return detail;
	}

	const title = readString(value.title);
	if (title) {
		return title;
	}

	const errors = value.errors;
	if (isRecord(errors)) {
		const messages = Object.entries(errors).flatMap(([field, fieldErrors]) => {
			if (Array.isArray(fieldErrors)) {
				return fieldErrors.map((error) => `${field}: ${String(error)}`);
			}
			return [`${field}: ${String(fieldErrors)}`];
		});

		if (messages.length > 0) {
			return messages.join("; ");
		}
	}

	return undefined;
}

async function readJson(response: Response) {
	const text = await response.text();
	if (!text) {
		return {};
	}

	return JSON.parse(text);
}

function parseCreditHeaders(headers: Headers): CreditInfo | undefined {
	const balance = readNumberHeader(headers, "x-credit-balance");
	const cost = readNumberHeader(headers, "x-credit-cost");
	const remaining = readNumberHeader(headers, "x-credit-remaining");

	if (balance === undefined && cost === undefined && remaining === undefined) {
		return undefined;
	}

	return { balance, cost, remaining };
}

function readNumberHeader(headers: Headers, name: string): number | undefined {
	const raw = headers.get(name);
	if (raw === null) {
		return undefined;
	}

	const num = Number(raw);
	return Number.isFinite(num) ? num : undefined;
}

function attachCreditInfo(data: unknown, creditInfo: CreditInfo | undefined) {
	if (!creditInfo) {
		return data;
	}

	if (isRecord(data)) {
		return {
			...data,
			creditInfo,
		};
	}

	return {
		data,
		creditInfo,
	};
}

function jsonToolResult(data: unknown): ToolResult {
	const structuredContent = isRecord(data) ? data : { data };

	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(data),
			},
		],
		structuredContent,
	};
}

function readString(value: unknown) {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
