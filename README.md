# Auth

## Install

```bash
npm install
```

.env

```
DB_USER=smile
DB_HOST=localhost
DB_PASSWORD=
DB_DATABASE=web
WEB_PORT=3000
RECAPTCHA_KEY=
```

## Run

```bash
npx nodemon
```

## API

### POST /signup

Signup  
Request example

```json
{
    "id": "smile" //lowercase alphabet only
    "password": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08" //hex
    "g_response": "" //recaptcha v2 response(g-recaptcha-response)
}
```

Response example

```json
{
  "refrehToken": "" //refresh token
}
```

### POST /login

Login  
Request example

```json
{
    "id": "smile" //lowercase alphabet only
    "password": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08" //hex
}
```

Response example

```json
{
  "refrehToken": "" //refresh token
}
```

### GET /access

Get access token with refresh token  
Request example

```
[headers]
Authorization: (refresh token)
```

Response example

```json
{
  "accessToken": "" //access token
}
```

### GET /refresh

Update refresh token

```
[headers]
Authorization: (refresh token)
```

Response example

```json
{
  "refreshToken": "" //refresh token
}
```
