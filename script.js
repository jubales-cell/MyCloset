// --- FIREBASE CLOUD CORE DATABASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyAM-OsC5j0DTvXaf0_izOROfV2EFZwfQtM",
    authDomain: "closet-borrow-app.firebaseapp.com",
    projectId: "closet-borrow-app",
    storageBucket: "closet-borrow-app.firebasestorage.app",
    messagingSenderId: "54680592266",
    appId: "1:54680592266:web:17434d6eda26dfc22c3273"
};

// Initialize Firebase Core Engine & Firestore Cloud Services via Compatibility Layer
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- DOM ELEMENT SELECTORS ---
const openModalBtn = document.getElementById('open-modal-btn');
const navAddBtn = document.getElementById('nav-add-btn');       
const closeModalBtn = document.getElementById('close-modal-btn');
const itemModal = document.getElementById('item-modal');
const addItemForm = document.getElementById('add-item-form');
const emptyState = document.getElementById('empty-state');
const itemsGrid = document.getElementById('items-grid');
const totalCountEl = document.getElementById('total-count');
const loanCountEl = document.getElementById('loan-count');

// File Upload Elements
const itemImageInput = document.getElementById('item-image');
const uploadText = document.getElementById('upload-text');
const imagePreviewWrapper = document.getElementById('image-preview-wrapper');
const formImgPreview = document.getElementById('form-img-preview');

// Details View & Edit Mode Elements
const detailsModal = document.getElementById('details-modal');
const detailsModalBox = detailsModal ? detailsModal.querySelector('.details-modal-box') : null;
const closeDetailsBtn = document.getElementById('close-details-btn');
const detailsName = document.getElementById('details-name');
const detailsCategory = document.getElementById('details-category');
const detailsSize = document.getElementById('details-size');
const detailsQty = document.getElementById('details-qty');
const detailsStatusBadge = document.getElementById('details-status-badge');
const borrowItemActionBtn = document.getElementById('borrow-item-action-btn');
const returnItemActionBtn = document.getElementById('return-item-action-btn');

// Interactive Edit Mode Control Form Elements
const editItemFormCtx = document.getElementById('edit-item-form-ctx');
const toggleEditModeBtn = document.getElementById('toggle-edit-mode-btn');
const saveEditModeBtn = document.getElementById('save-edit-mode-btn');
const cancelEditModeBtn = document.getElementById('cancel-edit-mode-btn');

// Inline Input Element Target Selectors
const editNameInput = document.getElementById('edit-details-name-input');
const editCategoryInput = document.getElementById('edit-details-category-input');
const editSizeInput = document.getElementById('edit-details-size-input');
const editQtyInput = document.getElementById('edit-details-qty-input');

// Global App Tracking Variables
let currentImageSrc = ""; 
let activeEditingCardId = null; 
let currentBorrowerName = sessionStorage.getItem('currentBorrowerName') || "";

// Role Authorization Flags
const isPlatformAdmin = window.location.pathname.includes('admin.html');

// --- REAL-TIME DATABASE SYNCHRONIZATION STREAM ---
db.collection("clothes").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    let closetItems = [];
    let loanCount = 0;
    
    if (!itemsGrid) return;
    itemsGrid.innerHTML = "";

    snapshot.forEach((doc) => {
        const item = doc.data();
        item.id = doc.id; 
        closetItems.push(item);
    });

    if (closetItems.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (itemsGrid) itemsGrid.style.display = 'none';
        if (totalCountEl) totalCountEl.textContent = "0";
        if (loanCountEl) loanCountEl.textContent = "0";
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (itemsGrid) itemsGrid.style.display = 'grid';

    closetItems.forEach(item => {
        if (item.status === 'Out on Loan') loanCount++;

        const itemQty = parseInt(item.qty) || 0;
        const isOutOfStock = itemQty <= 0;

        let displayVisual = item.img.startsWith('ICON:') 
            ? `<i class="fa-solid ${item.img.split(':')[1]} item-placeholder-icon"></i>`
            : `<img src="${item.img}" alt="${item.name}">`;

        let badgeText = item.status;
        let badgeClass = 'badge status-tag';
        let cardClass = 'item-card';

        if (isOutOfStock) {
            badgeText = "Out of Stock";
            badgeClass += ' out-of-stock';
            cardClass += ' card-disabled';
        } else if (item.status === 'Out on Loan') {
            badgeClass += ' loaned-out';
        }

        const cardHTML = `
            <div class="${cardClass}" data-id="${item.id}" data-name="${item.name}" data-category="${item.category}" data-size="${item.size}" data-qty="${item.qty}" data-img="${item.img}" data-status="${item.status}" data-borrowed-by="${item.borrowedBy || ''}">
                <div class="item-display">
                    ${displayVisual}
                    <span class="${badgeClass}">${badgeText}</span>
                </div>
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p>Size: ${item.size} • ${item.category}</p>
                    <div class="qty-tag">Qty: ${item.qty}</div>
                </div>
            </div>
        `;
        itemsGrid.insertAdjacentHTML('beforeend', cardHTML);
    });

    if (totalCountEl) totalCountEl.textContent = closetItems.length;
    if (loanCountEl) loanCountEl.textContent = loanCount;
});

