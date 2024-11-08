// Contents extracted from the script tag in explain.ejs
document.addEventListener('DOMContentLoaded', (event) => {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat');
    const sendButton = chatForm.querySelector('button[type="submit"]');
    const loaderElement = document.createElement('div');
    loaderElement.textContent = 'Loading...';
    loaderElement.className = 'loading-indicator';
    loaderElement.style.display = 'none';
    chatContainer.appendChild(loaderElement);

    const urlPath = window.location.pathname;
    let uuid = '';
    try {
        uuid = urlPath.substring(urlPath.lastIndexOf('/') + 1);
        console.log(`Extracted UUID from URL: ${uuid}`); // gpt_pilot_debugging_log
    } catch (error) {
        console.error('Error extracting UUID from URL:', error.message, error.stack); // gpt_pilot_debugging_log
    }

    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const question = chatInput.value.trim();

        if (question) {
            sendButton.disabled = true; // Disable the send button while waiting for a response
            const userMessage = document.createElement('div');
            userMessage.textContent = 'You: ' + question;
            userMessage.className = 'message user-question animate__animated animate__fadeInRight';
            chatContainer.appendChild(userMessage);

            loaderElement.style.display = 'block'; // Show loading spinner immediately after sending request
            chatContainer.appendChild(loaderElement); // Append the loading indicator into the chat container
            chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to the bottom of the chat
            // gpt_pilot_debugging_log

            try {
                const response = await fetch('/interact/' + uuid, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: question })
                });

                if (!response.ok) {
                    const responseError = new Error('Network response was not ok, status: ' + response.status);
                    console.error('Fetch error:', responseError.message, responseError.stack); // gpt_pilot_debugging_log
                    throw responseError;
                }

                const data = await response.json();
                const aiMessage = document.createElement('div');
                aiMessage.textContent = 'AI: ' + data.answer;
                aiMessage.className = 'message ai-answer animate__animated animate__fadeInLeft';
                chatContainer.appendChild(aiMessage);
            } catch (fetchError) {
                console.error('Fetch error:', fetchError.message, fetchError.stack); // gpt_pilot_debugging_log
                const errorElement = document.createElement('div');
                errorElement.textContent = 'AI: Sorry, something went wrong while getting a response.';
                chatContainer.appendChild(errorElement);
            } finally {
                if (loaderElement.parentNode) {
                    loaderElement.parentNode.removeChild(loaderElement); // Remove the loading indicator from the chat container
                    // gpt_pilot_debugging_log
                }
                sendButton.disabled = false; // Re-enable the send button
            }
            chatInput.value = '';
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });
});