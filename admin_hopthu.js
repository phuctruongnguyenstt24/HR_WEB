document.addEventListener('DOMContentLoaded', function() {
    loadConversations();
    
    // Xử lý gửi tin nhắn trả lời
    document.getElementById('reply-message-form').addEventListener('submit', function(e) {
        e.preventDefault();
        sendReply();
    });
    
    // Xử lý đóng hội thoại
    document.getElementById('btn-close-conversation').addEventListener('click', function() {
        closeConversation();
    });
});

function loadConversations() {
    fetch('admin_get_conversations.php')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('conversation-list');
            
            if (data.success && data.conversations.length > 0) {
                container.innerHTML = '';
                
                data.conversations.forEach(conv => {
                    const unreadCount = conv.unread_count > 0 ? 
                        `<span class="unread-badge">${conv.unread_count}</span>` : '';
                    
                    const statusBadge = conv.status === 'mở' ? 
                        `<span class="status-badge">Mở</span>` : 
                        `<span class="status-badge closed">Đã đóng</span>`;
                    
                    const item = document.createElement('div');
                    item.className = 'conversation-item';
                    item.innerHTML = `
                        <div class="conversation-info">
                            <h4>${conv.subject} ${statusBadge}</h4>
                            <div class="employee-info">
                                ${conv.employee_name} - ${conv.employee_position}
                            </div>
                            <div class="conversation-meta">
                                ${conv.last_message_time}
                            </div>
                        </div>
                        ${unreadCount}
                    `;
                    
                    item.addEventListener('click', () => {
                        if (conv.status === 'mở') {
                            loadMessages(conv.id, conv.subject);
                        } else {
                            Swal.fire({
                                icon: 'info',
                                title: 'Hội thoại đã đóng',
                                text: 'Hội thoại này đã được đóng và không thể trả lời.'
                            });
                        }
                    });
                    container.appendChild(item);
                });
            } else {
                container.innerHTML = '<p style="padding: 20px; text-align: center;">Chưa có tin nhắn nào từ nhân viên.</p>';
            }
        })
        .catch(error => {
            console.error('Error loading conversations:', error);
        });
}

function loadMessages(conversationId, subject) {
    fetch(`admin_get_messages.php?conversation_id=${conversationId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('conversation-subject').textContent = subject;
                document.getElementById('current-conversation-id').value = conversationId;
                
                const messageList = document.getElementById('message-list');
                messageList.innerHTML = '';
                
                data.messages.forEach(msg => {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${msg.sender_type}`;
                    
                    const senderName = msg.sender_type === 'employee' ? 
                        `${msg.employee_name} (Nhân viên)` : 'Quản trị viên';
                    
                    messageDiv.innerHTML = `
                        <div class="message-header">
                            <span>${senderName}</span>
                            <span class="message-time">${msg.sent_date}</span>
                        </div>
                        <div class="message-content">${msg.message}</div>
                    `;
                    
                    messageList.appendChild(messageDiv);
                });
                
                // Hiển thị container tin nhắn
                document.getElementById('message-container').style.display = 'block';
                document.getElementById('reply-form').classList.add('active');
                
                // Cuộn xuống tin nhắn mới nhất
                messageList.scrollTop = messageList.scrollHeight;
                
                // Đánh dấu đã đọc
                markAsRead(conversationId);
            }
        });
}

function sendReply() {
    const conversationId = document.getElementById('current-conversation-id').value;
    const message = document.getElementById('reply-message').value;
    
    if (!message.trim()) return;
    
    const formData = new FormData();
    formData.append('conversation_id', conversationId);
    formData.append('message', message);
    
    fetch('admin_send_reply.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('reply-message').value = '';
            loadMessages(conversationId, document.getElementById('conversation-subject').textContent);
            loadConversations(); // Refresh danh sách
            
            Swal.fire({
                icon: 'success',
                title: 'Đã gửi!',
                text: 'Tin nhắn đã được gửi đến nhân viên',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi!',
                text: 'Lỗi khi gửi tin nhắn: ' + data.message
            });
        }
    })
    .catch(error => {
        console.error('Error sending reply:', error);
        Swal.fire({
            icon: 'error',
            title: 'Lỗi!',
            text: 'Có lỗi xảy ra khi gửi tin nhắn'
        });
    });
}

function closeConversation() {
    const conversationId = document.getElementById('current-conversation-id').value;
    
    Swal.fire({
        title: 'Đóng hội thoại?',
        text: "Bạn có chắc muốn đóng hội thoại này? Nhân viên sẽ không thể trả lời thêm.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Đóng hội thoại',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('admin_close_conversation.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `conversation_id=${conversationId}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Đã đóng!',
                        text: 'Hội thoại đã được đóng'
                    });
                    loadConversations();
                    document.getElementById('message-container').style.display = 'none';
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Lỗi!',
                        text: data.message
                    });
                }
            });
        }
    });
}

function markAsRead(conversationId) {
    fetch('admin_mark_as_read.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `conversation_id=${conversationId}`
    });
}