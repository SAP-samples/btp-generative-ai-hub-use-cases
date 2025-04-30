const chatbotButton = document.getElementById('chatbotButton');
const chatbotUI = document.getElementById('chatbotUI');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const messages = document.querySelector('.chatbot-messages');

chatbotButton.addEventListener('click', () => {
    chatbotUI.style.display = chatbotUI.style.display === 'block' ? 'none' : 'block';
    chatbotUI.style.height = '90%';
    const xxx = document.getElementById('container-chat---App--page-cont');
    xxx.style.height = '70%';
    const yyy = document.getElementById('container-chat---App--app');
    yyy.style.borderRadius = '20px';
    chatbotButton.textContent = chatbotButton.textContent === '🤖' ? '✖️' : '🤖';

    if (chatbotButton.textContent == '🤖') {
        // chatbotButton.classList.toggle('animate');
        chatbotButton.style.animation = 'bounce 1s infinite';
        chatbotButton.style.backgroundColor = '#007bff';
    } else {
        chatbotButton.style.animation = 'none';
        chatbotButton.style.backgroundColor = '#FFFFFF';
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        // Hide chat UI element
        chatbotUI.style.display = 'none';
    }
});

const closeButton = document.querySelector('.close-button');
closeButton.addEventListener('click', () => {
    chatbotUI.style.display = 'none';
});

sendButton.addEventListener('click', () => {
    const userMessage = chatInput.value;
    // Add user message to the chat
    const userMessageDiv = document.createElement('div');
    userMessageDiv.classList.add('user-message');
    userMessageDiv.textContent = userMessage;
    messages.appendChild(userMessageDiv);

    // Simulate bot response (replace with actual bot logic)
    setTimeout(() => {
        const botMessage = 'Hello! How can I help you today?';
        const botMessageDiv = document.createElement('div');
        botMessageDiv.classList.add('bot-message');
        botMessageDiv.textContent = botMessage;
        messages.appendChild(botMessageDiv);
        chatInput.value = '';
    }, 1000);
});