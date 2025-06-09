using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using System.Text;
using SecureMcpServer.Services;
using SecureMcpServer.Middleware;
using ModelContextProtocol.Server;
using ModelContextProtocol.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS support
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClientOrigin",
        builder => builder
            .WithOrigins("http://localhost:3000")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

// Register the token service
builder.Services.AddSingleton<TokenService>();

// Configure JWT authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("JWT Issuer not configured"),
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? throw new InvalidOperationException("JWT Audience not configured"),
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured")))
    };
    
    // Configure for SSE connections (critical for MCP over SSE)
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // Extract token from query string for SSE connections
            var accessToken = context.Request.Query["access_token"];
            
            // Check if the request is for our MCP endpoint
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && 
                path.StartsWithSegments("/mcp"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Add authorization policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("McpAccess", policy =>
        policy.RequireAuthenticatedUser());
    
    options.AddPolicy("McpAdminTools", policy =>
        policy.RequireRole("Admin"));
});

// Configure MCP server with HTTP transport and security integration
builder.Services.AddMcpServer()
    .WithHttpTransport(options => 
    {
        // Configure security for MCP sessions
        options.RunSessionHandler = async (context, server, cancellationToken) =>
        {
            // Ensure the user is authenticated
            if (context.User?.Identity?.IsAuthenticated != true)
            {
                context.Response.StatusCode = 401; // Unauthorized
                await context.Response.WriteAsync("Authentication required for MCP server access");
                return;
            }

            // Check if user has the required role/policy
            var authService = context.RequestServices.GetRequiredService<IAuthorizationService>();
            var authResult = await authService.AuthorizeAsync(context.User, null, "McpAccess");
            
            if (!authResult.Succeeded)
            {
                context.Response.StatusCode = 403; // Forbidden
                await context.Response.WriteAsync("You do not have permission to access the MCP server");
                return;
            }
            
            // User is authorized, run the MCP server session
            await server.RunAsync(cancellationToken);
        };
    })
    .WithToolsFromAssembly();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Enable CORS
app.UseCors("AllowClientOrigin");

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Map the MCP endpoint to the /sse path
app.MapMcp("/sse");

// Run the application
app.Run();
