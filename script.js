"use strict";

/* =========================================
   MADRAZO FAMILY — OFFICIAL STORE
   STORE LOGIC
========================================= */

/*
    PRICES
    Cocaine = 600$
    Meth = 600$
*/

const PRODUCTS = {
    cocaine: {
        name: "Cocaine",
        price: 600
    },

    meth: {
        name: "Meth",
        price: 600
    }
};

const MAX_QUANTITY = 1000;

/* =========================================
   ELEMENTS
========================================= */

const pages = {
    welcome: document.getElementById("welcomePage"),
    products: document.getElementById("productsPage"),
    summary: document.getElementById("summaryPage"),
    confirm: document.getElementById("confirmPage")
};

const enterStoreBtn = document.getElementById("enterStoreBtn");
const musicToggle = document.getElementById("musicToggle");
const backgroundMusic = document.getElementById("backgroundMusic");

const backToWelcomeBtn = document.getElementById("backToWelcomeBtn");
const continueToSummaryBtn = document.getElementById("continueToSummaryBtn");
const backToProductsBtn = document.getElementById("backToProductsBtn");
const continueToConfirmBtn = document.getElementById("continueToConfirmBtn");
const backToSummaryBtn = document.getElementById("backToSummaryBtn");

const selectedItemsCount = document.getElementById("selectedItemsCount");
const productsTotal = document.getElementById("productsTotal");

const summaryProducts = document.getElementById("summaryProducts");
const summarySubtotal = document.getElementById("summarySubtotal");
const summaryTotal = document.getElementById("summaryTotal");

const finalItemsCount = document.getElementById("finalItemsCount");
const finalTotal = document.getElementById("finalTotal");

const orderForm = document.getElementById("orderForm");
const submitOrderBtn = document.getElementById("submitOrderBtn");
const orderMessage = document.getElementById("orderMessage");

/* =========================================
   CART
========================================= */

const cart = {
    cocaine: 0,
    meth: 0
};

/* =========================================
   HELPERS
========================================= */

function formatPrice(amount) {
    return new Intl.NumberFormat("en-US").format(amount) + "$";
}

function getQuantity(productId) {
    return cart[productId] || 0;
}

function getTotalItems() {
    return Object.values(cart).reduce((sum, quantity) => {
        return sum + quantity;
    }, 0);
}

function getSubtotal() {
    let total = 0;

    for (const [productId, quantity] of Object.entries(cart)) {
        const product = PRODUCTS[productId];

        if (product.price !== null) {
            total += product.price * quantity;
        }
    }

    return total;
}

function hasUnpricedItems() {
    return Object.entries(cart).some(([productId, quantity]) => {
        return quantity > 0 && PRODUCTS[productId].price === null;
    });
}

function getPricedItemsTotal() {
    return getSubtotal();
}

function getOrderDetails() {
    return Object.entries(cart)
        .filter(([productId, quantity]) => quantity > 0)
        .map(([productId, quantity]) => {
            const product = PRODUCTS[productId];

            return {
                id: productId,
                name: product.name,
                quantity,
                unitPrice: product.price,
                subtotal: product.price === null
                    ? null
                    : product.price * quantity
            };
        });
}

/* =========================================
   PAGE NAVIGATION
========================================= */

