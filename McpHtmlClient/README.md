# Secure MCP HTML Client

This is a simple HTML client for testing the Secure MCP Server. It provides a user interface for authentication and interacting with MCP tools.

## Features

- User authentication with JWT
- Display available MCP tools
- Execute MCP tools with parameters
- View tool execution results
- Real-time connection status

## Setup and Usage

### Prerequisites

- Node.js installed for running the local web server
- Secure MCP Server running on `https://localhost:7001` (or update the URL in `app.js`)

### Running the Client

1. Start the local web server:

```bash
node server.js
```

1. Open your browser and navigate to:

```text
http://localhost:3000
```

1. Log in with credentials:
   - For regular user access: any username without "admin" and any password
   - For admin access: any username containing "admin" and any password

### Using the Client

1. After logging in, you'll see available MCP tools
2. Click on a tool to select it
3. Enter any required parameters
4. Click "Execute Tool" to run the tool
5. View the results in the Response section

## Security Notes

- The client uses JWT Bearer tokens for authentication
- Tokens are stored in localStorage (in a production app, consider more secure storage)
- The server validates user authentication and authorization for each MCP request
- Admin tools are only available to users with the Admin role

## Troubleshooting

- If you see "Error connecting to MCP server", ensure the Secure MCP Server is running
- If authentication fails, check the server logs for more details
- Clear your browser cache if you experience unexpected behavior
