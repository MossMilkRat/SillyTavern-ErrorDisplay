// index.js
import { saveSettingsDebounced } from "../../../script.js";
import { extension_settings } from "../../extensions.js";
import { eventSource, event_types } from "../../../script.js";

const MODULE_NAME = 'error-display';
const UPDATE_INTERVAL = 1000;

let errorLog = [];
let maxErrors = 50; // Keep last 50 errors

const defaultSettings = {
    enabled: true,
    showToast: true,
    autoExpand: false,
    maxErrors: 50,
    logTypes: {
        api: true,
        generation: true,
        system: true,
    }
};

// Load settings
function loadSettings() {
    if (!extension_settings[MODULE_NAME]) {
        extension_settings[MODULE_NAME] = defaultSettings;
    }
    maxErrors = extension_settings[MODULE_NAME].maxErrors;
    
    // Update UI to reflect settings
    $('#error_display_enabled').prop('checked', extension_settings[MODULE_NAME].enabled);
    $('#error_display_toast').prop('checked', extension_settings[MODULE_NAME].showToast);
    $('#error_display_auto_expand').prop('checked', extension_settings[MODULE_NAME].autoExpand);
    $('#error_display_max_errors').val(extension_settings[MODULE_NAME].maxErrors);
    $('#error_log_api').prop('checked', extension_settings[MODULE_NAME].logTypes.api);
    $('#error_log_generation').prop('checked', extension_settings[MODULE_NAME].logTypes.generation);
    $('#error_log_system').prop('checked', extension_settings[MODULE_NAME].logTypes.system);
}

// Save settings
function saveSettings() {
    extension_settings[MODULE_NAME].enabled = $('#error_display_enabled').prop('checked');
    extension_settings[MODULE_NAME].showToast = $('#error_display_toast').prop('checked');
    extension_settings[MODULE_NAME].autoExpand = $('#error_display_auto_expand').prop('checked');
    extension_settings[MODULE_NAME].maxErrors = parseInt($('#error_display_max_errors').val());
    extension_settings[MODULE_NAME].logTypes.api = $('#error_log_api').prop('checked');
    extension_settings[MODULE_NAME].logTypes.generation = $('#error_log_generation').prop('checked');
    extension_settings[MODULE_NAME].logTypes.system = $('#error_log_system').prop('checked');
    
    maxErrors = extension_settings[MODULE_NAME].maxErrors;
    saveSettingsDebounced();
}

// Add error to log
function addError(errorData) {
    if (!extension_settings[MODULE_NAME].enabled) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const error = {
        timestamp: timestamp,
        type: errorData.type || 'unknown',
        message: errorData.message || 'Unknown error',
        details: errorData.details || '',
        stack: errorData.stack || '',
        id: Date.now()
    };
    
    // Check if this error type should be logged
    if (error.type === 'api' && !extension_settings[MODULE_NAME].logTypes.api) return;
    if (error.type === 'generation' && !extension_settings[MODULE_NAME].logTypes.generation) return;
    if (error.type === 'system' && !extension_settings[MODULE_NAME].logTypes.system) return;
    
    errorLog.unshift(error);
    
    // Trim log to max size
    if (errorLog.length > maxErrors) {
        errorLog = errorLog.slice(0, maxErrors);
    }
    
    updateErrorDisplay();
    
    // Show toast if enabled
    if (extension_settings[MODULE_NAME].showToast) {
        toastr.error(`${error.message}`, 'Error Occurred', { timeOut: 5000 });
    }
    
    // Auto-expand if enabled
    if (extension_settings[MODULE_NAME].autoExpand && $('#error_display_panel').hasClass('collapsed')) {
        toggleErrorPanel();
    }
}

// Update the error display UI
function updateErrorDisplay() {
    const container = $('#error_display_log');
    container.empty();
    
    if (errorLog.length === 0) {
        container.append('<div class="error_display_empty">No errors logged</div>');
        $('#error_display_count').text('0');
        return;
    }
    
    $('#error_display_count').text(errorLog.length);
    
    errorLog.forEach(error => {
        const errorDiv = $(`
            <div class="error_display_item" data-error-id="${error.id}">
                <div class="error_display_header">
                    <span class="error_display_type error_type_${error.type}">${error.type.toUpperCase()}</span>
                    <span class="error_display_timestamp">${error.timestamp}</span>
                </div>
                <div class="error_display_message">${escapeHtml(error.message)}</div>
                ${error.details ? `<div class="error_display_details">${escapeHtml(error.details)}</div>` : ''}
                ${error.stack ? `<details class="error_display_stack"><summary>Stack Trace</summary><pre>${escapeHtml(error.stack)}</pre></details>` : ''}
            </div>
        `);
        container.append(errorDiv);
    });
}

