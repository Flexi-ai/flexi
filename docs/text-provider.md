# Text Completion API Documentation

## Create Completion

Generates a completion using the specified AI provider. For streaming responses, set 'stream: true' in the request body.

### Request

```http
POST /api/completion
```

### Request Body

The API accepts both JSON and multipart form data formats.

#### JSON Format

```json
{
  "provider": "string",
  "messages": [
    {
      "role": "user",
      "content": "string"
    }
  ],
  "temperature": 0.7,
  "maxTokens": 100,
  "model": "string",
  "show_stats": false,
  "stream": false
}
```

#### Fields

| Field              | Type    | Required | Description                                            |
| ------------------ | ------- | -------- | ------------------------------------------------------ |
| provider           | string  | Yes      | The AI provider to use                                 |
| messages           | array   | Yes      | Array of message objects                               |
| messages[].role    | string  | Yes      | Role of the message ("user", "assistant", or "system") |
| messages[].content | string  | Yes      | Content of the message                                 |
| temperature        | number  | No       | Controls randomness (0-1)                              |
| maxTokens          | integer | No       | Maximum number of tokens to generate                   |
| model              | string  | No       | Specific model to use                                  |
| show_stats         | boolean | No       | Whether to return model and usage statistics           |
| stream             | boolean | No       | Whether to stream the response as Server-Sent Events   |

#### Multipart Form Data

For file processing, use `multipart/form-data` with:

- `input_file`: File to be processed by the AI model (binary)
- `request`: JSON string containing the request parameters

Example request parameter:

```json
{ "provider": "openai", "messages": [{ "role": "user", "content": "Hello" }] }
```

### Response

#### Standard Response (JSON)

**200 OK**

```json
{
  "content": "I'm doing well, thank you for asking! How can I help you today?",
  "model": "gpt-3.5-turbo",
  "provider": "openai",
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 15,
    "total_tokens": 35
  }
}
```

#### Streaming Response (Server-Sent Events)

When `stream: true`, the response will be sent as Server-Sent Events with the same structure as above, but delivered in chunks.

### Error Responses

**400 Bad Request**

```json
{
  "error": "Invalid request parameters"
}
```

**404 Not Found**

```json
{
  "error": "Provider not found"
}
```

**500 Server Error**

```json
{
  "error": "An unknown error occurred"
}
```

## Error Handling

The API uses standard HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid parameters
- `404 Not Found`: Provider not found
- `500 Server Error`: Internal server error

Error responses include a JSON object with an `error` field containing a description of the error.
