import jwt
import requests
import datetime
import base64

secret = "vM7qlFhbNZstnOhd1IG3f7JJhtCKR9VTFd0E28772k6rkW871+YT1cVCnn5ABbF7fl2JPhGWQcxyzOSUcR0bew=="
encoded_secret = base64.b64decode(secret)

payload = {
    "sub": "1",
    "accountType": "STUDENT",
    "role": "ROLE_STUDENT",
    "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=1),
    "iat": datetime.datetime.now(datetime.UTC)
}

token = jwt.encode(payload, encoded_secret, algorithm="HS512")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

body = {
  "fullName": "Sami",
  "studyYear": "Year 3",
  "departmentId": 1,
  "gender": "Male",
  "phone": "+880 1XXXXXXXXX",
  "profilePictureUrl": "",
  "bio": "Data engineering is my interest"
}

response = requests.put("http://localhost:8080/api/v1/students/me", json=body, headers=headers)
print("Status Code:", response.status_code)
print("Response Body:", response.text)
