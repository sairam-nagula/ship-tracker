import os
import requests
from dotenv import load_dotenv

load_dotenv()

MTN_USER = os.getenv("MTN_USER") 
MTN_PASS = os.getenv("MTN_PASS")
AUTH_URL = os.getenv("MTN_AUTH_URL")

def get_token():

    url = AUTH_URL

    payload = f'username={MTN_USER}&password={MTN_PASS}'
    headers = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'authorization': 'Bearer null',
    'content-type': 'application/x-www-form-urlencoded',
    'origin': 'https://customer.fmcglobalsat.com',
    'priority': 'u=1, i',
    'referer': 'https://customer.fmcglobalsat.com/',
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    return response.json()["jwt_token"]


if __name__ == "__main__":
    get_token()
