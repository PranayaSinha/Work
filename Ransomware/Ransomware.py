#!/usr/bin/env python
# -*- coding: utf-8 -*-
# vi:ts=4:et
# $Id$

import os, sys
import pycurl

# Class which holds a file reference and the read callback
class FileReader:
    def __init__(self, fp):
        self.fp = fp
    def read_callback(self, size):
        return self.fp.read(size)

# Check commandline arguments
if len(sys.argv) < 3:
    print("Usage: {} <url> <file to upload>".format(sys.argv[0]))
    sys.exit()

url = sys.argv[1]
filename = sys.argv[2]

if not os.path.exists(filename):
    print(f"Error: the file '{filename}' does not exist")
    sys.exit()

# Initialize pycurl
c = pycurl.Curl()
c.setopt(pycurl.URL, url)
c.setopt(pycurl.UPLOAD, 1)

# Two versions with the same semantics here, but the filereader version
# is useful when you have to process the data which is read before returning
if 1:
    with open(filename, 'rb') as f:
        c.setopt(pycurl.READFUNCTION, FileReader(f).read_callback)
else:
    with open(filename, 'rb') as f:
        c.setopt(pycurl.READFUNCTION, f.read)

# Set size of file to be uploaded.
filesize = os.path.getsize(filename)
c.setopt(pycurl.INFILESIZE, filesize)

# Start transfer
print(f'Uploading file {filename} to url {url}')
c.perform()
c.close()
