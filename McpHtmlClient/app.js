// Configuration
const API_BASE_URL = 'http://localhost:5000'; // Actual running server URL
const AUTH_ENDPOINT = `${API_BASE_URL}/api/auth/login`;
const MCP_ENDPOINT = `${API_BASE_URL}/sse`; // Default endpoint path for MCP over SSE

// DOM Elements
const loginForm = document.getElementById('loginForm');
const loginSection = document.getElementById('loginSection');
const mcpSection = document.getElementById('mcpSection');
const logoutBtn = document.getElementById('logoutBtn');
const toolsContainer = document.getElementById('toolsContainer');
const toolExecutionForm = document.getElementById('toolExecutionForm');
const selectedToolName = document.getElementById('selectedToolName');
const selectedToolDescription = document.getElementById('selectedToolDescription');
const toolParametersContainer = document.getElementById('toolParametersContainer');
const executeToolBtn = document.getElementById('executeToolBtn');
const cancelToolBtn = document.getElementById('cancelToolBtn');
const responseContainer = document.getElementById('responseContainer');
const clearResponseBtn = document.getElementById('clearResponseBtn');
const connectionStatus = document.getElementById('connectionStatus');

// State
let authToken = localStorage.getItem('mcp_auth_token');
let currentTools = [];
let selectedTool = null;
let eventSource = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', initialize);
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
executeToolBtn.addEventListener('click', executeSelectedTool);
cancelToolBtn.addEventListener('click', cancelToolSelection);
clearResponseBtn.addEventListener('click', clearResponses);

// Initialize the application
function initialize() {
    if (authToken) {
        showMcpInterface();
        connectToMcpServer();
    } else {
        showLoginInterface();
    }
}

// Authentication Functions
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        addResponse('Please enter both username and password', 'error');
        return;
    }
    
    try {
        const response = await fetch(AUTH_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        authToken = data.token;
        
        // Save token to localStorage
        localStorage.setItem('mcp_auth_token', authToken);
        
        showMcpInterface();
        connectToMcpServer();
        
    } catch (error) {
        addResponse(`Login error: ${error.message}`, 'error');
    }
}

function handleLogout() {
    disconnectFromMcpServer();
    localStorage.removeItem('mcp_auth_token');
    authToken = null;
    showLoginInterface();
}

// UI State Functions
function showLoginInterface() {
    loginSection.classList.remove('hidden');
    mcpSection.classList.add('hidden');
    connectionStatus.textContent = 'Not connected to MCP server';
    connectionStatus.className = 'alert alert-info mt-3';
}

function showMcpInterface() {
    loginSection.classList.add('hidden');
    mcpSection.classList.remove('hidden');
}

// MCP Server Connection
function connectToMcpServer() {
    if (eventSource) {
        eventSource.close();
    }
    
    // Create URL with token in query parameter for SSE connection
    const url = `${MCP_ENDPOINT}?access_token=${encodeURIComponent(authToken)}`;
    
    try {
        eventSource = new EventSource(url);
        
        eventSource.onopen = () => {
            connectionStatus.textContent = 'Connected to MCP server';
            connectionStatus.className = 'alert alert-success mt-3';
            fetchMcpTools();
        };
        
        eventSource.onerror = (error) => {
            connectionStatus.textContent = 'Error connecting to MCP server';
            connectionStatus.className = 'alert alert-danger mt-3';
            console.error('EventSource error:', error);
            eventSource.close();
        };
        
        // Listen for MCP server messages
        eventSource.addEventListener('message', handleMcpMessage);
        
    } catch (error) {
        connectionStatus.textContent = `Failed to connect: ${error.message}`;
        connectionStatus.className = 'alert alert-danger mt-3';
    }
}

function disconnectFromMcpServer() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
}

// Handle MCP server messages
function handleMcpMessage(event) {
    try {
        const message = JSON.parse(event.data);
        console.log('MCP message received:', message);
        
        // Process different message types
        if (message.method === 'tools/list/result') {
            handleToolsList(message.result);
        } else if (message.method === 'tools/call/result') {
            handleToolCallResult(message.result);
        } else if (message.error) {
            addResponse(`Error: ${message.error.message}`, 'error');
        }
    } catch (error) {
        console.error('Error processing MCP message:', error);
    }
}

