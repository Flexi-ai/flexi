# Provider API Documentation

## List Available Providers

Endpoint to retrieve a list of all configured AI providers.

### Request

```http
GET /api/providers
```

### Response

**200 OK**

```json
{
  "providers": ["openai", "claude"]
}
```

## List Available Models

Endpoint to retrieve available models for a specific provider.

### Request

```http
GET /api/providers/{provider}/models
```

#### Path Parameters

| Parameter | Type   | Required | Description                 |
| --------- | ------ | -------- | --------------------------- |
| provider  | string | Yes      | The name of the AI provider |

### Response

**200 OK**

```json
{
  "models": ["gpt-4", "gpt-3.5-turbo"]
}
```

**404 Not Found**

```json
{
  "error": "Provider not found"
}
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests:

- `200 OK`: Request successful
- `404 Not Found`: Provider not found

Error responses will include a JSON object with an `error` field containing a description of the error.
