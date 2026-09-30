import jwt
import requests
import datetime
import base64

secret = "vM7qlFhbNZstnOhd1IG3f7JJhtCKR9VTFd0E28772k6rkW871+YT1cVCnn5ABbF7fl2JPhGWQcxyzOSUcR0bew=="
encoded_secret = base64.b64decode(secret)

def test_get_user(user_id):
    payload = {
        "sub": str(user_id),
        "accountType": "STUDENT",
        "role": "ROLE_STUDENT",
        "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=1),
        "iat": datetime.datetime.now(datetime.UTC)
    }
    
    token = jwt.encode(payload, encoded_secret, algorithm="HS512")
    headers = {
        "Authorization": f"Bearer {token}",
    }
    
    response = requests.get("http://localhost:8080/api/v1/students/me", headers=headers)
    print(f"GET User {user_id} - Status Code: {response.status_code}")
    if response.status_code != 200:
        print(f"GET User {user_id} - Error: {response.text}")

test_get_user(7)
test_get_user(1)
