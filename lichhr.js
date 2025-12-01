document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const calendarEl = document.getElementById('calendar');
    const eventModal = document.getElementById('event-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const addEventBtn = document.getElementById('add-event-btn');
    const saveEventBtn = document.getElementById('save-event-btn');
    const deleteEventBtn = document.getElementById('delete-event-btn');
    const cancelEventBtn = document.getElementById('cancel-event-btn');
    const eventTitleInput = document.getElementById('event-title');
    const eventDateInput = document.getElementById('event-date');
    const eventTimeInput = document.getElementById('event-time');
    const eventTypeSelect = document.getElementById('event-type');
    const eventDescriptionInput = document.getElementById('event-description');
    const modalTitle = document.getElementById('modal-title');
    const eventFilter = document.getElementById('event-filter');

    let currentEventId = null;

    // --- Modal Functions ---
    const showModal = (title, eventData = {}) => {
        modalTitle.textContent = title;
        eventTitleInput.value = eventData.title || '';
        eventDateInput.value = eventData.date || '';
        eventTimeInput.value = eventData.time || '';
        eventTypeSelect.value = eventData.type || 'meeting';
        eventDescriptionInput.value = eventData.description || '';
        deleteEventBtn.style.display = eventData.isEdit ? 'inline-block' : 'none';
        eventModal.style.display = 'flex';
    };

    const hideModal = () => {
        eventModal.style.display = 'none';
        currentEventId = null;
    };

    // --- Calendar Initialization ---
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'vi',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: [],
        eventClick: (info) => {
            currentEventId = info.event.id;
            const start = info.event.start;
            const eventData = {
                title: info.event.title,
                date: start.toISOString().split('T')[0],
                time: start.toTimeString().slice(0, 5),
                type: info.event.extendedProps.type,
                description: info.event.extendedProps.description || '',
                isEdit: true
            };
            showModal('Sửa sự kiện', eventData);
        },
        dateClick: (info) => {
            const eventData = {
                date: info.dateStr
            };
            showModal('Thêm sự kiện mới', eventData);
        }
    });

    calendar.render();

    // --- Event Listeners ---
    
    // Calendar event filter
    eventFilter.addEventListener('change', (e) => {
        const filterValue = e.target.value;
        calendar.getEvents().forEach(event => {
            const isVisible = filterValue === 'all' || event.extendedProps.type === filterValue;
            event.setProp('display', isVisible ? 'auto' : 'none');
        });
    });

    // Add new event button
    addEventBtn.addEventListener('click', () => {
        showModal('Thêm sự kiện mới');
    });

    // Close modal
    [closeModalBtn, cancelEventBtn].forEach(btn => {
        btn.addEventListener('click', hideModal);
    });

    // Save/Update event
    saveEventBtn.addEventListener('click', () => {
        const title = eventTitleInput.value.trim();
        const date = eventDateInput.value;
        const time = eventTimeInput.value;

        if (!title || !date) {
            alert('Vui lòng nhập tiêu đề và ngày sự kiện!');
            return;
        }

        const eventDateTime = new Date(`${date}T${time || '00:00'}`);
        const type = eventTypeSelect.value;
        const description = eventDescriptionInput.value;

        if (currentEventId) {
            // Update existing event
            const event = calendar.getEventById(currentEventId);
            if (event) {
                event.setProp('title', title);
                event.setStart(eventDateTime);
                event.setExtendedProp('type', type);
                event.setExtendedProp('description', description);
            }
        } else {
            // Add new event
            calendar.addEvent({
                id: Date.now().toString(),
                title,
                start: eventDateTime,
                classNames: [type],
                extendedProps: { type, description }
            });
        }
        hideModal();
    });

    // Delete event
    deleteEventBtn.addEventListener('click', () => {
        if (currentEventId) {
            const event = calendar.getEventById(currentEventId);
            if (event) {
                event.remove();
            }
        }
        hideModal();
    });
});