// Toggle error panel visibility
function toggleErrorPanel() {
    $('#error_display_panel').toggleClass('collapsed');
    const isCollapsed = $('#error_display_panel').hasClass('collapsed');
    $('#error_display_toggle_icon').text(isCollapsed ? '▲' : '▼');
}

// Clear error log
function clearErrors() {
    errorLog = [];
    updateErrorDisplay();
    toastr.info('Error log cleared');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Hook into console.error to catch errors
function interceptErrors() {
    const originalError = console.error;
    console.error = function(...args) {
        // Call original console.error
        originalError.apply(console, args);
        
        // Log to our extension
        const errorMessage = args.map(arg => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return String(arg);
        }).join(' ');
        
        addError({
            type: 'system',
            message: errorMessage,
            stack: new Error().stack
        });
    };
}

// Hook into fetch to catch API errors
function interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch.apply(this, args);
            
            // Check for HTTP errors
            if (!response.ok) {
                const url = typeof args[0] === 'string' ? args[0] : args[0].url;
                let errorDetails = '';
                
                try {
                    const clonedResponse = response.clone();
                    const text = await clonedResponse.text();
                    errorDetails = text;
                } catch (e) {
                    errorDetails = 'Could not read response body';
                }
                
                addError({
                    type: 'api',
                    message: `HTTP ${response.status}: ${response.statusText}`,
                    details: `URL: ${url}\n\nResponse: ${errorDetails}`
                });
            }
            
            return response;
        } catch (error) {
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            addError({
                type: 'api',
                message: `Fetch failed: ${error.message}`,
                details: `URL: ${url}`,
                stack: error.stack
            });
            throw error;
        }
    };
}

// Setup UI
function setupUI() {
    const settingsHtml = `
        <div id="error_display_settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Error Display</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <label class="checkbox_label">
                        <input id="error_display_enabled" type="checkbox" />
                        <span>Enable Error Display</span>
                    </label>
                    <label class="checkbox_label">
                        <input id="error_display_toast" type="checkbox" />
                        <span>Show Toast Notifications</span>
                    </label>
                    <label class="checkbox_label">
                        <input id="error_display_auto_expand" type="checkbox" />
                        <span>Auto-Expand Panel on Error</span>
                    </label>
                    <label for="error_display_max_errors">
                        <small>Maximum Errors to Keep</small>
                    </label>
                    <input id="error_display_max_errors" class="text_pole" type="number" min="10" max="500" />
                    
                    <div class="error_display_types">
                        <h4>Error Types to Log</h4>
                        <label class="checkbox_label">
                            <input id="error_log_api" type="checkbox" />
                            <span>API Errors</span>
                        </label>
                        <label class="checkbox_label">
                            <input id="error_log_generation" type="checkbox" />
                            <span>Generation Errors</span>
                        </label>
                        <label class="checkbox_label">
                            <input id="error_log_system" type="checkbox" />
                            <span>System Errors</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#extensions_settings2').append(settingsHtml);
    
    // Add the error display panel to the main UI
    const panelHtml = `
        <div id="error_display_panel" class="collapsed">
            <div id="error_display_header">
                <div id="error_display_title">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>Error Log (<span id="error_display_count">0</span>)</span>
                </div>
                <div id="error_display_controls">
                    <button id="error_display_clear" class="menu_button" title="Clear Errors">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                    <button id="error_display_toggle" class="menu_button" title="Toggle Panel">
                        <span id="error_display_toggle_icon">▲</span>
                    </button>
                </div>
            </div>
            <div id="error_display_log"></div>
        </div>
    `;
    
    $('#chat').append(panelHtml);
    
    // Event listeners
    $('#error_display_enabled').on('change', saveSettings);
    $('#error_display_toast').on('change', saveSettings);
    $('#error_display_auto_expand').on('change', saveSettings);
    $('#error_display_max_errors').on('change', saveSettings);
    $('#error_log_api').on('change', saveSettings);
    $('#error_log_generation').on('change', saveSettings);
    $('#error_log_system').on('change', saveSettings);
    
    $('#error_display_toggle').on('click', toggleErrorPanel);
    $('#error_display_clear').on('click', clearErrors);
}

// Initialize extension
jQuery(async () => {
    setupUI();
    loadSettings();
    interceptErrors();
    interceptFetch();
    
    // Listen for generation errors
    eventSource.on(event_types.GENERATION_FAILED, (data) => {
        addError({
            type: 'generation',
            message: 'Message generation failed',
            details: data?.error || 'No additional details available'
        });
    });
    
    console.log('Error Display extension loaded');
});
