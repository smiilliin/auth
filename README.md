# Auth - Authentication

## Install

```bash
npm install
```

.env

```
DB_USER=smile
DB_HOST=127.0.0.1
DB_PASSWORD=
DB_DATABASE=web
PORT=3000
RECAPTCHA_KEY=
```

## API

### POST /signup

Signup Request example

```json
{
  "id": "smile",
  "password": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "g_response": "recaptcha v2 response(g-recaptcha-response)"
}
```

Response example

```json
{
  "refreh-token": ""
}
```

### GET /login

Login Request example

```json
{
  "id": "smile"
  "password": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
}
```

Response example

```json
{
  "refreh-token": ""
}
```

### POST /logout

Delete refresh token

```json
{}
```

### GET /access-token

Get access token Request example

```
[headers]
Authorization: $(refresh token)
```

Response example

```json
{
  "access-token": ""
}
```

### GET /refresh-token

Update refresh token Request example

```
[headers]
Authorization: $(refresh-token)
```

Response example

```json
{
  "refresh-token": ""
}
```
