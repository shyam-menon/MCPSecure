// Configuration
const API_BASE_URL = 'http://localhost:5000'; // Actual running server URL
const AUTH_ENDPOINT = `${API_BASE_URL}/api/auth/login`;
const MCP_SSE_ENDPOINT = `${API_BASE_URL}/sse`; // SSE endpoint path for MCP
let messageEndpoint = null; // Will be set dynamically from SSE response

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
    const url = `${MCP_SSE_ENDPOINT}?access_token=${encodeURIComponent(authToken)}`;
    
    try {
        eventSource = new EventSource(url);
        
        eventSource.onopen = () => {
            connectionStatus.textContent = 'Connected to MCP server';
            connectionStatus.className = 'alert alert-success mt-3';
        };
        
        eventSource.onerror = (error) => {
            connectionStatus.textContent = 'Error connecting to MCP server';
            connectionStatus.className = 'alert alert-danger mt-3';
            console.error('EventSource error:', error);
            eventSource.close();
        };
        
        // Listen for endpoint event to get the message endpoint URL
        eventSource.addEventListener('endpoint', (event) => {
            messageEndpoint = `${API_BASE_URL}${event.data}`;
            console.log('Message endpoint received:', messageEndpoint);
            addResponse(`Message endpoint established: ${messageEndpoint}`, 'info');
            fetchMcpTools();
        });
        
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
        const data = JSON.parse(event.data);
        console.log('Received MCP message:', data);
        
        // Check if this is a valid JSON-RPC response
        if (data.jsonrpc === '2.0') {
            if (data.error) {
                // This is an error response
                addResponse(`Server error: ${data.error.message} (code: ${data.error.code})`, 'error');
                return;
            }
            
            if (data.id && data.result !== undefined) {
                // This is a successful response to a specific request
                const requestId = data.id;
                
                // Check what kind of request this was based on the stored request ID
                if (requestId.includes('tools-list')) {
                    handleToolsList(data.result);
                } else if (requestId.includes('tools-call')) {
                    handleToolCallResult(data.result);
                } else {
                    addResponse(`Received response for request ${requestId}`, 'info');
                    console.log(`Response for ${requestId}:`, data.result);
                }
            }
        } else {
            // This might be a server notification or other message
            addResponse(`Received server message: ${event.data}`, 'info');
        }
    } catch (error) {
        console.error('Error parsing MCP message:', error, event.data);
        addResponse(`Failed to parse server message: ${error.message}`, 'error');
    }
}

// MCP Tool Functions
function fetchMcpTools() {
    sendMcpRequest({
        id: `req-${Date.now()}-tools-list`,
        method: 'tools/list'
    });
}

function handleToolsList(result) {
    console.log('Processing tools list:', result);
    
    // Check if result is an array (direct tools array)
    if (Array.isArray(result)) {
        currentTools = result;
    } 
    // Check if result has a tools property (nested tools array)
    else if (result && Array.isArray(result.tools)) {
        currentTools = result.tools;
    } 
    // No valid tools found
    else {
        addResponse('No tools available or invalid format', 'error');
        console.error('Invalid tools format:', result);
        return;
    }
    
    addResponse(`Found ${currentTools.length} tools`, 'info');
    renderToolsList();
}

function renderToolsList() {
    toolsContainer.innerHTML = '';
    
    if (!currentTools || currentTools.length === 0) {
        toolsContainer.innerHTML = '<div class="alert alert-info">No tools available</div>';
        return;
    }
    
    console.log('Rendering tools:', currentTools);
    
    currentTools.forEach(tool => {
        // Extract tool properties based on the format we're seeing in the console
        // Format appears to be: {0: {name: 'BasicTool', description: '...', inputSchema: {...}}, ...}
        const name = tool.name;
        const description = tool.description || 'No description available';
        
        const toolCard = document.createElement('div');
        toolCard.className = 'col-md-4 mb-3';
        toolCard.innerHTML = `
            <div class="card tool-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${name}</h5>
                    <p class="card-text">${description}</p>
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
    
    console.log('Rendering parameters for tool:', tool);
    
    // Check if the tool has an inputSchema property
    if (!tool.inputSchema) {
        toolParametersContainer.innerHTML = '<p>This tool does not require any parameters.</p>';
        return;
    }
    
    // Handle the inputSchema format we're seeing in the console
    // It appears to be an object with properties
    const inputSchema = tool.inputSchema;
    
    // If inputSchema is empty or has no properties
    if (!inputSchema || typeof inputSchema !== 'object' || Object.keys(inputSchema).length === 0) {
        toolParametersContainer.innerHTML = '<p>This tool does not require any parameters.</p>';
        return;
    }
    
    // If inputSchema has properties
    if (inputSchema.properties) {
        const properties = inputSchema.properties;
        const required = inputSchema.required || [];
        
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
    } else {
        // If inputSchema doesn't have properties but is an object itself
        toolParametersContainer.innerHTML = '<p>This tool has parameters but the schema format is not supported.</p>';
        console.warn('Unsupported inputSchema format:', inputSchema);
    }
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
        id: `req-${Date.now()}-tools-call`,
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
    
    if (!messageEndpoint) {
        addResponse('No message endpoint available. Wait for the SSE connection to establish first.', 'error');
        return;
    }
    
    // Add the required jsonrpc version field
    const jsonRpcRequest = {
        ...request,
        jsonrpc: '2.0'
    };
    
    fetch(messageEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(jsonRpcRequest)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // Check the content type to determine how to parse the response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        } else {
            // For non-JSON responses, just get the text
            return response.text().then(text => {
                console.log('Non-JSON response:', text);
                // If the response is just 'Accepted', consider it a success
                if (text === 'Accepted') {
                    addResponse(`Request ${jsonRpcRequest.id} accepted by server`, 'info');
                    return { success: true, text };
                }
                return { success: false, text };
            });
        }
    })
    .then(data => {
        console.log('MCP request response:', data);
    })
    .catch(error => {
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
