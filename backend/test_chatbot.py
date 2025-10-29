import json
from typing import Optional
import requests


BASE_URL = 'http://127.0.0.1:5000'


def test_message(message: str, student_id: Optional[int] = None):
    payload = {'message': message}
    if student_id is not None:
        payload['student_id'] = student_id
    resp = requests.post(f'{BASE_URL}/chatbot', json=payload, timeout=10)
    print(f'> {message}')
    print(json.dumps(resp.json(), indent=2))


if __name__ == '__main__':
    # Adjust student_id to an existing one in your DB
    sid = 1
    test_message('hello', sid)
    test_message('show my fee details', sid)
    test_message('what is my attendance', sid)
    test_message('list upcoming events')


