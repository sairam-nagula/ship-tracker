import requests

def get_ship_longitude_and_latitude():
        

    url = "https://customer-api.mtnsat.com/v1/accounts/1327/sites/916"

    payload = {}
    headers = {
    'sec-ch-ua-platform': '"Windows"',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mjc1NSwiaXNfYWRtaW4iOmZhbHNlLCJpYXQiOjE3NjM3NTYzNDIsImV4cCI6MTc2Mzc5MjM0Mn0.sENaiU3jlyqeuNx6gKoI1ssBa5xB_zqV8UgCiSKVFts',
    'Referer': 'https://customer.fmcglobalsat.com/',
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/x-www-form-urlencoded'
    }

    response = requests.request("GET", url, headers=headers, data=payload)

    print(response.text)
    return response.json()
    
    

def main():
    get_ship_longitude_and_latitude()
    
if __name__ == "__main__":
    main()


