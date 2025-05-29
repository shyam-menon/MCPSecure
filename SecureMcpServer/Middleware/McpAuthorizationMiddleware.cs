using Microsoft.AspNetCore.Authorization;

namespace SecureMcpServer.Middleware
{
    public class McpAuthorizationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IAuthorizationService _authorizationService;
        private readonly ILogger<McpAuthorizationMiddleware> _logger;

        public McpAuthorizationMiddleware(
            RequestDelegate next,
            IAuthorizationService authorizationService,
            ILogger<McpAuthorizationMiddleware> logger)
        {
            _next = next;
            _authorizationService = authorizationService;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Check if user is authenticated
            if (!context.User.Identity?.IsAuthenticated ?? true)
            {
                _logger.LogWarning("Unauthorized access attempt to MCP server");
                context.Response.StatusCode = 401; // Unauthorized
                await context.Response.WriteAsync("Authentication required to access MCP server");
                return;
            }

            // Check if user has permission to access MCP
            var authResult = await _authorizationService.AuthorizeAsync(
                context.User, null, "McpAccess");
                
            if (!authResult.Succeeded)
            {
                _logger.LogWarning("Forbidden access attempt to MCP server by {User}", context.User.Identity?.Name ?? "unknown");
                context.Response.StatusCode = 403; // Forbidden
                await context.Response.WriteAsync("You do not have permission to access this resource");
                return;
            }

            _logger.LogInformation("Authorized access to MCP server by {User}", context.User.Identity?.Name ?? "unknown");
            
            // Continue with the pipeline
            await _next(context);
        }
    }
}
