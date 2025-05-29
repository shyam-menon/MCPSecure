using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace SecureMcpServer.MCP
{
    [McpServerToolType]
    public class SecureTools
    {
        private readonly ILogger<SecureTools> _logger;

        public SecureTools(ILogger<SecureTools> logger)
        {
            _logger = logger;
        }

        [McpServerTool, Description("A basic tool that requires user authentication")]
        [Authorize(Policy = "McpAccess")]
        public string BasicTool(string input)
        {
            _logger.LogInformation("BasicTool called with input: {Input}", input);
            return $"Processed by BasicTool: {input}";
        }
        
        [McpServerTool, Description("An admin tool that requires admin privileges")]
        [Authorize(Policy = "McpAdminTools")]
        public string AdminTool(string input)
        {
            _logger.LogInformation("AdminTool called with input: {Input}", input);
            return $"Processed by AdminTool: {input} (requires admin privileges)";
        }
        
        [McpServerTool, Description("Echoes the message back to the client")]
        [Authorize(Policy = "McpAccess")]
        public string Echo(string message)
        {
            _logger.LogInformation("Echo called with message: {Message}", message);
            return $"Echo: {message}";
        }
    }
}