// --- UI EVENT LISTENERS & MODAL MANAGEMENT CONTROL ---
if(openModalBtn) openModalBtn.addEventListener('click', () => itemModal.classList.add('active'));
if(navAddBtn) navAddBtn.addEventListener('click', () => itemModal.classList.add('active'));
if(closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        itemModal.classList.remove('active');
        resetImageUploadPlaceholder();
    });
}
if(closeDetailsBtn) {
    closeDetailsBtn.addEventListener('click', () => {
        detailsModal.classList.remove('active');
        if (isPlatformAdmin) disableEditModeSystem();
    });
}

if(itemImageInput) {
    itemImageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            if(uploadText) uploadText.textContent = file.name;
            reader.addEventListener('load', function() {
                currentImageSrc = this.result;
                if(formImgPreview) formImgPreview.src = this.result;
                if(imagePreviewWrapper) imagePreviewWrapper.style.display = 'block'; 
            });
            reader.readAsDataURL(file);
        }
    });
}

function resetImageUploadPlaceholder() {
    if(uploadText) uploadText.textContent = "Click to upload an item image";
    if(imagePreviewWrapper) imagePreviewWrapper.style.display = 'none';
    if(formImgPreview) formImgPreview.src = "";
    currentImageSrc = "";
}

// --- WRITE NEW ENTRIES DIRECTLY TO THE CLOUD ---
if(addItemForm) {
    addItemForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('item-name').value;
        const category = document.getElementById('item-category').value;
        const size = document.getElementById('item-size').value;
        const qty = document.getElementById('item-qty').value;

        let iconClass = 'fa-shirt';
        if (category === 'Accessories') iconClass = 'fa-clock';
        if (category === 'Shoes') iconClass = 'fa-shoe-prints';

        const trackingImage = currentImageSrc ? currentImageSrc : `ICON:${iconClass}`;

        db.collection("clothes").add({
            name: name,
            category: category,
            size: size,
            qty: qty,
            img: trackingImage,
            status: "Available",
            borrowedBy: "",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            addItemForm.reset();
            resetImageUploadPlaceholder();
            itemModal.classList.remove('active');
        })
        .catch(err => console.error("Cloud database entry execution failed: ", err));
    });
}

