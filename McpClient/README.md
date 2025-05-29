# MCP Client Sample

This console application demonstrates how to connect to a secure MCP server using authentication and authorization.

## Features

- Authentication with the server to obtain a JWT token
- Connecting to an MCP server using the token
- Listing available tools
- Calling tools with different authorization levels
- Error handling for unauthorized access

## Getting Started

### Prerequisites

- .NET 8.0 SDK or later
- Running instance of the SecureMcpServer sample

### Running the Client

1. Update the `ServerBaseUrl` in Program.cs to match your server deployment if needed
2. Build and run the application:

```bash
dotnet run
```

### Testing Different Authorization Levels

- By default, the client authenticates as a regular user
- To test admin access, modify the `Username` in the `GetAuthToken` method to include "admin" (e.g., "admin_user")

## How It Works

1. The client first authenticates with the server to obtain a JWT token
2. It then connects to the MCP server using the token as a query parameter
3. The client lists available tools and calls them with appropriate parameters
4. The server validates the token and authorization for each tool call

## Security Notes

- In production, implement secure credential storage
- Consider adding token refresh logic for long-running applications
- Always use HTTPS for secure communication

## License

This sample is provided under the MIT License.
