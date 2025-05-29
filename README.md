# Secure MCP Server and Client Samples

This repository contains code samples demonstrating how to implement security in a Model Context Protocol (MCP) server using HTTP/SSE transport in C# and .NET, along with a client application that shows how to connect to the secure server.

## Repository Structure

- **SecureMcpServer**: A complete ASP.NET Core application implementing a secure MCP server with JWT authentication
- **McpClient**: A console application demonstrating how to authenticate and connect to the secure MCP server

## Getting Started

1. Start by running the SecureMcpServer application
2. Then run the McpClient application to see how authentication and secure tool calls work

## Security Features

- JWT Bearer token authentication
- Authorization policies for different MCP tools
- Support for HTTP/SSE connections with query parameter token passing
- Role-based access control for MCP tools

## Prerequisites

- .NET 8.0 SDK or later
- Visual Studio 2022, VS Code, or any preferred IDE
- ModelContextProtocol package version 0.5.0-preview.1 or later

## Important Note

This project requires version 0.5.0-preview.1 or later of the ModelContextProtocol package. The current latest version available on NuGet is 0.2.0-preview.1, which is not compatible with the security features implemented in this project. The code will be updated to work with the newer version once it becomes available.

## License

These samples are provided under the MIT License.

## Additional Resources

For more information about the Model Context Protocol:
- [MCP C# SDK](https://github.com/modelcontextprotocol/csharp-sdk)
- [Building an MCP Server in C#](https://devblogs.microsoft.com/dotnet/build-a-model-context-protocol-mcp-server-in-csharp/)
