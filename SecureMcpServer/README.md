# Secure MCP Server Sample

This project demonstrates how to implement security in a Model Context Protocol (MCP) server using HTTP/SSE transport in ASP.NET Core.

## Features

- JWT Bearer token authentication
- Authorization policies for MCP tools
- Support for HTTP/SSE connections with query parameter token passing
- Sample MCP tools with different authorization levels
- Swagger UI for API testing

## Getting Started

### Prerequisites

- .NET 8.0 SDK or later
- Visual Studio 2022, VS Code, or any preferred IDE

### Running the Server

1. Clone or download this repository
2. Navigate to the SecureMcpServer directory
3. Run the application:

```bash
dotnet run
```

4. The server will start at https://localhost:7001 and http://localhost:5001

### Testing Authentication

1. Use Swagger UI at https://localhost:7001/swagger to test the authentication:
   - Navigate to the `/api/Auth/login` endpoint
   - Use the following JSON payload:
     ```json
     {
       "username": "user",
       "password": "password"
     }
     ```
   - For admin access, include "admin" in the username:
     ```json
     {
       "username": "admin",
       "password": "password"
     }
     ```
   - The response will contain a JWT token

2. Use the token to access the MCP server:
   - For HTTP/SSE connections, append the token as a query parameter:
     ```
     https://localhost:7001/mcp?access_token=your_token_here
     ```

## Security Notes

- In production, replace the JWT key in appsettings.json with a secure key
- Always use HTTPS in production environments
- Implement proper user authentication against a secure database
- Consider adding refresh token functionality for long-lived connections

## License

This sample is provided under the MIT License.