// MCP Tool Functions
function fetchMcpTools() {
    sendMcpRequest({
        id: generateRequestId(),
        method: 'tools/list'
    });
}

function handleToolsList(result) {
    if (!result || !result.tools) {
        addResponse('No tools available', 'error');
        return;
    }
    
    currentTools = result.tools;
    renderToolsList();
}

function renderToolsList() {
    toolsContainer.innerHTML = '';
    
    currentTools.forEach(tool => {
        const toolCard = document.createElement('div');
        toolCard.className = 'col-md-4 mb-3';
        toolCard.innerHTML = `
            <div class="card tool-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${tool.name}</h5>
                    <p class="card-text">${tool.description || 'No description available'}</p>
                </div>
            </div>
        `;
        
        toolCard.addEventListener('click', () => selectTool(tool));
        toolsContainer.appendChild(toolCard);
    });
}

function selectTool(tool) {
    selectedTool = tool;
    selectedToolName.textContent = tool.name;
    selectedToolDescription.textContent = tool.description || 'No description available';
    
    // Generate parameter inputs based on tool schema
    renderToolParameters(tool);
    
    toolExecutionForm.classList.remove('hidden');
}

function renderToolParameters(tool) {
    toolParametersContainer.innerHTML = '';
    
    if (!tool.inputSchema || !tool.inputSchema.properties) {
        toolParametersContainer.innerHTML = '<p>This tool does not require any parameters.</p>';
        return;
    }
    
    const properties = tool.inputSchema.properties;
    const required = tool.inputSchema.required || [];
    
    Object.keys(properties).forEach(paramName => {
        const param = properties[paramName];
        const isRequired = required.includes(paramName);
        
        const paramDiv = document.createElement('div');
        paramDiv.className = 'mb-3';
        
        paramDiv.innerHTML = `
            <label for="param-${paramName}" class="form-label">
                ${paramName}${isRequired ? ' *' : ''}
            </label>
            <input type="text" class="form-control" id="param-${paramName}" 
                placeholder="${param.description || ''}"
                ${isRequired ? 'required' : ''}>
            <small class="text-muted">${param.description || ''}</small>
        `;
        
        toolParametersContainer.appendChild(paramDiv);
    });
}

function cancelToolSelection() {
    selectedTool = null;
    toolExecutionForm.classList.add('hidden');
}

function executeSelectedTool() {
    if (!selectedTool) return;
    
    const args = {};
    
    // Collect parameter values
    if (selectedTool.inputSchema && selectedTool.inputSchema.properties) {
        Object.keys(selectedTool.inputSchema.properties).forEach(paramName => {
            const inputElement = document.getElementById(`param-${paramName}`);
            if (inputElement) {
                args[paramName] = inputElement.value;
            }
        });
    }
    
    // Call the tool
    sendMcpRequest({
        id: generateRequestId(),
        method: 'tools/call',
        params: {
            name: selectedTool.name,
            arguments: args
        }
    });
    
    addResponse(`Executing tool: ${selectedTool.name}...`, 'info');
}

function handleToolCallResult(result) {
    if (!result) {
        addResponse('Tool execution completed with no result', 'info');
        return;
    }
    
    if (result.content && result.content.length > 0) {
        result.content.forEach(item => {
            if (item.text) {
                addResponse(`Result: ${item.text}`, 'success');
            } else {
                addResponse('Received non-text result', 'info');
            }
        });
    } else {
        addResponse('Tool execution completed', 'info');
    }
}

// Helper Functions
function sendMcpRequest(request) {
    if (!authToken) {
        addResponse('Not authenticated', 'error');
        return;
    }
    
    fetch(MCP_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(request)
    }).catch(error => {
        console.error('Error sending MCP request:', error);
        addResponse(`Failed to send request: ${error.message}`, 'error');
    });
}

function addResponse(message, type = 'info') {
    const responseItem = document.createElement('div');
    responseItem.className = `response-item ${type}`;
    responseItem.textContent = message;
    
    responseContainer.appendChild(responseItem);
    responseContainer.scrollTop = responseContainer.scrollHeight;
}

function clearResponses() {
    responseContainer.innerHTML = '';
}

function generateRequestId() {
    return `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
