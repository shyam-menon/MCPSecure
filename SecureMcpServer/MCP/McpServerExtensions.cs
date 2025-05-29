using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using ModelContextProtocol.Server;
using SecureMcpServer.Middleware;

namespace SecureMcpServer.MCP
{
    public static class McpServerExtensions
    {
        public static IServiceCollection AddSecureMcpServer(
            this IServiceCollection services)
        {
            // Add MCP server with security integration
            services.AddMcpServer()
                .WithStdioServerTransport()
                // Note: In 0.2.0-preview.1, HTTP transport configuration is different
                // We're using StdioServerTransport as a temporary solution
                // Authorization middleware will need to be configured differently
                .WithToolsFromAssembly();
            
            return services;
        }
    }
}
