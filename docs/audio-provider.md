# Audio Transcription API Documentation

## Transcribe Audio

Transcribes audio files into text using the specified AI provider.

```http
POST /api/transcription
```

### Request Body

The API accepts multipart form data format.

#### Multipart Form Data

- `input_file`: Audio file to be transcribed (binary)
- `request`: JSON string containing the request parameters

Example request parameters:

```json
{
  "model": "whisper-1",
  "response_format": "text",
  "temperature": 0.7,
  "prompt": "Optional transcription prompt"
}
```

#### Fields

| Field           | Type   | Required | Description                                     |
| --------------- | ------ | -------- | ----------------------------------------------- |
| input_file      | File   | Yes      | Audio file to transcribe                        |
| model           | string | No       | Specific model to use (defaults to 'whisper-1') |
| response_format | string | No       | Format of the response ('text')                 |
| temperature     | number | No       | Controls randomness (0-1)                       |
| prompt          | string | No       | Optional prompt to guide the transcription      |

### Supported Audio Formats

- MP3
- MP4
- MPEG
- MPGA
- M4A
- WAV
- WEBM

### Response

```json
{
  "transcription": "The transcribed text content",
  "model": "whisper-1",
  "provider": "openai"
}
```

#### Response Fields

| Field         | Type   | Description                      |
| ------------- | ------ | -------------------------------- |
| transcription | string | The transcribed text             |
| model         | string | The model used for transcription |
| provider      | string | The AI provider used             |

### Error Responses

| Status Code | Description                                      |
| ----------- | ------------------------------------------------ |
| 400         | Invalid request (e.g., unsupported audio format) |
| 401         | Unauthorized (invalid API key)                   |
| 500         | Server error during transcription                |