function showPage(pageName) {
    Object.values(pages).forEach(page => {
        page.classList.remove("active");
    });

    pages[pageName].classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================================
   MUSIC
========================================= */

let musicStarted = false;

async function startMusic() {
    try {
        backgroundMusic.volume = 0.35;

        await backgroundMusic.play();

        musicStarted = true;
        updateMusicButton();
    } catch (error) {
        console.warn("Music could not start:", error);

        musicToggle.hidden = false;
        musicToggle.textContent = "▶ تشغيل الموسيقى";
    }
}

function updateMusicButton() {
    musicToggle.hidden = false;

    if (backgroundMusic.paused) {
        musicToggle.textContent = "▶ تشغيل الموسيقى";
    } else {
        musicToggle.textContent = "🔊 إيقاف الموسيقى";
    }
}

enterStoreBtn.addEventListener("click", async () => {
    showPage("products");

    if (!musicStarted || backgroundMusic.paused) {
        await startMusic();
    }
});

musicToggle.addEventListener("click", async () => {
    if (backgroundMusic.paused) {
        await startMusic();
    } else {
        backgroundMusic.pause();
        updateMusicButton();
    }
});

/* =========================================
   QUANTITY VALIDATION
========================================= */

function normalizeQuantity(value) {
    let quantity = Number.parseInt(value, 10);

    if (!Number.isFinite(quantity) || quantity < 0) {
        quantity = 0;
    }

    if (quantity > MAX_QUANTITY) {
        quantity = MAX_QUANTITY;
    }

    return quantity;
}

function setQuantity(productId, quantity) {
    if (!Object.prototype.hasOwnProperty.call(PRODUCTS, productId)) {
        return;
    }

    cart[productId] = normalizeQuantity(quantity);

    const input = document.querySelector(
        `.quantity-input[data-product="${productId}"]`
    );

    if (input) {
        input.value = cart[productId];
    }

    updateStore();
}

/* =========================================
   QUANTITY BUTTONS
========================================= */

document.querySelectorAll(".quantity-btn").forEach(button => {
    button.addEventListener("click", () => {
        const productId = button.dataset.product;
        const action = button.dataset.action;

        if (!Object.prototype.hasOwnProperty.call(cart, productId)) {
            return;
        }

        let quantity = getQuantity(productId);

        if (action === "increase") {
            quantity += 1;
        }

        if (action === "decrease") {
            quantity -= 1;
        }

        setQuantity(productId, quantity);
    });
});

/* =========================================
   MANUAL QUANTITY INPUT
========================================= */

document.querySelectorAll(".quantity-input").forEach(input => {
    input.addEventListener("input", () => {
        const productId = input.dataset.product;

        /*
          Allow the input to be temporarily empty
          while the customer is typing.
        */

        if (input.value === "") {
            cart[productId] = 0;
            updateStore();
            return;
        }

        setQuantity(productId, input.value);
    });

    input.addEventListener("blur", () => {
        const productId = input.dataset.product;

        setQuantity(productId, input.value);
    });
});

/* =========================================
   BUY PRODUCT BUTTONS
========================================= */

document.querySelectorAll(".buy-product-btn").forEach(button => {
    button.addEventListener("click", () => {
        const productId = button.dataset.product;
        const quantity = getQuantity(productId);

        if (quantity < 1) {
            alert("حدد كمية أكبر من 0 أولًا.");
            return;
        }

        if (PRODUCTS[productId].price === null) {
            alert(
                "سعر Meth لم يتم تحديده بعد. يمكنك اختياره لاحقًا."
            );
            return;
        }

        showPage("summary");
        renderSummary();
    });
});

/* =========================================
   UPDATE STORE
========================================= */

function updateStore() {
    for (const productId of Object.keys(PRODUCTS)) {
        const product = PRODUCTS[productId];
        const quantity = getQuantity(productId);

        const subtotalElement = document.getElementById(
            `${productId}Subtotal`
        );

        if (subtotalElement) {
            if (product.price === null && quantity > 0) {
                subtotalElement.textContent = "غير محدد";
            } else if (product.price === null) {
                subtotalElement.textContent = "غير محدد";
            } else {
                subtotalElement.textContent = formatPrice(
                    product.price * quantity
                );
            }
        }
    }

    selectedItemsCount.textContent = getTotalItems();

    if (hasUnpricedItems()) {
        productsTotal.textContent = "غير مكتمل";
    } else {
        productsTotal.textContent = formatPrice(getPricedItemsTotal());
    }

    updateFinalTotals();
}

/* =========================================
   SUMMARY PAGE
========================================= */

function renderSummary() {
    summaryProducts.replaceChildren();

    const selectedProducts = getOrderDetails();

    if (selectedProducts.length === 0) {
        const emptyMessage = document.createElement("p");

        emptyMessage.textContent = "لم تختر أي منتجات بعد.";
        emptyMessage.className = "empty-message";

        summaryProducts.appendChild(emptyMessage);
    }

    selectedProducts.forEach(item => {
        const card = document.createElement("article");
        card.className = "summary-product";

        const details = document.createElement("div");

        const title = document.createElement("h3");
        title.textContent = item.name;

        const quantity = document.createElement("p");
        quantity.textContent = `الكمية: ${item.quantity}`;

        const unitPrice = document.createElement("p");

        unitPrice.textContent = item.unitPrice === null
            ? "سعر الوحدة: غير محدد"
            : `سعر الوحدة: ${formatPrice(item.unitPrice)}`;

        details.append(title, quantity, unitPrice);

        const subtotal = document.createElement("strong");
        subtotal.className = "summary-product-price";

        subtotal.textContent = item.subtotal === null
            ? "غير محدد"
            : formatPrice(item.subtotal);

        card.append(details, subtotal);
        summaryProducts.appendChild(card);
    });

    if (hasUnpricedItems()) {
        summarySubtotal.textContent = "غير مكتمل";
        summaryTotal.textContent = "غير مكتمل";
    } else {
        summarySubtotal.textContent = formatPrice(getSubtotal());
        summaryTotal.textContent = formatPrice(getSubtotal());
    }

    updateFinalTotals();
}

/* =========================================
   FINAL TOTALS
========================================= */

function updateFinalTotals() {
    finalItemsCount.textContent = getTotalItems();

    if (hasUnpricedItems()) {
        finalTotal.textContent = "غير مكتمل";
    } else {
        finalTotal.textContent = formatPrice(getSubtotal());
    }
}

/* =========================================
   NAVIGATION BUTTONS
========================================= */

backToWelcomeBtn.addEventListener("click", () => {
    showPage("welcome");
});

continueToSummaryBtn.addEventListener("click", () => {
    if (getTotalItems() === 0) {
        alert("اختر منتجًا واحدًا على الأقل.");
        return;
    }

    if (hasUnpricedItems()) {
        alert(
            "يوجد منتج لم يُحدد سعره بعد. احذف Meth من الطلب حتى يتم تحديد سعره."
        );
        return;
    }

    renderSummary();
    showPage("summary");
});

backToProductsBtn.addEventListener("click", () => {
    showPage("products");
});

continueToConfirmBtn.addEventListener("click", () => {
    if (getTotalItems() === 0) {
        alert("لا يوجد أي منتج في الطلب.");
        return;
    }

    if (hasUnpricedItems()) {
        alert("لا يمكن تأكيد الطلب قبل تحديد سعر جميع المنتجات.");
        return;
    }

    renderSummary();
    updateFinalTotals();
    showPage("confirm");
});

backToSummaryBtn.addEventListener("click", () => {
    renderSummary();
    showPage("summary");
});

/* =========================================
   ORDER SUBMISSION — RENDER SERVER
========================================= */

const API_URL = "https://madrazo-family.onrender.com";

orderForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (getTotalItems() === 0) {
        alert("اختر المنتجات أولًا.");
        showPage("products");
        return;
    }

    if (hasUnpricedItems()) {
        alert("يوجد منتج لم يتم تحديد سعره.");
        return;
    }

    const gangName = document.getElementById("gangName").value.trim();
    const radioNumber = document.getElementById("radioNumber").value.trim();
    const deliveryLocation = document.getElementById("deliveryLocation").value.trim();

    if (!gangName) {
        alert("اكتب اسم العصابة أو المافيا.");
        return;
    }

    const order = {
        gangName,
        radioNumber,
        deliveryLocation,
        products: getOrderDetails(),
        total: getSubtotal()
    };

    submitOrderBtn.disabled = true;
    submitOrderBtn.textContent = "جارٍ إرسال الطلب...";
    orderMessage.textContent = "";
    orderMessage.className = "order-message";

    try {
        const response = await fetch(`${API_URL}/api/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(order)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.message || "تعذر إرسال الطلب.");
        }

        orderMessage.textContent = "تم إرسال الطلب بنجاح!";
        orderMessage.classList.add("success");

        submitOrderBtn.textContent = "تم إرسال الطلب ✓";

        alert("تم إرسال طلبك بنجاح إلى الإدارة.");

    } catch (error) {
        console.error("Order submission failed:", error);

        orderMessage.textContent =
            "تعذر إرسال الطلب. حاول مرة أخرى.";

        orderMessage.classList.add("error");

        submitOrderBtn.disabled = false;
        submitOrderBtn.textContent = "إعادة محاولة إرسال الطلب";
    }
});