// Dynamic Click Handler to Pop Open Detail Information Modals
if(itemsGrid) {
    itemsGrid.addEventListener('click', (e) => {
        const targetCard = e.target.closest('.item-card');
        if (!targetCard || !detailsModal) return;

        activeEditingCardId = targetCard.getAttribute('data-id'); 
        
        const name = targetCard.getAttribute('data-name');
        const category = targetCard.getAttribute('data-category');
        const size = targetCard.getAttribute('data-size');
        const qty = parseInt(targetCard.getAttribute('data-qty')) || 0;
        const imgSrc = targetCard.getAttribute('data-img');
        let status = targetCard.getAttribute('data-status') || "Available";
        const borrower = targetCard.getAttribute('data-borrowed-by') || "";

        if (qty <= 0) {
            status = "Out of Stock";
        }

        if(detailsName) detailsName.textContent = name;
        if(detailsCategory) detailsCategory.textContent = category;
        if(detailsSize) detailsSize.textContent = size;
        if(detailsQty) detailsQty.textContent = qty;

        if (detailsStatusBadge) {
            detailsStatusBadge.textContent = status;
            detailsStatusBadge.className = "badge detail-status-badge"; 
            
            if (status === "Out of Stock") {
                detailsStatusBadge.classList.add('out-of-stock');
                detailsStatusBadge.textContent = borrower ? `Out of Stock (With ${borrower})` : "Out of Stock";
                detailsStatusBadge.style.background = '#374151';
                detailsStatusBadge.style.color = '#ffffff';
            } else if (status === "Out on Loan") {
                detailsStatusBadge.classList.add('loaned-out');
                detailsStatusBadge.textContent = `Borrowed by ${borrower}`;
                detailsStatusBadge.style.background = '#ffbc00';
                detailsStatusBadge.style.color = '#ffffff';
            } else {
                detailsStatusBadge.style.background = '#ffffff';
                detailsStatusBadge.style.color = '#1a1a1a';
            }
        }

        // --- BORROW BUTTON SYSTEM CONTROLLER ---
        if (borrowItemActionBtn) {
            if (status === "Out of Stock") {
                borrowItemActionBtn.disabled = true;
                borrowItemActionBtn.style.background = "#222";
                borrowItemActionBtn.style.cursor = "not-allowed";
                borrowItemActionBtn.innerHTML = `<i class="fa-solid fa-boxes-empty"></i> Out of Stock`;
                borrowItemActionBtn.style.display = "block";
            } else if (status === "Out on Loan") {
                borrowItemActionBtn.style.display = "none";
            } else {
                borrowItemActionBtn.disabled = false;
                borrowItemActionBtn.style.background = "#ff7a59";
                borrowItemActionBtn.style.cursor = "pointer";
                borrowItemActionBtn.innerHTML = `<i class="fa-solid fa-hand-holding-hand"></i> Borrow This Item`;
                borrowItemActionBtn.style.display = "block";
            }
        }

        // --- RECOGNITION IDENTITY ROUTER FOR RETURN BUTTON ---
        if (returnItemActionBtn) {
            const cleanUserSessionName = currentBorrowerName.trim().toLowerCase();
            const cleanDatabaseBorrowerName = borrower.trim().toLowerCase();

            // Item must be unavailable, and current browser name must match who took it!
            if ((status === "Out on Loan" || status === "Out of Stock") && cleanUserSessionName === cleanDatabaseBorrowerName) {
                returnItemActionBtn.style.display = "block";
                returnItemActionBtn.style.background = "#4B5563"; 
                returnItemActionBtn.style.color = "#ffffff";
                returnItemActionBtn.style.cursor = "pointer";
            } else {
                // Hides return functionality entirely if names don't align
                returnItemActionBtn.style.display = "none";
            }
        }

        const imageWindow = detailsModal.querySelector('.details-image-window');
        if (imageWindow && imgSrc) {
            if (imgSrc.startsWith('ICON:')) {
                const iconClass = imgSrc.split(':')[1];
                imageWindow.innerHTML = `<i class="fa-solid ${iconClass}" style="font-size: 8rem; color: #ff7a59;"></i>`;
                imageWindow.style.display = 'flex';
                imageWindow.style.justifyContent = 'center';
                imageWindow.style.alignItems = 'center';
            } else {
                imageWindow.style.display = 'block'; 
                imageWindow.innerHTML = `<img id="details-img" src="${imgSrc}" alt="Item Image" style="width:100%; height:100%; object-fit:cover; border-radius: 8px;">`;
            }
        }

        detailsModal.classList.add('active');
    });
}

// --- CLOUD TRANSACTION ACTION: BORROW OPERATION ---
if (borrowItemActionBtn) {
    borrowItemActionBtn.addEventListener('click', () => {
        if (!currentBorrowerName) {
            alert("Identity verification required. Access session broken.");
            return;
        }

        const userConfirm = confirm(`Confirm reservation transaction sequence request?`);
        if (!userConfirm) return;

        const targetCard = document.querySelector(`.item-card[data-id="${activeEditingCardId}"]`);
        if (!targetCard) return;

        const currentQty = parseInt(targetCard.getAttribute('data-qty')) || 0;

        if (currentQty <= 0) {
            alert("This item is currently out of stock!");
            return;
        }

        const calculatedQty = currentQty - 1;

        db.collection("clothes").doc(activeEditingCardId).update({
            status: 'Out on Loan',
            borrowedBy: currentBorrowerName,
            qty: calculatedQty
        })
        .then(() => {
            detailsModal.classList.remove('active');
            alert(`Enjoy your item loan!`);
        })
        .catch(err => console.error("Cloud mutation fault tracking: ", err));
    });
}

// --- CLOUD TRANSACTION ACTION: RETURN OPERATION ---
if (returnItemActionBtn) {
    returnItemActionBtn.addEventListener('click', () => {
        const userConfirm = confirm(`Are you sure you want to return this item to the closet?`);
        if (!userConfirm) return;

        const targetCard = document.querySelector(`.item-card[data-id="${activeEditingCardId}"]`);
        if (!targetCard) return;

        const currentQty = parseInt(targetCard.getAttribute('data-qty')) || 0;
        const calculatedQty = currentQty + 1;

        db.collection("clothes").doc(activeEditingCardId).update({
            status: 'Available',
            borrowedBy: "", 
            qty: calculatedQty
        })
        .then(() => {
            detailsModal.classList.remove('active');
            alert(`Item successfully returned to the closet! Thank you!`);
        })
        .catch(err => console.error("Cloud item restitution sequence processing failure: ", err));
    });
}

