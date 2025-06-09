# Secure MCP Integration Project

This project demonstrates secure integration between a Model Context Protocol (MCP) server and an HTML/JavaScript client using JWT authentication and authorization.

## Project Structure

The project consists of two main components:

1. **SecureMcpServer**: An ASP.NET Core server implementing MCP with JWT authentication and role-based authorization
2. **McpHtmlClient**: A simple HTML/JavaScript client for interacting with the secure MCP server

## Features

### Server Features

- JWT-based authentication with role-based access control
- MCP server with HTTP transport integration
- Authorization policies for regular and admin tools
- Secure session establishment and validation
- CORS support for cross-origin requests

### Client Features

- User authentication with JWT
- Role-based tool filtering
- Server-sent events (SSE) for real-time connection
- Dynamic tool parameter rendering
- Tool execution with proper authorization

## Setup and Usage

### Prerequisites

- .NET 8.0 SDK for running the server
- Node.js installed for running the client web server
- Modern web browser with JavaScript enabled

### Running the Server

1. Navigate to the SecureMcpServer directory:

   ```bash
   cd SecureMcpServer
   ```

1. Start the MCP server:

   ```bash
   dotnet run
   ```

The server will start on `http://localhost:5000`.

### Running the Client

1. Navigate to the McpHtmlClient directory:

   ```bash
   cd McpHtmlClient
   ```

1. Start the local web server:

   ```bash
   node server.js
   ```

1. Open your browser and navigate to:

   ```text
   http://localhost:3000
   ```

1. Log in with credentials:
   - Regular user: username `user`, password `password`
   - Admin user: username `admin`, password `adminpassword`

### Using the Client

1. After logging in, you'll see available MCP tools
2. Click on a tool to select it
3. Enter any required parameters
4. Click "Execute Tool" to run the tool
5. View the results in the Response section

## Security Implementation

### Authentication

- **JWT-based Authentication**: Users authenticate via username/password and receive a JWT token
- **Token Generation**: The `TokenService` creates signed JWTs with user identity and role claims
- **Token Validation**: The JWT Bearer middleware validates tokens on every request
- **Credential Validation**: Server validates credentials against predefined values (in demo)

### Authorization

- **Role-Based Access Control (RBAC)**: Users are assigned roles ("User" or "Admin")
- **Policy-Based Authorization**: Two policies defined:
  - `McpAccess`: Requires authenticated users (basic access)
  - `McpAdminTools`: Requires the "Admin" role (elevated access)
- **Tool-Level Authorization**: MCP tools are decorated with `[Authorize]` attributes specifying required policies
- **Client-Side Filtering**: Client filters tools based on user roles extracted from JWT

### Transport Security

- **HTTP Transport**: MCP server uses HTTP transport with JWT authentication
- **CORS Configuration**: Server allows cross-origin requests from the client origin
- **Session Management**: MCP sessions are established with proper authentication checks
- **Secure API Calls**: All requests include the JWT token in Authorization header

## Troubleshooting

- **Connection Issues**: If you see "Error connecting to MCP server", ensure the server is running on the correct port
- **Authentication Failures**:
  - Verify you're using the correct credentials: `user`/`password` or `admin`/`adminpassword`
  - Check server logs for detailed authentication errors
- **Missing Tools**: If tools aren't showing up, ensure your user has the appropriate role
- **Tool Execution Errors**: Check the server logs for authorization or execution errors
- **Browser Issues**: Clear your browser cache and local storage if experiencing unexpected behavior

## Production Recommendations

### Server Enhancements

- **Secure Credential Storage**: Replace hardcoded credentials with a proper user database
- **Password Hashing**: Use a secure hashing algorithm (like bcrypt or Argon2) for passwords
- **HTTPS Requirement**: Configure the server to use HTTPS with proper certificates
- **Token Refresh**: Implement refresh tokens with shorter-lived access tokens
- **Rate Limiting**: Add rate limiting to prevent abuse of the API
- **Comprehensive Logging**: Implement detailed security logging and monitoring

### Client Enhancements

- **Secure Token Storage**: Use more secure storage mechanisms than localStorage
- **CSRF Protection**: Implement anti-CSRF tokens for state-changing operations
- **Content Security Policy**: Add CSP headers to prevent XSS attacks
- **Error Handling**: Improve error handling and user feedback
- **Input Validation**: Add client-side validation for tool parameters

## Technical Architecture

### Component Diagram

```ascii
+----------------+      JWT Auth      +------------------+
|                |<------------------>|                  |
|  HTML Client   |                    |   ASP.NET Core   |
|  (JavaScript)  |      MCP/SSE       |   MCP Server     |
|                |<------------------>|                  |
+----------------+                    +------------------+
                                              |
                                              | Uses
                                              v
                                     +------------------+
                                     |   MCP Tools     |
                                     |   - BasicTool   |
                                     |   - AdminTool   |
                                     +------------------+
```

### Technology Stack

**Server:**

- ASP.NET Core 8.0
- ModelContextProtocol SDK (0.2.0-preview.3)
- JWT Bearer Authentication
- Policy-based Authorization

**Client:**

- HTML5 / CSS / JavaScript
- EventSource for SSE
- Fetch API for HTTP requests
- Bootstrap for UI components

### Communication Flow

1. **Authentication Flow:**
   - Client sends credentials to `/api/auth/login`
   - Server validates credentials and returns JWT token
   - Client stores token and extracts user roles

2. **MCP Connection Flow:**
   - Client connects to SSE endpoint `/sse` with JWT token
   - Server validates token and establishes SSE connection
   - Server sends message endpoint URL to client

3. **Tool Execution Flow:**
   - Client requests tools list via SSE connection
   - Server returns available tools (filtered by authorization)
   - Client filters tools based on user roles
   - User selects and executes tool
   - Client sends tool execution request to message endpoint
   - Server validates authorization and executes tool
   - Server returns tool execution result to client
