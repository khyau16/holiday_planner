function openSidebar() {
    document.getElementById("sidebar").classList.add("sidebar-open");
}

function closeSidebar() {
    document.getElementById("sidebar").classList.remove("sidebar-open");
}

let isSidebarOpen = false;

const toggleSidebar = () => {
    if(isSidebarOpen) {
        closeSidebar();
    }else{
        openSidebar();
    }
    isSidebarOpen = !isSidebarOpen;
}

// Open Modal
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

// Close Modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside of the modal content
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Check if the error query parameter is present
const errorType = getQueryParam('error');

if (errorType === 'login') {
    // Open the login modal if the error parameter is 'login'
    document.getElementById('loginModal').style.display = 'flex';
} else if (errorType === 'signup') {
    // Open the signup modal if the error parameter is 'signup'
    document.getElementById('signupModal').style.display = 'flex';
}
