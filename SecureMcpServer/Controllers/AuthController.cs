using Microsoft.AspNetCore.Mvc;
using SecureMcpServer.Models;
using SecureMcpServer.Services;

namespace SecureMcpServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly TokenService _tokenService;
        
        public AuthController(TokenService tokenService)
        {
            _tokenService = tokenService;
        }
        
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginModel model)
        {
            // In a real application, validate credentials against a database
            // This is a simplified example
            if (IsValidUser(model.Username, model.Password))
            {
                // Determine user roles (from database in real app)
                string[] roles = GetUserRoles(model.Username);
                
                // Generate token
                var token = _tokenService.GenerateToken(model.Username, roles);
                
                return Ok(new { token });
            }
            
            return Unauthorized();
        }
        
        // Improved validation - still demo but with fixed credentials
        private bool IsValidUser(string username, string password)
        {
            // In production, validate against secure credential store with proper password hashing
            // For this demo, we use fixed credentials
            return (username.ToLower() == "user" && password == "password") ||
                   (username.ToLower() == "admin" && password == "adminpassword");
        }
        
        private string[] GetUserRoles(string username)
        {
            // In production, retrieve from user database
            // For demo purposes, if username contains "admin", give admin role
            if (username.ToLower().Contains("admin"))
            {
                return new[] { "User", "Admin" };
            }
            
            return new[] { "User" };
        }
    }
}