// --- CLOUD TRANSACTION ACTION: ADMIN EDIT MODIFICATIONS MODULES ---
if(toggleEditModeBtn && isPlatformAdmin) {
    toggleEditModeBtn.addEventListener('click', () => {
        if(editNameInput) editNameInput.value = detailsName.textContent;
        if(editCategoryInput) editCategoryInput.value = detailsCategory.textContent;
        if(editSizeInput) editSizeInput.value = detailsSize.textContent;
        if(editQtyInput) editQtyInput.value = detailsQty.textContent;

        if(detailsName) detailsName.style.display = 'none';
        if(detailsCategory) detailsCategory.style.display = 'none';
        if(detailsSize) detailsSize.style.display = 'none';
        if(detailsQty) detailsQty.style.display = 'none';

        if(editNameInput) editNameInput.style.display = 'block';
        if(editCategoryInput) editCategoryInput.style.display = 'block';
        if(editSizeInput) editSizeInput.style.display = 'block';
        if(editQtyInput) editQtyInput.style.display = 'block';

        if(toggleEditModeBtn) toggleEditModeBtn.style.display = 'none';
        if(saveEditModeBtn) saveEditModeBtn.style.display = 'inline-flex';
        if(cancelEditModeBtn) cancelEditModeBtn.style.display = 'inline-flex';
        
        if(detailsModalBox) detailsModalBox.classList.add('is-editing');
    });
}

if(cancelEditModeBtn) cancelEditModeBtn.addEventListener('click', disableEditModeSystem);

function disableEditModeSystem() {
    if(!detailsModalBox) return;
    if(editNameInput) editNameInput.style.display = 'none';
    if(editCategoryInput) editCategoryInput.style.display = 'none';
    if(editSizeInput) editSizeInput.style.display = 'none';
    if(editQtyInput) editQtyInput.style.display = 'none';

    if(detailsName) detailsName.style.display = 'block';
    if(detailsCategory) detailsCategory.style.display = 'block';
    if(detailsSize) detailsSize.style.display = 'block';
    if(detailsQty) detailsQty.style.display = 'block';

    if(toggleEditModeBtn) toggleEditModeBtn.style.display = 'inline-flex';
    if(saveEditModeBtn) saveEditModeBtn.style.display = 'none';
    if(cancelEditModeBtn) cancelEditModeBtn.style.display = 'none';
    detailsModalBox.classList.remove('is-editing');
}

if(editItemFormCtx && isPlatformAdmin) {
    editItemFormCtx.addEventListener('submit', (e) => {
        e.preventDefault();

        const updatedCategory = editCategoryInput.value;
        let iconClass = 'fa-shirt';
        if (updatedCategory === 'Accessories') iconClass = 'fa-clock';
        if (updatedCategory === 'Shoes') iconClass = 'fa-shoe-prints';

        const updateData = {
            name: editNameInput.value,
            category: updatedCategory,
            size: editSizeInput.value,
            qty: editQtyInput.value
        };

        const targetCard = document.querySelector(`.item-card[data-id="${activeEditingCardId}"]`);
        if (targetCard) {
            const currentImgAttr = targetCard.getAttribute('data-img');
            if (currentImgAttr && currentImgAttr.startsWith('ICON:')) {
                updateData.img = `ICON:${iconClass}`;
            }
        }

        db.collection("clothes").doc(activeEditingCardId).update(updateData)
        .then(() => {
            disableEditModeSystem();
            if(detailsModal) detailsModal.classList.remove('active');
        })
        .catch(err => console.error("Cloud document sync alteration failure: ", err));
    });
}

// --- VISITOR ACCESS AUTHENTICATION OVERLAY ENGINE ---
document.addEventListener("DOMContentLoaded", () => {
    const nameOverlay = document.getElementById("nameOverlay");
    const enterClosetBtn = document.getElementById("enterClosetBtn");
    const friendNameInput = document.getElementById("friendNameInput");

    if (nameOverlay && currentBorrowerName) {
        nameOverlay.style.display = "none";
    }

    if (enterClosetBtn && nameOverlay) {
        enterClosetBtn.addEventListener("click", () => {
            const trimmedName = friendNameInput.value.trim();
            if (trimmedName === "") {
                alert("Please enter your Full Name to view the closet!");
                return;
            }
            currentBorrowerName = trimmedName;
            sessionStorage.setItem('currentBorrowerName', currentBorrowerName);
            nameOverlay.style.opacity = "0";
            setTimeout(() => { nameOverlay.style.display = "none"; }, 300);
        });
    }
});