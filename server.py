import http.server
import ssl
import socketserver

# Use 0.0.0.0 to listen on all available network interfaces
PORT = 8443
ADDRESS = "0.0.0.0"

handler = http.server.SimpleHTTPRequestHandler

# Create a secure SSL context
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)

# Load your certificate and private key.
# Make sure the .crt and .key files are in the same directory.
try:
    context.load_cert_chain(certfile="localhost.crt", keyfile="localhost.key")
except FileNotFoundError:
    print("Error: Could not find 'localhost.crt' or 'localhost.key'.")
    print("Please run the openssl command to generate them first.")
    exit()

# Create and start the server
with socketserver.TCPServer((ADDRESS, PORT), handler) as httpd:
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    print(f"✅ Server started! Open your mobile browser to:")
    print(f"   https://localhost:{PORT}")
    
    httpd.serve_forever()

