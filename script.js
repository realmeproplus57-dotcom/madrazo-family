
"use strict";

// ==========================================
// MADRAZO FAMILY STORE
// MULTI-PRODUCT ORDER SYSTEM
// ==========================================

// PRODUCTS
const PRODUCTS = Object.freeze({
    cocaine: {
        name: "Cocaine",
        price: 750
    },
    weed: {
        name: "Weed",
        price: 750
    }
});

// SETTINGS
const DELIVERY_FEE = 650;
const MAX_QUANTITY = 1000;
const TOTAL_STEPS = 4;

// STATE
const quantities = {
    cocaine: 0,
    weed: 0
};

let currentStep = 1;
let pendingOrder = null;
let isSending = false;

const $ = (id) => document.getElementById(id);

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    initializeYear();
    initializeStoreNavigation();
    initializeProductButtons();
    initializeOrderForm();
    initializeStepNavigation();
    initializeModal();
    initializeMusic();

    updateCart();
    showStep(1);

    console.log("MADRAZO FAMILY STORE initialized.");
});

// ==========================================
// YEAR
// ==========================================

function initializeYear() {
    const year = $("year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }
}

// ==========================================
// STORE NAVIGATION
// ==========================================

function initializeStoreNavigation() {
    $("enterBtn")?.addEventListener("click", () => {
        $("landing")?.classList.add("hidden");
        $("store")?.classList.remove("hidden");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    $("homeBtn")?.addEventListener("click", (event) => {
        event.preventDefault();

        if (isSending) return;

        $("store")?.classList.add("hidden");
        $("landing")?.classList.remove("hidden");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
}

// ==========================================
// MUSIC
// ==========================================

function initializeMusic() {
    const music = $("bgMusic");
    const toggle = $("musicToggle");

    if (!music || !toggle) return;

    music.volume = 0.35;

    async function playMusic() {
        try {
            await music.play();
            toggle.textContent = "⏸ إيقاف الموسيقى";
        } catch (error) {
            toggle.textContent = "تعذر تشغيل الموسيقى";
            console.warn("Music playback failed:", error);
        }
    }

    function pauseMusic() {
        music.pause();
        toggle.textContent = "🎵 تشغيل الموسيقى";
    }

    toggle.addEventListener("click", () => {
        if (music.paused) {
            playMusic();
        } else {
            pauseMusic();
        }
    });

    $("enterBtn")?.addEventListener("click", () => {
        if (music.paused) {
            playMusic();
        }
    });
}

// ==========================================
// PRODUCT BUTTONS
// ==========================================

function initializeProductButtons() {
    document.querySelectorAll(
        "button[data-product][data-step]"
    ).forEach((button) => {
        button.addEventListener("click", () => {
            if (isSending) return;

            const product = button.dataset.product;
            const step = Number(button.dataset.step);

            if (!PRODUCTS[product]) return;
            if (!Number.isInteger(step)) return;

            quantities[product] = Math.max(
                0,
                Math.min(
                    MAX_QUANTITY,
                    quantities[product] + step
                )
            );

            updateCart();
        });
    });

    document.querySelectorAll(".choose-product").forEach((button) => {
        button.addEventListener("click", () => {
            if (isSending) return;

            const product = button.dataset.product;

            if (!PRODUCTS[product]) return;

            quantities[product] = Math.min(
                MAX_QUANTITY,
                quantities[product] + 1
            );

            updateCart();

            $("orderSection")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    });
}

// ==========================================
// CART
// ==========================================

function getCart() {
    const cocaine = quantities.cocaine;
    const weed = quantities.weed;

    const cocaineTotal = cocaine * PRODUCTS.cocaine.price;
    const weedTotal = weed * PRODUCTS.weed.price;

    return {
        cocaine,
        weed,
        cocaineTotal,
        weedTotal,
        count: cocaine + weed,
        subtotal: cocaineTotal + weedTotal
    };
}

function getDelivery() {
    const selected = document.querySelector(
        'input[name="delivery"]:checked'
    );

    return selected?.value || "";
}

function getOrderTotals() {
    const cart = getCart();
    const deliveryOption = getDelivery();

    const deliveryFee =
        deliveryOption === "delivery" ? DELIVERY_FEE : 0;

    return {
        ...cart,
        deliveryFee,
        total: cart.subtotal + deliveryFee
    };
}

function updateCart() {
    updateProductQuantity("cocaine");
    updateProductQuantity("weed");

    const cart = getCart();

    if ($("cartCocaine")) {
        $("cartCocaine").textContent =
            `${cart.cocaine} × ${money(PRODUCTS.cocaine.price)} = ${money(cart.cocaineTotal)}`;
    }

    if ($("cartWeed")) {
        $("cartWeed").textContent =
            `${cart.weed} × ${money(PRODUCTS.weed.price)} = ${money(cart.weedTotal)}`;
    }

    if ($("cartCount")) {
        $("cartCount").textContent = cart.count;
    }

    if ($("subtotal")) {
        $("subtotal").textContent = money(cart.subtotal);
    }

    updateTotals();
}

function updateProductQuantity(product) {
    const display = $("qty-" + product);

    if (display) {
        display.textContent = quantities[product];
    }
}

// ==========================================
// ORDER FORM EVENTS
// ==========================================

function initializeOrderForm() {
    document.querySelectorAll(
        'input[name="delivery"]'
    ).forEach((radio) => {
        radio.addEventListener("change", updateTotals);
    });

    $("orderForm")?.addEventListener(
        "submit",
        handleFormSubmit
    );
}

// ==========================================
// MONEY FORMAT
// ==========================================

function money(amount) {
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0
    }).format(amount) + "$";
}

// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(value) {
    const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    };

    return String(value).replace(/[&<>"']/g, (character) => {
        return entities[character];
    });
}

// ==========================================
// SUMMARY ROW
// ==========================================

function addSummaryRow(label, value, extra = "") {
    return `
        <div class="summary-row ${escapeHtml(extra)}">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
        </div>
    `;
}

// ==========================================
// CREATE ORDER
// ==========================================

function makeOrder() {
    const form = $("orderForm");

    if (!form) {
        throw new Error("نموذج الطلب غير موجود.");
    }

    const cart = getCart();

    if (cart.count < 1) {
        throw new Error("يرجى اختيار منتج واحد على الأقل.");
    }

    const formData = new FormData(form);

    const gangName = String(
        formData.get("gangName") || ""
    ).trim();

    const radio = String(
        formData.get("radio") || ""
    ).trim();

    const location = String(
        formData.get("location") || ""
    ).trim();

    if (!gangName || !radio || !location) {
        throw new Error("يرجى إكمال جميع المعلومات.");
    }

    if (
        gangName.length > 80 ||
        radio.length > 40 ||
        location.length > 160
    ) {
        throw new Error("بعض المعلومات أطول من الحد المسموح.");
    }

    const delivery = formData.get("delivery");

    if (!["delivery", "pickup"].includes(delivery)) {
        throw new Error("يرجى اختيار طريقة الاستلام.");
    }

    const totals = getOrderTotals();

    return {
        products: {
            cocaine: cart.cocaine,
            weed: cart.weed
        },
        gangName,
        radio,
        location,
        delivery,
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        total: totals.total
    };
}

// ==========================================
// UPDATE TOTALS
// ==========================================

function updateTotals() {
    const totals = getOrderTotals();

    const values = {
        "subtotal-step3": totals.subtotal,
        deliveryTotal: totals.deliveryFee,
        grandTotal: totals.total
    };

    Object.entries(values).forEach(([id, value]) => {
        const element = $(id);

        if (element) {
            element.textContent = money(value);
        }
    });

    const deliveryLabel = $("deliveryFeeLabel");

    if (deliveryLabel) {
        deliveryLabel.textContent =
            "رسوم التوصيل: " + money(DELIVERY_FEE);
    }

    if (currentStep === 4) {
        updateFinalSummary();
    }
}

// ==========================================
// STEP NAVIGATION
// ==========================================

function showStep(step) {
    currentStep = Math.max(
        1,
        Math.min(TOTAL_STEPS, Number(step))
    );

    document.querySelectorAll(".form-step").forEach((section) => {
        const sectionStep = Number(section.dataset.step);
        const active = sectionStep === currentStep;

        section.classList.toggle("active", active);
        section.setAttribute("aria-hidden", String(!active));
    });

    document.querySelectorAll(
        "[data-step-indicator]"
    ).forEach((indicator) => {
        const indicatorStep = Number(
            indicator.dataset.stepIndicator
        );

        indicator.classList.toggle(
            "active",
            indicatorStep === currentStep
        );

        indicator.classList.toggle(
            "completed",
            indicatorStep < currentStep
        );
    });

    if (currentStep === 4) {
        updateFinalSummary();
    }
}

// ==========================================
// VALIDATE STEP
// ==========================================

function validateStep(step) {
    const section = document.querySelector(
        `.form-step[data-step="${step}"]`
    );

    if (!section) return false;

    if (step === 1) {
        if (getCart().count < 1) {
            alert("يرجى اختيار منتج واحد على الأقل.");
            return false;
        }
    }

    const fields = section.querySelectorAll(
        "input:not([type='radio']), select, textarea"
    );

    for (const field of fields) {
        if (!field.checkValidity()) {
            field.reportValidity();
            field.focus();
            return false;
        }
    }

    if (step === 3 && !getDelivery()) {
        alert("يرجى اختيار طريقة الاستلام.");
        return false;
    }

    return true;
}

// ==========================================
// STEP BUTTONS
// ==========================================

function initializeStepNavigation() {
    document.querySelectorAll("[data-next]").forEach((button) => {
        button.addEventListener("click", () => {
            if (isSending) return;
            if (!validateStep(currentStep)) return;

            showStep(currentStep + 1);

            $("orderSection")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    });

    document.querySelectorAll("[data-prev]").forEach((button) => {
        button.addEventListener("click", () => {
            if (isSending) return;

            showStep(currentStep - 1);

            $("orderSection")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    });
}

// ==========================================
// BUILD SUMMARY
// ==========================================

function buildSummary(order) {
    const products = order.products;

    const deliveryText = order.delivery === "delivery"
        ? "مع التوصيل"
        : "استلام شخصي";

    let html = "";

    if (products.cocaine > 0) {
        html += addSummaryRow(
            "Cocaine",
            `${products.cocaine} × ${money(PRODUCTS.cocaine.price)} = ${money(products.cocaine * PRODUCTS.cocaine.price)}`
        );
    }

    if (products.weed > 0) {
        html += addSummaryRow(
            "Weed",
            `${products.weed} × ${money(PRODUCTS.weed.price)} = ${money(products.weed * PRODUCTS.weed.price)}`
        );
    }

    html +=
        addSummaryRow("اسم العصابة", order.gangName) +
        addSummaryRow("رقم الراديو", order.radio) +
        addSummaryRow("الموقع", order.location) +
        addSummaryRow("طريقة الاستلام", deliveryText) +
        addSummaryRow("سعر المنتجات", money(order.subtotal)) +
        addSummaryRow("التوصيل", money(order.deliveryFee)) +
        addSummaryRow(
            "المجموع النهائي",
            money(order.total),
            "total"
        );

    return html;
}

// ==========================================
// FINAL SUMMARY
// ==========================================

function updateFinalSummary() {
    const summary = $("finalSummary");

    if (!summary) return;

    try {
        const order = makeOrder();

        summary.innerHTML = buildSummary(order);

        if ($("finalTotal")) {
            $("finalTotal").textContent = money(order.total);
        }
    } catch (error) {
        summary.innerHTML = "";
    }
}

// ==========================================
// FORM SUBMIT
// ==========================================

function handleFormSubmit(event) {
    event.preventDefault();

    if (isSending || currentStep !== 4) return;

    for (let step = 1; step <= 3; step++) {
        if (!validateStep(step)) {
            showStep(step);
            return;
        }
    }

    try {
        pendingOrder = makeOrder();
        updateFinalSummary();
        openConfirmationModal();
    } catch (error) {
        alert(error.message);
    }
}

// ==========================================
// CONFIRMATION MODAL
// ==========================================

function openConfirmationModal() {
    if (!pendingOrder) return;

    const message = $("modalMessage");
    const button = $("confirmBtn");

    if ($("summary")) {
        $("summary").innerHTML = buildSummary(pendingOrder);
    }

    if (message) {
        message.textContent = "";
        message.className = "modal-message";
    }

    if (button) {
        button.disabled = false;
        button.textContent = "تأكيد وإرسال الطلب";
    }

    $("confirmModal")?.classList.remove("hidden");
}

function closeConfirmationModal() {
    if (isSending) return;

    $("confirmModal")?.classList.add("hidden");
}

function initializeModal() {
    $("closeModal")?.addEventListener(
        "click",
        closeConfirmationModal
    );

    $("confirmModal")?.addEventListener("click", (event) => {
        if (event.target === $("confirmModal")) {
            closeConfirmationModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            !$("confirmModal")?.classList.contains("hidden")
        ) {
            closeConfirmationModal();
        }
    });

    $("confirmBtn")?.addEventListener("click", sendOrder);
}

// ==========================================
// RESET ORDER
// ==========================================

function resetOrder() {
    $("orderForm")?.reset();

    quantities.cocaine = 0;
    quantities.weed = 0;

    pendingOrder = null;

    updateCart();
    showStep(1);
}

// ==========================================
// SEND ORDER TO SERVER
// ==========================================

async function sendOrder() {
    if (!pendingOrder || isSending) return;

    isSending = true;

    const button = $("confirmBtn");
    const message = $("modalMessage");

    if (button) {
        button.disabled = true;
        button.textContent = "جاري إرسال الطلب...";
    }

    if (message) {
        message.textContent = "";
        message.className = "modal-message";
    }

    try {
        const orderData = {
            products: {
                cocaine: Number(pendingOrder.products.cocaine),
                weed: Number(pendingOrder.products.weed)
            },
            gangName: pendingOrder.gangName,
            radio: pendingOrder.radio,
            location: pendingOrder.location,
            delivery: pendingOrder.delivery
        };

        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success !== true) {
            throw new Error(
                result.message || "تعذر إرسال الطلب. حاول مرة أخرى."
            );
        }

        if (message) {
            message.textContent =
                "تم إرسال طلبك بنجاح! شكراً لثقتك بـ MADRAZO FAMILY.";

            message.className = "modal-message success";
        }

        if (button) {
            button.disabled = true;
            button.textContent = "تم الإرسال ✓";
        }

        resetOrder();

        // إبقاء رسالة النجاح ظاهرة
        $("confirmModal")?.classList.remove("hidden");

    } catch (error) {
        console.error("Order sending error:", error);

        if (message) {
            message.textContent =
                error.message || "حدث خطأ أثناء إرسال الطلب.";

            message.className = "modal-message error";
        }

        if (button) {
            button.disabled = false;
            button.textContent = "إعادة المحاولة";
        }

    } finally {
        isSending = false;
    }
}
