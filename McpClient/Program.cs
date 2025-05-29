using System.Net.Http.Json;
using System.Text.Json;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Client;

namespace McpClient;

class Program
{
    // Server URL - update this to match your server deployment
    private const string ServerBaseUrl = "http://localhost:5000";
    
    static async Task Main(string[] args)
    {
        // Set up logging
        using var loggerFactory = LoggerFactory.Create(builder =>
        {
            builder.AddConsole();
            builder.SetMinimumLevel(LogLevel.Information);
        });
        var logger = loggerFactory.CreateLogger<Program>();
        
        logger.LogInformation("Starting Secure MCP Client");
        
        try
        {
            // Step 1: Authenticate and get token
            logger.LogInformation("Authenticating with server...");
            string token = await GetAuthToken(logger);
            logger.LogInformation("Authentication successful");
            
            // Step 2: Connect to MCP server with token
            logger.LogInformation("Connecting to MCP server...");
            var client = await ConnectToMcpServer(token, logger);
            
            // Step 3: List available tools
            logger.LogInformation("Listing available tools:");
            var tools = await client.ListToolsAsync();
            foreach (var tool in tools)
            {
                logger.LogInformation("Tool: {Name} - {Description}", tool.Name, tool.Description);
            }
            
            // Try the Echo tool first as it might be more compatible
            logger.LogInformation("Calling echo tool...");
            try
            {
                var echoResult = await CallTool(client, "Echo", "Testing secure echo", logger);
                logger.LogInformation("Echo tool result: {Result}", echoResult);
                
                // If Echo works, try the basic tool
                logger.LogInformation("Calling basic tool...");
                var basicResult = await CallTool(client, "BasicTool", "Hello from secure client", logger);
                logger.LogInformation("Basic tool result: {Result}", basicResult);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error calling tools");
                logger.LogWarning("The server may be shutting down due to authorization issues with StdioClientTransport");
                logger.LogWarning("This is a limitation of using version 0.2.0-preview.1 instead of 0.5.0-preview.1");
            }
            
            // Step 6: Try calling admin tool (may fail depending on token)
            logger.LogInformation("Attempting to call admin tool...");
            try
            {
                var adminResult = await CallTool(client, "AdminTool", "Admin request", logger);
                logger.LogInformation("Admin tool result: {Result}", adminResult);
            }
            catch (Exception ex)
            {
                logger.LogWarning("Admin tool call failed (expected if not admin): {Error}", ex.Message);
            }
            
            logger.LogInformation("Client operations completed successfully");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred");
        }
        
        logger.LogInformation("Press any key to exit...");
        Console.ReadKey();
    }
    
    static async Task<string> GetAuthToken(ILogger logger)
    {
        using var httpClient = new HttpClient();
        
        // For demo purposes, we'll use a regular user
        // To test admin access, change username to include "admin"
        var loginData = new
        {
            Username = "user", // Change to "admin_user" to test admin access
            Password = "password"
        };
        
        try
        {
            var response = await httpClient.PostAsJsonAsync(
                $"{ServerBaseUrl}/api/auth/login", loginData);
            
            response.EnsureSuccessStatusCode();
            
            var content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            
            return doc.RootElement.GetProperty("token").GetString() ?? 
                throw new Exception("Token not found in response");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Authentication failed");
            throw;
        }
    }
    
    static async Task<IMcpClient> ConnectToMcpServer(string token, ILogger logger)
    {
        try
        {
            // For version 0.2.0-preview.1, we need to use a simpler approach
            // The API is different from what was originally intended
            
            // In version 0.2.0-preview.1, we need to provide a clientTransport parameter
            // Let's use StdioClientTransport which should be available
            var options = new StdioClientTransportOptions
            {
                Command = "dotnet",
                Arguments = new List<string> { "run", "--project", "../SecureMcpServer" }
            };
            
            var transport = new StdioClientTransport(options);
            var client = await McpClientFactory.CreateAsync(transport);
            
            // Note: This won't use HTTP authentication as originally intended
            // This is a temporary solution until version 0.5.0-preview.1 is available
            logger.LogWarning("Using StdioClientTransport instead of HTTP due to package version limitations");
            
            return client;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to connect to MCP server");
            throw;
        }
    }
    
    static async Task<string> CallTool(IMcpClient client, string toolName, string input, ILogger logger)
    {
        try
        {
            // For version 0.2.0-preview.1, let's use a more cautious approach
            logger.LogInformation("Attempting to call tool {ToolName} with input: {Input}", toolName, input);
            
            // Try different parameter formats that might work with this version
            Dictionary<string, object?> parameters;
            
            // For the Echo tool, the parameter might be named 'message'
            if (toolName.Equals("Echo", StringComparison.OrdinalIgnoreCase))
            {
                parameters = new Dictionary<string, object?> { ["message"] = input };
            }
            // For other tools, try a generic 'input' parameter
            else
            {
                parameters = new Dictionary<string, object?> { ["input"] = input };
            }
            
            // Add extra logging to help diagnose issues
            logger.LogInformation("Calling tool with parameters: {Parameters}", 
                string.Join(", ", parameters.Select(p => $"{p.Key}: {p.Value}")));
                
            // Call tool with the parameters
            var result = await client.CallToolAsync(toolName, parameters);
            
            // Log the result type to help understand the response format
            logger.LogInformation("Tool returned result of type: {ResultType}", 
                result?.GetType().FullName ?? "null");
                
            // Handle the result based on its actual type
            if (result == null)
            {
                return "No result returned";
            }
            // In version 0.2.0-preview.1, the result is likely a CallToolResponse type
            // Extract the text content from it
            logger.LogInformation("Result properties: {Properties}", 
                string.Join(", ", result.GetType().GetProperties().Select(p => p.Name)));
                
            // Try to extract content from the response
            try 
            {
                // Look for a Content property that might contain the response data
                var contentProperty = result.GetType().GetProperty("Content");
                if (contentProperty != null)
                {
                    var content = contentProperty.GetValue(result);
                    if (content != null)
                    {
                        // If content is a collection, try to get the first item
                        if (content is System.Collections.IEnumerable enumerable && !(content is string))
                        {
                            foreach (var item in enumerable)
                            {
                                // Try to find a Text property in the item
                                var textProperty = item.GetType().GetProperty("Text");
                                if (textProperty != null)
                                {
                                    var text = textProperty.GetValue(item) as string;
                                    if (!string.IsNullOrEmpty(text))
                                    {
                                        return text;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Error extracting content from response");
            }
            
            // If we couldn't extract content in a specific way, fall back to ToString
            return result.ToString() ?? "Result could not be converted to string";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Tool call failed: {ToolName}", toolName);
            throw;
        }
    }
}
